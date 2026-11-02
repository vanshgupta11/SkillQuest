const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const XpEvent = require('../models/XpEvent');
const ModuleProgress = require('../models/ModuleProgress');
const { computeLevel } = require('../services/xpEngine');

/**
 * GET /api/profile/me
 * Returns full profile data including activity heatmap and stats.
 */
router.get('/me', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const levelStats = computeLevel(user.totalXp);

    // ── Activity heatmap: aggregate XP events by date (last 365 days) ─────
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const xpEvents = await XpEvent.find({
      userId,
      createdAt: { $gte: oneYearAgo },
    }).select('amount createdAt');

    // Group by date string (YYYY-MM-DD)
    const activityMap = {};
    xpEvents.forEach((ev) => {
      const dateKey = ev.createdAt.toISOString().slice(0, 10);
      if (!activityMap[dateKey]) {
        activityMap[dateKey] = { xp: 0, count: 0 };
      }
      activityMap[dateKey].xp += ev.amount;
      activityMap[dateKey].count += 1;
    });

    // Convert to array
    const activityHeatmap = Object.entries(activityMap).map(([date, data]) => ({
      date,
      xp: data.xp,
      count: data.count,
    }));

    // ── Module completion stats ────────────────────────────────────────────
    const completedModules = await ModuleProgress.countDocuments({
      userId,
      status: 'completed',
    });

    const totalEvents = await XpEvent.countDocuments({ userId });
    const totalXpAll = await XpEvent.aggregate([
      { $match: { userId: user._id } },
      { $group: { _id: null, total: { $sum: '$amount' } } },
    ]);

    // ── Best streak from XP events ─────────────────────────────────────────
    // Compute the max streak seen from sorted activity days
    const sortedDays = activityHeatmap
      .map((d) => d.date)
      .sort()
      .map((d) => new Date(d).getTime());

    let maxStreak = 0;
    let currentStreak = sortedDays.length > 0 ? 1 : 0;
    for (let i = 1; i < sortedDays.length; i++) {
      const diffDays = (sortedDays[i] - sortedDays[i - 1]) / (1000 * 60 * 60 * 24);
      if (Math.round(diffDays) === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }
    maxStreak = Math.max(maxStreak, currentStreak);

    // ── Check if streak is still active (completed something today/yesterday) ──
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    const isStreakAlive = activityMap[todayStr] || activityMap[yesterdayStr];
    const streakDays = isStreakAlive ? user.streakDays : 0;

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        currentTier: user.currentTier,
        totalXp: user.totalXp,
        level: levelStats.level,
        progressPercent: levelStats.progressPercent,
        xpForNextLevel: levelStats.xpForNextLevel,
        streakDays,
        maxStreak,
        lastActiveAt: user.lastActiveAt,
        createdAt: user.createdAt,
      },
      stats: {
        completedModules,
        totalXpEarned: totalXpAll[0]?.total || user.totalXp,
        totalActiveDays: activityHeatmap.length,
        totalEvents,
        currentStreak: streakDays,
        maxStreak,
      },
      activityHeatmap,
    });
  } catch (err) {
    console.error('[Profile] Error fetching profile:', err);
    res.status(500).json({ message: 'Error fetching profile', error: err.message });
  }
});

/**
 * PATCH /api/profile/me
 * Update user profile fields (fullName).
 */
router.patch('/me', protect, async (req, res) => {
  try {
    const { fullName } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (fullName && fullName.trim()) {
      user.fullName = fullName.trim();
      await user.save();
    }

    res.json({ message: 'Profile updated', user: { fullName: user.fullName } });
  } catch (err) {
    res.status(500).json({ message: 'Error updating profile', error: err.message });
  }
});

module.exports = router;
