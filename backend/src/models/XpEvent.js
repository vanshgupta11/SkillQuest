const mongoose = require('mongoose');

const xpEventSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    // Gamification breakdown for transparency
    baseXp: {
      type: Number,
      default: 10,
    },
    difficultyMultiplier: {
      type: Number,
      default: 1,
    },
    streakBonus: {
      type: Number,
      default: 1,
    },
    streakDaysAtEvent: {
      type: Number,
      default: 0,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('XpEvent', xpEventSchema);
