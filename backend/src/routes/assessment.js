const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');

const AssessmentResult = require('../models/AssessmentResult');
const User = require('../models/User');
const XpEvent = require('../models/XpEvent');

const DOMAINS = [
  { id: 'webdev', name: 'Full-Stack Web Development', description: 'React, Express, MongoDB, REST APIs, & web protocols' },
  { id: 'python', name: 'Python Core & Systems', description: 'Data structures, OOP, memory management, & async' },
  { id: 'dsa', name: 'Data Structures & Algorithms', description: 'Arrays, Trees, Graphs, Sorting, & Dynamic Programming' },
  { id: 'ml', name: 'Machine Learning & AI', description: 'Supervised/Unsupervised models, Neural networks, & Math' },
];

// @route   GET /api/assessment/domains
// @desc    Get available assessment domains
router.get('/domains', (req, res) => {
  res.json({ status: 'success', domains: DOMAINS });
});

// @route   GET /api/assessment/questions
// @desc    Get full question bank for chosen domain from JSON fixtures
router.get('/questions', (req, res) => {
  const domain = req.query.domain || 'webdev';
  const filePath = path.join(__dirname, '../../data/questions', `${domain}.json`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: `Question bank for domain '${domain}' not found.` });
  }

  try {
    const rawData = fs.readFileSync(filePath, 'utf8');
    const questions = JSON.parse(rawData);
    res.json({
      status: 'success',
      domain,
      totalCount: questions.length,
      questions,
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to read question bank', error: error.message });
  }
});

const { optionalAuth } = require('../middleware/auth');

// @route   POST /api/assessment/submit
// @desc    Process assessment submission, calculate tier, save result & update User
router.post('/submit', optionalAuth, async (req, res) => {
  try {
    const { userId, domain = 'Full-Stack Web Development', score, answers = [] } = req.body;
    let targetUserId = userId || (req.user ? req.user.id : null);

    // Calculate final score percentage if not passed directly
    let totalScore = score;
    if (totalScore === undefined || totalScore === null) {
      if (answers.length > 0) {
        const correctCount = answers.filter((a) => a.isCorrect).length;
        totalScore = Math.round((correctCount / answers.length) * 100);
      } else {
        totalScore = 50;
      }
    }

    // Determine Tier based on score percentage
    let tier = 'Beginner';
    let explanation = '';

    if (totalScore >= 75) {
      tier = 'Advanced';
      explanation = `Excellent performance (${totalScore}%)! You demonstrated strong mastery of complex logical pattern reasoning and advanced ${domain} fundamentals.`;
    } else if (totalScore >= 45) {
      tier = 'Intermediate';
      explanation = `Solid understanding (${totalScore}%)! You showed good grasp of key concepts, with room to sharpen advanced architectural patterns in ${domain}.`;
    } else {
      tier = 'Beginner';
      explanation = `Foundational tier (${totalScore}%). SkillForge has benchmarked your current level to build a tailored step-by-step introduction to ${domain}.`;
    }

    let savedResult = null;
    let updatedUser = null;

    if (!targetUserId) {
      // Find or create default demo user
      let demoUser = await User.findOne({ email: 'demo@skillquest.io' });
      if (!demoUser) {
        demoUser = await User.create({
          fullName: 'Demo User',
          email: 'demo@skillquest.io',
          passwordHash: 'hashed_demo_pw_2026',
          currentTier: tier,
        });
      } else {
        demoUser.currentTier = tier;
        await demoUser.save();
      }
      targetUserId = demoUser._id;
      updatedUser = demoUser;
    } else {
      updatedUser = await User.findByIdAndUpdate(
        targetUserId,
        { currentTier: tier },
        { new: true }
      );
    }

    if (targetUserId) {
      savedResult = await AssessmentResult.create({
        userId: targetUserId,
        domain,
        tier,
        score: totalScore,
      });

      // Award XP event
      await XpEvent.create({
        userId: targetUserId,
        amount: 300,
        reason: `Completed proficiency assessment in ${domain} (${tier} tier)`,
      });
    }

    res.json({
      message: 'Assessment score calculated and saved successfully',
      result: savedResult || {
        userId: targetUserId,
        domain,
        tier,
        score: totalScore,
        createdAt: new Date(),
      },
      tier,
      score: totalScore,
      explanation,
      user: updatedUser,
    });
  } catch (error) {
    console.error('Error submitting assessment:', error);
    res.status(500).json({ message: 'Error submitting assessment', error: error.message });
  }
});

// @route   GET /api/assessment/debug-results
// @desc    Debug endpoint to inspect saved AssessmentResult & User records
router.get('/debug-results', async (req, res) => {
  try {
    const results = await AssessmentResult.find().populate('userId', 'email currentTier').sort({ createdAt: -1 });
    const users = await User.find().select('-passwordHash');
    const xpEvents = await XpEvent.find().sort({ createdAt: -1 });

    res.json({
      count: results.length,
      assessmentResults: results,
      users,
      xpEvents,
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching debug results', error: error.message });
  }
});

module.exports = router;
