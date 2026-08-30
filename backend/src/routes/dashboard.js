const express = require('express');
const router = express.Router();
const User = require('../models/User');
const XpEvent = require('../models/XpEvent');
const { computeLevel } = require('../services/xpEngine');

// @route   GET /api/dashboard/stats
// @desc    User stats + level progress
router.get('/stats', async (req, res) => {
  try {
    const { userId } = req.query;

    let user = null;
    if (userId) {
      user = await User.findById(userId).select('-passwordHash');
    }
    if (!user) {
      user = await User.findOne({ email: 'demo@skillforge.io' }).select('-passwordHash');
    }

    const totalXp = user?.totalXp ?? 0;
    const streakDays = user?.streakDays ?? 0;
    const { level, progressPercent, xpForCurrentLevel, xpForNextLevel } = computeLevel(totalXp);

    // Recent XP events
    let recentActivity = [];
    if (user) {
      const events = await XpEvent.find({ userId: user._id })
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();
      recentActivity = events.map((e) => ({
        id: e._id,
        title: e.reason,
        xp: e.amount,
        date: formatRelativeTime(e.createdAt),
        breakdown: {
          baseXp: e.baseXp,
          difficultyMultiplier: e.difficultyMultiplier,
          streakBonus: e.streakBonus,
        },
      }));
    }

    res.json({
      status: 'success',
      userStats: {
        totalXp,
        currentTier: user?.currentTier ?? 'Beginner',
        level,
        progressPercent,
        xpForCurrentLevel,
        xpForNextLevel,
        xpToNextLevel: xpForNextLevel - totalXp,
        streakDays,
        completedModules: 0,
        totalModules: 12,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: err.message });
  }
});

// @route   GET /api/dashboard/leaderboard
// @desc    Top 10 users by totalXp via MongoDB aggregation
router.get('/leaderboard', async (req, res) => {
  try {
    const leaderboard = await User.aggregate([
      { $match: { totalXp: { $gt: 0 } } },
      {
        $project: {
          email: 1,
          totalXp: 1,
          level: 1,
          streakDays: 1,
          currentTier: 1,
          // Mask email for privacy: show only first 2 chars + domain
          displayName: {
            $concat: [
              { $substr: ['$email', 0, 2] },
              '***@',
              { $arrayElemAt: [{ $split: ['$email', '@'] }, 1] },
            ],
          },
        },
      },
      { $sort: { totalXp: -1 } },
      { $limit: 10 },
    ]);

    res.json({
      status: 'success',
      leaderboard: leaderboard.map((u, i) => ({
        rank: i + 1,
        displayName: u.displayName,
        totalXp: u.totalXp,
        level: u.level || 1,
        streakDays: u.streakDays || 0,
        currentTier: u.currentTier,
      })),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: err.message });
  }
});

function formatRelativeTime(date) {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

module.exports = router;
