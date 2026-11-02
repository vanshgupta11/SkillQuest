const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Module = require('../models/Module');
const User = require('../models/User');
const ModuleProgress = require('../models/ModuleProgress');
const { optionalAuth } = require('../middleware/auth');
const { generateDynamicModuleContentWithGemini } = require('../services/geminiService');

// @route   GET /api/course/:id
// @desc    Get detailed course/module study content. Persists first response to MongoDB so subsequent clicks never re-generate.
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, forceRefresh } = req.query;

    // Resolve user tier
    let currentTier = 'Beginner';
    let resolvedUserId = req.user?._id || req.user?.id || userId;

    if (resolvedUserId && mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      const user = await User.findById(resolvedUserId).select('currentTier');
      if (user) currentTier = user.currentTier;
    } else {
      const demoUser = await User.findOne({ email: 'demo@skillquest.io' });
      if (demoUser) {
        currentTier = demoUser.currentTier;
        resolvedUserId = demoUser._id;
      }
    }

    // Resolve module from DB if valid ObjectId
    let moduleDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      moduleDoc = await Module.findById(id);
    }

    const title = moduleDoc?.title || `Module ${id}: Data Modeling & Architecture`;
    const description = moduleDoc?.description || 'Learn core concepts, best practices, and practical implementation patterns.';
    const difficulty = moduleDoc?.difficulty || 'Intermediate';
    const isRemedial = moduleDoc?.isRemedial || false;
    const resources = moduleDoc?.resources || [
      { title: 'Official Documentation & Guides', url: 'https://developer.mozilla.org', source: 'Documentation' },
      { title: 'Designing Data Models with ObjectId References', url: 'https://mongodb.com/docs/manual/core/data-modeling-introduction', source: 'Guide' },
    ];

    let dynamicContent = null;

    // 1. Check if module content was already generated and persisted in MongoDB
    const hasSavedContent = moduleDoc && moduleDoc.isGenerated && moduleDoc.keyConcepts && moduleDoc.keyConcepts.length > 0;

    if (hasSavedContent && forceRefresh !== 'true') {
      console.log(`[Module Cache] Loading saved module content from database for: "${title}" (ID: ${id})`);
      dynamicContent = {
        title: moduleDoc.title,
        summary: moduleDoc.summary || description,
        adaptedDepth: moduleDoc.adaptedDepth || `${currentTier} Depth`,
        userTier: moduleDoc.userTier || currentTier,
        keyConcepts: moduleDoc.keyConcepts,
        bestPractices: moduleDoc.bestPractices || [],
        commonPitfalls: moduleDoc.commonPitfalls || [],
        codeExample: moduleDoc.codeExample,
        codeExplanation: moduleDoc.codeExplanation || '',
        quiz: moduleDoc.quiz || [],
      };
    } else {
      // 2. Generate detailed content for the first time
      console.log(`[Module Generator] Generating detailed module content for first time: "${title}" (Tier: ${currentTier})`);
      dynamicContent = await generateDynamicModuleContentWithGemini(title, description, difficulty, currentTier);

      // 3. Persist generated response to MongoDB so subsequent clicks never re-generate
      if (moduleDoc) {
        moduleDoc.isGenerated = true;
        moduleDoc.summary = dynamicContent.summary || description;
        moduleDoc.adaptedDepth = dynamicContent.adaptedDepth || `${currentTier} Architecture`;
        moduleDoc.userTier = currentTier;
        moduleDoc.keyConcepts = dynamicContent.keyConcepts || [];
        moduleDoc.bestPractices = dynamicContent.bestPractices || [];
        moduleDoc.commonPitfalls = dynamicContent.commonPitfalls || [];
        moduleDoc.codeExample = dynamicContent.codeExample || '';
        moduleDoc.codeExplanation = dynamicContent.codeExplanation || '';
        moduleDoc.quiz = dynamicContent.quiz || [];
        await moduleDoc.save();
        console.log(`[Module DB] Successfully saved generated module content to database for: "${title}"`);
      }
    }

    // Fetch user progress for this module if available
    let progress = null;
    if (resolvedUserId && moduleDoc) {
      progress = await ModuleProgress.findOne({ userId: resolvedUserId, moduleId: moduleDoc._id });
    }

    res.json({
      status: 'success',
      course: {
        _id: id,
        roadmapId: moduleDoc?.roadmapId || null,
        title,
        description,
        difficulty,
        isRemedial,
        resources,
        userTier: dynamicContent.userTier || currentTier,
        isCompleted: progress?.status === 'completed',
        // Detailed Study Guide & Persisted Content
        summary: dynamicContent.summary,
        adaptedDepth: dynamicContent.adaptedDepth,
        keyConcepts: dynamicContent.keyConcepts,
        bestPractices: dynamicContent.bestPractices,
        commonPitfalls: dynamicContent.commonPitfalls,
        codeExample: dynamicContent.codeExample,
        codeExplanation: dynamicContent.codeExplanation,
        quiz: dynamicContent.quiz,
      },
    });
  } catch (err) {
    console.error('Error fetching course detail:', err);
    res.status(500).json({ message: 'Error loading dynamic module content', error: err.message });
  }
});

