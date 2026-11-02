const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    url: { type: String, required: true },
    source: { type: String, required: true },
  },
  { _id: false }
);

const keyConceptSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true },
    explanation: { type: String, required: true },
    subpoints: [{ type: String }],
    practicalTakeaway: { type: String },
  },
  { _id: false }
);

const quizQuestionSchema = new mongoose.Schema(
  {
    id: { type: Number },
    question: { type: String, required: true },
    options: [{ type: String }],
    answer: { type: String, required: true },
    explanation: { type: String },
  },
  { _id: false }
);

const moduleSchema = new mongoose.Schema(
  {
    roadmapId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Roadmap',
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    difficulty: {
      type: String,
      enum: ['Beginner', 'Intermediate', 'Advanced'],
      default: 'Beginner',
    },
    resources: [resourceSchema],
    estimatedHours: {
      type: Number,
      default: 3,
    },
    isRemedial: {
      type: Boolean,
      default: false,
    },

    // Detailed Module Content (Persisted on first generation)
    isGenerated: {
      type: Boolean,
      default: false,
    },
    summary: {
      type: String,
    },
    adaptedDepth: {
      type: String,
    },
    userTier: {
      type: String,
    },
    keyConcepts: [keyConceptSchema],
    detailedContent: {
      type: String,
    },
    codeExample: {
      type: String,
    },
    codeExplanation: {
      type: String,
    },
    bestPractices: [{ type: String }],
    commonPitfalls: [{ type: String }],
    quiz: [quizQuestionSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Module', moduleSchema);
