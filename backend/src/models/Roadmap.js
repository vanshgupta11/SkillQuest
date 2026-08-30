const mongoose = require('mongoose');

const roadmapSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    goal: {
      type: String,
      required: true,
      trim: true,
    },
    modules: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Module',
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Roadmap', roadmapSchema);