// @route   POST /api/course/:id/progress
// @desc    Update progress for module
router.post('/:id/progress', async (req, res) => {
  const { id } = req.params;
  const { status, quizScore } = req.body;

  res.json({
    message: `Progress updated for module ${id}`,
    moduleId: id,
    status: status || 'completed',
    quizScore: quizScore || 100,
    updatedAt: new Date().toISOString(),
  });
});

/**
 * GET /api/course/:id/quiz
 * Generate or retrieve a full AI quiz for a module (10 questions).
 * Checks the module's stored quiz first, then generates via Gemini if needed.
 */
const { generateQuizWithGemini } = require('../services/geminiService');

router.get('/:id/quiz', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { count = 10, forceNew = 'false' } = req.query;

    // Resolve user tier for adaptive difficulty
    let userTier = 'Beginner';
    if (req.user?.id) {
      const user = await User.findById(req.user.id).select('currentTier');
      if (user) userTier = user.currentTier;
    }

    // Get module details
    let moduleDoc = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      moduleDoc = await Module.findById(id).select('title description difficulty quiz isGenerated');
    }

    const title = moduleDoc?.title || `Module ${id}`;
    const description = moduleDoc?.description || 'Core technical concepts and best practices.';
    const difficulty = moduleDoc?.difficulty || 'Beginner';

    // Return stored quiz if it has enough questions and forceNew is not requested
    if (
      forceNew !== 'true' &&
      moduleDoc?.quiz &&
      moduleDoc.quiz.length >= 4
    ) {
      console.log(`[Quiz] Serving stored quiz for module: "${title}" (${moduleDoc.quiz.length} questions)`);
      return res.json({
        quiz: moduleDoc.quiz,
        moduleTitle: title,
        difficulty,
        userTier,
        source: 'database',
        questionCount: moduleDoc.quiz.length,
      });
    }

    // Generate new quiz via Gemini
    console.log(`[Quiz] Generating AI quiz for: "${title}" (${difficulty}, ${userTier} tier)`);
    const questions = await generateQuizWithGemini(
      title,
      description,
      difficulty,
      userTier,
      parseInt(count)
    );

    // Persist generated quiz to the module document if it exists
    if (moduleDoc && questions.length > 4) {
      moduleDoc.quiz = questions;
      await moduleDoc.save();
      console.log(`[Quiz] Saved ${questions.length} questions to module: "${title}"`);
    }

    res.json({
      quiz: questions,
      moduleTitle: title,
      difficulty,
      userTier,
      source: 'generated',
      questionCount: questions.length,
    });
  } catch (err) {
    console.error('[Quiz] Error generating quiz:', err);
    res.status(500).json({ message: 'Error generating quiz', error: err.message });
  }
});

module.exports = router;

