const express = require('express');
const router = express.Router();
const User = require('../models/User');
const XpEvent = require('../models/XpEvent');
const ModuleProgress = require('../models/ModuleProgress');
const Module = require('../models/Module');
const { computeLevel } = require('../services/xpEngine');
const { protect, optionalAuth } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    User stats + level progress (auth-aware)
router.get('/stats', optionalAuth, async (req, res) => {
  try {
    const { userId } = req.query;
    const resolvedId = req.user?.id || userId;

    let user = null;
    if (resolvedId) {
      user = await User.findById(resolvedId).select('-passwordHash');
    }
    if (!user) {
      user = await User.findOne({ email: 'demo@skillforge.io' }).select('-passwordHash');
    }

    const totalXp = user?.totalXp ?? 0;

    // ── Streak: show 0 if streak is broken ──
    let streakDays = user?.streakDays ?? 0;
    if (user?.lastActiveAt) {
      const msSinceLast = Date.now() - new Date(user.lastActiveAt).getTime();
      if (msSinceLast > 48 * 60 * 60 * 1000) streakDays = 0;
    }

    const { level, progressPercent, xpForCurrentLevel, xpForNextLevel } = computeLevel(totalXp);

    // Completed modules count
    const completedModules = user ? await ModuleProgress.countDocuments({ userId: user._id, status: 'completed' }) : 0;

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
        completedModules,
        totalModules: 12,
        recentActivity,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching dashboard stats', error: err.message });
  }
});

// @route   GET /api/dashboard/leaderboard
// @desc    Top users by totalXp — supports ?period=weekly|alltime
router.get('/leaderboard', async (req, res) => {
  const { period = 'alltime', limit = 10 } = req.query;
  try {
    let leaderboard;

    if (period === 'weekly') {
      // Weekly: sum XP events from the past 7 days
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const weeklyXp = await XpEvent.aggregate([
        { $match: { createdAt: { $gte: weekAgo } } },
        { $group: { _id: '$userId', weeklyXp: { $sum: '$amount' } } },
        { $sort: { weeklyXp: -1 } },
        { $limit: parseInt(limit) },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user',
          },
        },
        { $unwind: '$user' },
        {
          $project: {
            weeklyXp: 1,
            email: '$user.email',
            fullName: '$user.fullName',
            level: '$user.level',
            currentTier: '$user.currentTier',
            streakDays: '$user.streakDays',
          },
        },
      ]);

      leaderboard = weeklyXp.map((u, i) => ({
        rank: i + 1,
        displayName: u.fullName || maskEmail(u.email),
        totalXp: u.weeklyXp,
        level: u.level || 1,
        streakDays: u.streakDays || 0,
        currentTier: u.currentTier,
      }));
    } else {
      // All-time leaderboard
      const users = await User.aggregate([
        { $match: { totalXp: { $gt: 0 } } },
        {
          $project: {
            email: 1, fullName: 1, totalXp: 1, level: 1,
            streakDays: 1, currentTier: 1,
          },
        },
        { $sort: { totalXp: -1 } },
        { $limit: parseInt(limit) },
      ]);

      leaderboard = users.map((u, i) => ({
        rank: i + 1,
        displayName: u.fullName || maskEmail(u.email),
        totalXp: u.totalXp,
        level: u.level || 1,
        streakDays: u.streakDays || 0,
        currentTier: u.currentTier,
      }));
    }

    res.json({ status: 'success', leaderboard, period });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching leaderboard', error: err.message });
  }
});

function maskEmail(email) {
  if (!email) return 'Anonymous';
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}***@${domain}`;
}

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
