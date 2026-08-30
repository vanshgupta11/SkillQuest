/**
 * xpEngine.js — Core gamification engine for SkillQuest
 *
 * XP Formula:
 *   xpGained = baseXp * difficultyMultiplier * streakBonus
 *
 *   baseXp: 10 (per module completion)
 *   difficultyMultiplier: Beginner=1, Intermediate=1.5, Advanced=2
 *   streakBonus: 1 + (0.1 * streakDays), capped at 1.5
 *
 * Streak rules (Calendar Day based):
 *   - Same calendar day: Maintain current streak (already active today)
 *   - Yesterday (1 calendar day ago): Increment streak by +1
 *   - 2+ calendar days ago or first time: Reset streak to 1
 */

const DIFFICULTY_MULTIPLIERS = {
  Beginner: 1,
  Intermediate: 1.5,
  Advanced: 2,
};

const BASE_XP = 10;
const STREAK_BONUS_PER_DAY = 0.1;
const STREAK_BONUS_CAP = 1.5;

function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isYesterday(d1, d2) {
  const yesterday = new Date(d2);
  yesterday.setDate(yesterday.getDate() - 1);
  return isSameDay(d1, yesterday);
}

/**
 * Calculate updated streak given the user's lastActiveAt and reference date.
 *
 * @param {number} currentStreak - User's current streakDays value
 * @param {Date|null} lastActiveAt - User's last recorded activity timestamp
 * @param {Date} [nowOverride] - Optional Date override (for testing)
 * @returns {{ newStreak: number, lastActiveAt: Date, isActiveToday: boolean }}
 */
function computeStreak(currentStreak, lastActiveAt, nowOverride) {
  const now = nowOverride instanceof Date ? nowOverride : new Date();

  if (!lastActiveAt) {
    // First ever module completion
    return { newStreak: 1, lastActiveAt: now, isActiveToday: true };
  }

  const lastDate = new Date(lastActiveAt);

  if (isSameDay(lastDate, now)) {
    // Already completed a module today — maintain active streak
    return {
      newStreak: Math.max(1, currentStreak || 1),
      lastActiveAt: now,
      isActiveToday: true,
    };
  }

  if (isYesterday(lastDate, now)) {
    // Completed a module yesterday — consecutive day increment!
    return {
      newStreak: (currentStreak || 0) + 1,
      lastActiveAt: now,
      isActiveToday: true,
    };
  }

  // Gap >= 2 calendar days — reset streak to 1
  return {
    newStreak: 1,
    lastActiveAt: now,
    isActiveToday: true,
  };
}

/**
 * Calculate streak bonus multiplier.
 * streakBonus = min(1 + 0.1 * streakDays, 1.5)
 */
function computeStreakBonus(streakDays) {
  return Math.min(1 + STREAK_BONUS_PER_DAY * streakDays, STREAK_BONUS_CAP);
}

/**
 * Calculate XP to award for completing a module.
 */
function computeModuleXp(difficulty, streakDays) {
  const difficultyMultiplier = DIFFICULTY_MULTIPLIERS[difficulty] ?? 1;
  const streakBonus = computeStreakBonus(streakDays);
  const xpGained = Math.round(BASE_XP * difficultyMultiplier * streakBonus);

  return { xpGained, baseXp: BASE_XP, difficultyMultiplier, streakBonus };
}

/**
 * Compute player level and progress to next level from totalXp.
 * level = floor(sqrt(totalXp / 100)) + 1
 */
function computeLevel(totalXp) {
  const xp = Math.max(0, totalXp);
  const level = Math.floor(Math.sqrt(xp / 100)) + 1;

  const xpForCurrentLevel = Math.pow(level - 1, 2) * 100;
  const xpForNextLevel = Math.pow(level, 2) * 100;
  const progressInLevel = xp - xpForCurrentLevel;
  const levelWidth = xpForNextLevel - xpForCurrentLevel;
  const progressPercent =
    levelWidth > 0 ? Math.min(100, Math.round((progressInLevel / levelWidth) * 100)) : 100;

  return { level, xpForCurrentLevel, xpForNextLevel, progressPercent };
}

module.exports = {
  computeStreak,
  computeStreakBonus,
  computeModuleXp,
  computeLevel,
  DIFFICULTY_MULTIPLIERS,
  BASE_XP,
};
