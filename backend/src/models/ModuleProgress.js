const mongoose = require('mongoose');

const moduleProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    moduleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Module',
      required: true,
    },
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'completed'],
      default: 'not_started',
    },
    quizScore: {
      type: Number,
      default: 0,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to ensure 1 progress record per user per module
moduleProgressSchema.index({ userId: 1, moduleId: 1 }, { unique: true });

module.exports = mongoose.model('ModuleProgress', moduleProgressSchema);
