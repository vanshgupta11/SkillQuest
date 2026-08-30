const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const User = require('../models/User');
const Module = require('../models/Module');
const ModuleProgress = require('../models/ModuleProgress');
const XpEvent = require('../models/XpEvent');
const { computeStreak, computeModuleXp, computeLevel } = require('../services/xpEngine');

/**
 * POST /api/progress/complete
 *
 * Body: { userId, moduleId, quizScore? }
 *
 * Full gamification pipeline:
 *   1. Look up Module for difficulty
 *   2. Compute streak (update lastActiveAt)
 *   3. Compute XP = baseXp * difficultyMultiplier * streakBonus
 *   4. Update ModuleProgress → completed
 *   5. Update User.totalXp, User.level, User.streakDays, User.lastActiveAt
 *   6. Create XpEvent with full breakdown
 *   7. Return xpGained, newTotalXp, newLevel, streakDays, breakdown
 */
const { optionalAuth } = require('../middleware/auth');

router.post('/complete', optionalAuth, async (req, res) => {
  try {
    const { userId, moduleId, quizScore = 100, _nowOverride } = req.body;
    let resolvedUserId = userId || (req.user ? req.user.id : null);

    if (!moduleId) {
      return res.status(400).json({ message: 'moduleId is required' });
    }

    // ── Resolve user ──────────────────────────────────────
    let user;

    if (resolvedUserId && mongoose.Types.ObjectId.isValid(resolvedUserId)) {
      user = await User.findById(resolvedUserId);
    }

    if (!user) {
      // Find or create demo user for unauthenticated requests
      user = await User.findOneAndUpdate(
        { email: 'demo@skillforge.io' },
        {
          $setOnInsert: {
            email: 'demo@skillforge.io',
            passwordHash: 'demo_hashed_pw',
            currentTier: 'Intermediate',
            totalXp: 0,
            level: 1,
            streakDays: 0,
            lastActiveAt: null,
          },
        },
        { upsert: true, new: true }
      );
      resolvedUserId = user._id;
    }

    // ── Resolve module (for difficulty) ───────────────────
    let difficulty = 'Beginner';
    let moduleTitle = `Module ${moduleId}`;

    // Resolve a valid ObjectId for this moduleId (either real or stable test ID)
    let resolvedModuleId;
    if (mongoose.Types.ObjectId.isValid(moduleId)) {
      resolvedModuleId = new mongoose.Types.ObjectId(moduleId);
    } else {
      // Build a stable 24-char hex string from the module string ID
      const hexPart = String(moduleId).replace(/[^a-f0-9]/gi, '').toLowerCase();
      const padded = (hexPart + '000000000000000000000000').slice(0, 24);
      // Ensure exactly 24 chars (padded may be short if hexPart was empty)
      const safe = padded.padEnd(24, '0').slice(0, 24);
      resolvedModuleId = new mongoose.Types.ObjectId(safe);
    }

    if (mongoose.Types.ObjectId.isValid(moduleId)) {
      const moduleDoc = await Module.findById(moduleId).select('difficulty title');
      if (moduleDoc) {
        difficulty = moduleDoc.difficulty;
        moduleTitle = moduleDoc.title;
      }
    }

    // Check if already completed — idempotent
    let progressDoc = await ModuleProgress.findOne({
      userId: resolvedUserId,
      moduleId: resolvedModuleId,
    });

    if (progressDoc?.status === 'completed') {
      // Return current state without re-awarding XP
      const { level, progressPercent, xpForNextLevel } = computeLevel(user.totalXp);
      return res.json({
        alreadyCompleted: true,
        message: 'Module already marked completed. XP was not re-awarded.',
        user: {
          totalXp: user.totalXp,
          level,
          streakDays: user.streakDays,
          progressPercent,
          xpForNextLevel,
        },
      });
    }

    // ── Streak computation ────────────────────────────────
    // Accept _nowOverride for deterministic testing (Date ISO string)
    const nowOverride = _nowOverride ? new Date(_nowOverride) : undefined;
    const { newStreak, lastActiveAt: newLastActiveAt } = computeStreak(
      user.streakDays,
      user.lastActiveAt,
      nowOverride
    );

    // ── XP computation ────────────────────────────────────
    const { xpGained, baseXp, difficultyMultiplier, streakBonus } = computeModuleXp(difficulty, newStreak);

    // ── Update ModuleProgress ─────────────────────────────
    const completedAt = nowOverride || new Date();
    await ModuleProgress.findOneAndUpdate(
      { userId: resolvedUserId, moduleId: resolvedModuleId },
      {
        status: 'completed',
        quizScore,
        completedAt,
      },
      { upsert: true, new: true }
    );

    // ── Update User ───────────────────────────────────────
    const newTotalXp = (user.totalXp || 0) + xpGained;
    const { level: newLevel, progressPercent, xpForNextLevel } = computeLevel(newTotalXp);

    user.totalXp = newTotalXp;
    user.level = newLevel;
    user.streakDays = newStreak;
    user.lastActiveAt = newLastActiveAt;
    await user.save();

    // ── Create XpEvent ────────────────────────────────────
    await XpEvent.create({
      userId: resolvedUserId,
      moduleId: resolvedModuleId,
      amount: xpGained,
      reason: `Completed module: ${moduleTitle} (${difficulty})`,
      baseXp,
      difficultyMultiplier,
      streakBonus,
      streakDaysAtEvent: newStreak,
    });

    // ── Feedback Loop: Quiz Performance & Adaptive Roadmap Adjustment ──
    const Roadmap = require('../models/Roadmap');
    const { generateRemedialModuleWithGemini } = require('../services/geminiService');

    let feedback = {
      nextModuleUpgraded: false,
      remedialCreated: false,
      tierUpgraded: false,
      tierDowngraded: false,
      newTier: user.currentTier,
    };

    const currentModuleDoc = await Module.findById(resolvedModuleId);
    if (currentModuleDoc && currentModuleDoc.roadmapId) {
      const roadmap = await Roadmap.findById(currentModuleDoc.roadmapId);
      if (roadmap && roadmap.modules?.length > 0) {
        const modIndex = roadmap.modules.findIndex((mId) => mId.toString() === resolvedModuleId.toString());

        if (quizScore >= 80) {
          // Score >= 80%: Upgrade difficulty of next module in roadmap
          if (modIndex >= 0 && modIndex < roadmap.modules.length - 1) {
            const nextModId = roadmap.modules[modIndex + 1];
            const nextMod = await Module.findById(nextModId);
            if (nextMod) {
              const oldDiff = nextMod.difficulty;
              let newDiff = oldDiff;
              if (oldDiff === 'Beginner') newDiff = 'Intermediate';
              else if (oldDiff === 'Intermediate') newDiff = 'Advanced';

              if (newDiff !== oldDiff) {
                nextMod.difficulty = newDiff;
                await nextMod.save();
                feedback.nextModuleUpgraded = true;
                feedback.nextModuleTitle = nextMod.title;
                feedback.oldNextDifficulty = oldDiff;
                feedback.newNextDifficulty = newDiff;
              }
            }
          }
        } else if (quizScore < 50) {
          // Score < 50%: Generate remedial module & insert into sequence
          const remedialData = await generateRemedialModuleWithGemini(
            currentModuleDoc.title,
            currentModuleDoc.description
          );

          const remedialModule = await Module.create({
            roadmapId: roadmap._id,
            title: remedialData.title,
            description: remedialData.description,
            difficulty: 'Beginner',
            estimatedHours: remedialData.estimatedHours || 2,
            isRemedial: true,
            resources: [
              {
                title: `Search: ${remedialData.title} — MDN Docs`,
                url: `https://developer.mozilla.org/en-US/search?q=${encodeURIComponent(remedialData.title)}`,
                source: 'Documentation',
              },
            ],
          });

          const insertPos = modIndex >= 0 ? modIndex + 1 : roadmap.modules.length;
          roadmap.modules.splice(insertPos, 0, remedialModule._id);
          await roadmap.save();

          await ModuleProgress.create({
            userId: resolvedUserId,
            moduleId: remedialModule._id,
            status: 'not_started',
          });

          feedback.remedialCreated = true;
          feedback.remedialTitle = remedialModule.title;
          feedback.remedialModuleId = remedialModule._id;
        }
      }
    }

    // ── Check 3 Consecutive Modules for User Tier Upgrade/Downgrade ──
    const lastCompleted = await ModuleProgress.find({
      userId: resolvedUserId,
      status: 'completed',
    })
      .sort({ completedAt: -1 })
      .limit(3);

    if (lastCompleted.length >= 3) {
      const scores = lastCompleted.map((p) => p.quizScore);
      const allHigh = scores.every((s) => s >= 80);
      const allLow = scores.every((s) => s < 50);

      const oldTier = user.currentTier;
      if (allHigh) {
        let newTier = oldTier;
        if (oldTier === 'Beginner') newTier = 'Intermediate';
        else if (oldTier === 'Intermediate') newTier = 'Advanced';

        if (newTier !== oldTier) {
          user.currentTier = newTier;
          await user.save();
          feedback.tierUpgraded = true;
          feedback.oldTier = oldTier;
          feedback.newTier = newTier;
        }
      } else if (allLow) {
        let newTier = oldTier;
        if (oldTier === 'Advanced') newTier = 'Intermediate';
        else if (oldTier === 'Intermediate') newTier = 'Beginner';

        if (newTier !== oldTier) {
          user.currentTier = newTier;
          await user.save();
          feedback.tierDowngraded = true;
          feedback.oldTier = oldTier;
          feedback.newTier = newTier;
        }
      }
    }

    console.log(
      `[XP] User ${resolvedUserId}: +${xpGained} XP | Module: ${moduleTitle} | ` +
        `Difficulty: ${difficulty} (${difficultyMultiplier}x) | Streak: ${newStreak} days (${streakBonus}x) | ` +
        `Total: ${newTotalXp} XP | Level: ${newLevel}`
    );

    res.json({
      message: 'Module completed successfully',
      xpGained,
      breakdown: {
        baseXp,
        difficultyMultiplier,
        streakBonus: +streakBonus.toFixed(2),
        formula: `${baseXp} × ${difficultyMultiplier} × ${streakBonus.toFixed(2)} = ${xpGained} XP`,
      },
      streak: {
        streakDays: newStreak,
        lastActiveAt: newLastActiveAt,
      },
      user: {
        totalXp: newTotalXp,
        level: newLevel,
        progressPercent,
        xpForNextLevel,
        streakDays: newStreak,
        currentTier: user.currentTier,
      },
      feedback,
    });
  } catch (err) {
    console.error('[Progress] Error completing module:', err);
    res.status(500).json({ message: 'Error processing module completion', error: err.message });
  }
});

