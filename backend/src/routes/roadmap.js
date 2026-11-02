const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Roadmap = require('../models/Roadmap');
const Module = require('../models/Module');
const ModuleProgress = require('../models/ModuleProgress');
const User = require('../models/User');
const XpEvent = require('../models/XpEvent');
const { generateRoadmapWithGemini } = require('../services/geminiService');
const { fetchVideosForModules } = require('../services/youtubeService');
const { optionalAuth } = require('../middleware/auth');
const { roadmapGenerateRequestSchema } = require('../utils/schemas');

/**
 * POST /api/roadmap/generate
 * Full pipeline:
 *   1. Read User.currentTier
 *   2. Call Gemini Phase 1 — generate module structure + search queries
 *   3. Call YouTube API per module — fetch 2-3 real video results
 *   4. Call Gemini Phase 2 — select best video per module from real results
 *   5. Save Roadmap + Module documents with Mongoose ObjectId refs
 *   6. Create ModuleProgress records (status: not_started) per module
 *   7. Return structured roadmap with real resource links
 */
router.post('/generate', optionalAuth, async (req, res) => {
  try {
    const parsed = roadmapGenerateRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: parsed.error.errors.map((e) => e.message).join(', '),
      });
    }

    const { goal } = parsed.data;
    const { userId } = req.body;


    // Resolve user ID & tier from auth token or fallback
    let currentTier = 'Beginner';
    let resolvedUserId = req.user?._id || req.user?.id || userId;

    if (resolvedUserId && mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      const user = await User.findById(resolvedUserId).select('currentTier');
      if (user) {
        currentTier = user.currentTier;
      }
    } else {
      // Find or create fallback demo user for guest/unauthenticated calls
      let demoUser = await User.findOne({ email: 'demo@skillquest.io' });
      if (!demoUser) {
        demoUser = await User.create({
          fullName: 'Demo User',
          email: 'demo@skillquest.io',
          passwordHash: 'hashed_demo_pw_2026',
          currentTier: 'Beginner',
        });
      }
      resolvedUserId = demoUser._id;
      currentTier = demoUser.currentTier;

    }

    console.log(`[Roadmap] Generating for goal: "${goal.trim()}" | Tier: ${currentTier}`);

    // === PHASE 1: Gemini → Structured modules + searchQuery per module ===
    console.log('[Roadmap] Phase 1: Calling Gemini for roadmap structure...');
    const geminiRoadmap = await generateRoadmapWithGemini(goal.trim(), currentTier);

    if (!geminiRoadmap?.modules?.length) {
      return res.status(502).json({ message: 'Gemini returned an empty or invalid roadmap structure.' });
    }

    console.log(`[Roadmap] Phase 1 complete: ${geminiRoadmap.modules.length} modules generated.`);

    // === PHASE 2: YouTube → Fetch real videos per module ===
    let videoSelections = [];
    const hasYouTubeKey = !!process.env.YOUTUBE_API_KEY;

    if (hasYouTubeKey) {
      console.log('[Roadmap] Phase 2: Fetching YouTube videos for each module...');
      const youtubeResults = await fetchVideosForModules(geminiRoadmap.modules);

      // === PHASE 3: Gemini → Select best video from real YouTube results ===
      const modulesWithVideos = youtubeResults.filter((m) => m.results.length > 0);

      if (modulesWithVideos.length > 0) {
        console.log('[Roadmap] Phase 3: Calling Gemini to select best videos...');
        try {
          videoSelections = await generateRoadmapWithGemini(goal, currentTier, modulesWithVideos);
          if (!Array.isArray(videoSelections)) videoSelections = [];
        } catch (videoSelectErr) {
          console.warn('[Roadmap] Phase 3 Gemini video selection failed, using first result fallback:', videoSelectErr.message);
          // Fallback: just use the first result for each module
          videoSelections = modulesWithVideos.map((m) => ({
            moduleOrder: m.moduleOrder,
            selectedVideo: m.results[0] || null,
          }));
        }
      }
    } else {
      console.warn('[Roadmap] YOUTUBE_API_KEY not set. Skipping video enrichment.');
    }

    // Build lookup for selected videos by moduleOrder
    const videoByOrder = {};
    videoSelections.forEach((sel) => {
      if (sel?.selectedVideo) {
        videoByOrder[sel.moduleOrder] = sel.selectedVideo;
      }
    });

    // === PHASE 4: Persist to MongoDB ===
    // Create Roadmap document first (without modules array — we'll update after)
    const roadmapDoc = await Roadmap.create({
      userId: resolvedUserId,
      goal: goal.trim(),
      modules: [],
    });

    // Create Module documents with resources from YouTube
    const moduleIds = [];
    for (const mod of geminiRoadmap.modules) {
      const selectedVideo = videoByOrder[mod.order];

      const resources = [];
      if (selectedVideo) {
        resources.push({
          title: selectedVideo.title,
          url: selectedVideo.url,
          source: 'YouTube',
        });
      }

      // Always include a curated fallback MDN/docs search link
      resources.push({
        title: `Search: ${mod.title} — MDN Docs`,
        url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(mod.title)}`,
        source: 'Documentation',
      });

      const moduleDoc = await Module.create({
        roadmapId: roadmapDoc._id,
        title: mod.title,
        description: mod.description,
        difficulty: mod.difficulty,
        estimatedHours: mod.estimatedHours || 3,
        resources,
      });

      moduleIds.push(moduleDoc._id);

      // Create ModuleProgress with status 'not_started' for each module
      if (resolvedUserId) {
        await ModuleProgress.findOneAndUpdate(
          { userId: resolvedUserId, moduleId: moduleDoc._id },
          { $setOnInsert: { userId: resolvedUserId, moduleId: moduleDoc._id, status: 'not_started' } },
          { upsert: true, new: true }
        );
      }
    }

    // Update Roadmap with array of module ObjectId refs
    roadmapDoc.modules = moduleIds;
    await roadmapDoc.save();

    // Award XP event
    if (resolvedUserId) {
      await XpEvent.create({
        userId: resolvedUserId,
        amount: 100,
        reason: `Generated learning roadmap for: ${goal.trim()}`,
      });
    }

    // Populate full roadmap for response
    const populatedRoadmap = await Roadmap.findById(roadmapDoc._id).populate('modules');

    console.log(`[Roadmap] Saved: Roadmap ${roadmapDoc._id} with ${moduleIds.length} modules.`);

    res.json({
      status: 'success',
      message: 'Roadmap generated and saved successfully.',
      roadmapId: roadmapDoc._id,
      roadmap: {
        _id: roadmapDoc._id,
        goal: roadmapDoc.goal,
        title: geminiRoadmap.title,
        summary: geminiRoadmap.summary,
        currentTier,
        modules: populatedRoadmap.modules,
      },
    });
  } catch (err) {
    console.error('[Roadmap] Generation failed:', err.message);

    // Produce clear user-facing error for missing API keys
    if (err.message.includes('GEMINI_API_KEY')) {
      return res.status(503).json({
        message: 'Gemini API key not configured. Please set GEMINI_API_KEY in your .env file.',
        setupRequired: 'GEMINI_API_KEY',
      });
    }
    if (err.message.includes('YOUTUBE_API_KEY')) {
      return res.status(503).json({
        message: 'YouTube API key not configured. Please set YOUTUBE_API_KEY in your .env file.',
        setupRequired: 'YOUTUBE_API_KEY',
      });
    }

    res.status(500).json({ message: 'Roadmap generation failed.', error: err.message });
  }
});

/**
 * GET /api/roadmap
 * Fetch most recent roadmap for a user (or demo user), with module progress
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.query;

    let resolvedUserId = userId || (req.user ? req.user.id : null);
    if (!resolvedUserId || !mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      const demoUser = await User.findOne({ email: 'demo@skillforge.io' });
      if (demoUser) resolvedUserId = demoUser._id;
    }

    const roadmap = await Roadmap.findOne(resolvedUserId ? { userId: resolvedUserId } : {})
      .sort({ createdAt: -1 })
      .populate('modules');

    if (!roadmap) {
      return res.json({ status: 'no_roadmap', roadmap: null });
    }

    // Fetch ModuleProgress for each module
    let progressMap = {};
    if (resolvedUserId) {
      const progresses = await ModuleProgress.find({
        userId: resolvedUserId,
        moduleId: { $in: roadmap.modules.map((m) => m._id) },
      });
      progresses.forEach((p) => {
        progressMap[p.moduleId.toString()] = p.status;
      });
    }

    const modulesWithProgress = roadmap.modules.map((mod, idx) => ({
      ...mod.toObject(),
      status: progressMap[mod._id.toString()] || 'not_started',
      // A module is "unlocked" if it's the first, or the previous one is completed
      isUnlocked: idx === 0 || progressMap[roadmap.modules[idx - 1]?._id?.toString()] === 'completed',
    }));

    res.json({
      status: 'success',
      roadmap: {
        _id: roadmap._id,
        goal: roadmap.goal,
        createdAt: roadmap.createdAt,
        modules: modulesWithProgress,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching roadmap', error: err.message });
  }
});

/**
 * POST /api/roadmap/debug-create
 * Debug endpoint to create a test roadmap with modules directly for test verification
 */
router.post('/debug-create', async (req, res) => {
  try {
    const demoUser = await User.findOne({ email: 'demo@skillforge.io' });
    const userId = demoUser ? demoUser._id : new mongoose.Types.ObjectId();

    const roadmapDoc = await Roadmap.create({
      userId,
      goal: req.body.goal || 'Adaptive Feedback Test Roadmap',
      modules: [],
    });

    const m1 = await Module.create({
      roadmapId: roadmapDoc._id,
      title: 'Foundations of Reactive State Architecture',
      description: 'Learn component state, custom hooks, and state trees.',
      difficulty: 'Beginner',
      estimatedHours: 3,
    });

    const m2 = await Module.create({
      roadmapId: roadmapDoc._id,
      title: 'Advanced State Management & Redux Toolkit',
      description: 'Explore normalized state, selectors, and async thunks.',
      difficulty: 'Beginner',
      estimatedHours: 4,
    });

    const m3 = await Module.create({
      roadmapId: roadmapDoc._id,
      title: 'Server-Side Rendering & Streaming Architecture',
      description: 'Master SSR, SSG, and Next.js App Router streaming.',
      difficulty: 'Intermediate',
      estimatedHours: 5,
    });

    roadmapDoc.modules = [m1._id, m2._id, m3._id];
    await roadmapDoc.save();

    await ModuleProgress.create({ userId, moduleId: m1._id, status: 'not_started' });
    await ModuleProgress.create({ userId, moduleId: m2._id, status: 'not_started' });
    await ModuleProgress.create({ userId, moduleId: m3._id, status: 'not_started' });

    const populated = await Roadmap.findById(roadmapDoc._id).populate('modules');
    res.json({ status: 'success', roadmap: populated });
  } catch (err) {
    res.status(500).json({ message: 'Error in debug-create', error: err.message });
  }
});

/**
 * GET /api/roadmap/list
 * List all roadmaps for debug/admin purposes
 */
router.get('/list', async (req, res) => {
  try {
    const roadmaps = await Roadmap.find().populate('modules').sort({ createdAt: -1 }).limit(10);
    res.json({ status: 'success', count: roadmaps.length, roadmaps });
  } catch (err) {
    res.status(500).json({ message: 'Error listing roadmaps', error: err.message });
  }
});

module.exports = router;
