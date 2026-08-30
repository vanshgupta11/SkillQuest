const mongoose = require('mongoose');

const assessmentResultSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    domain: {
      type: String,
      required: true,
      trim: true,
    },
    tier: {
      type: String,
      required: true,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
    },
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AssessmentResult', assessmentResultSchema);