/**
 * GET /api/progress/streak-test
 *
 * Debug/test endpoint to simulate streak across multiple days.
 * Accepts query params: userId, simulatedDays (default 3)
 */
router.get('/streak-test', async (req, res) => {
  const { computeStreak, computeStreakBonus } = require('../services/xpEngine');

  const results = [];
  let currentStreak = 0;
  let lastActiveAt = null;

  // Simulate Day 0 (today)
  const day0 = new Date('2026-08-31T10:00:00Z');
  let r0 = computeStreak(currentStreak, lastActiveAt, day0);
  results.push({ day: 0, ...r0, streakBonus: computeStreakBonus(r0.newStreak).toFixed(2) });
  currentStreak = r0.newStreak;
  lastActiveAt = r0.lastActiveAt;

  // Simulate Day 1 (24h later — consecutive)
  const day1 = new Date(day0.getTime() + 25 * 60 * 60 * 1000); // 25h later
  let r1 = computeStreak(currentStreak, lastActiveAt, day1);
  results.push({ day: 1, ...r1, streakBonus: computeStreakBonus(r1.newStreak).toFixed(2) });
  currentStreak = r1.newStreak;
  lastActiveAt = r1.lastActiveAt;

  // Simulate Day 2 (25h after day1 — consecutive)
  const day2 = new Date(day1.getTime() + 25 * 60 * 60 * 1000);
  let r2 = computeStreak(currentStreak, lastActiveAt, day2);
  results.push({ day: 2, ...r2, streakBonus: computeStreakBonus(r2.newStreak).toFixed(2) });
  currentStreak = r2.newStreak;
  lastActiveAt = r2.lastActiveAt;

  // Simulate Day 5 (72h gap — reset expected)
  const day5 = new Date(day2.getTime() + 72 * 60 * 60 * 1000); // 72h gap → reset
  let r5 = computeStreak(currentStreak, lastActiveAt, day5);
  results.push({ day: '5 (gap>48h, reset)', ...r5, streakBonus: computeStreakBonus(r5.newStreak).toFixed(2) });

  res.json({
    description: 'Simulated streak across 3 consecutive days + 1 reset after 72h gap',
    results,
  });
});

module.exports = router;
