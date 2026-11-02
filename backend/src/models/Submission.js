const mongoose = require('mongoose');

// ── Peer Review Submission ────────────────────────────────────────────────────
const reviewSchema = new mongoose.Schema({
  reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerName: { type: String, default: 'Anonymous' },
  rating: { type: Number, min: 1, max: 5, required: true },
  feedback: { type: String, required: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
}, { _id: true });

const submissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  moduleId: { type: String, default: '' },
  moduleTitle: { type: String, default: 'General Project' },
  authorName: { type: String, default: 'Anonymous' },
  projectTitle: { type: String, required: true, maxlength: 120 },
  projectDescription: { type: String, required: true, maxlength: 2000 },
  projectUrl: { type: String, default: '' }, // GitHub / live URL
  screenshotUrl: { type: String, default: '' },
  techStack: [{ type: String }],
  upvotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  upvoteCount: { type: Number, default: 0 },
  reviews: [reviewSchema],
  avgRating: { type: Number, default: 0 },
}, { timestamps: true });

// Auto-compute avgRating before save
submissionSchema.pre('save', function (next) {
  if (this.reviews && this.reviews.length > 0) {
    const total = this.reviews.reduce((sum, r) => sum + r.rating, 0);
    this.avgRating = Math.round((total / this.reviews.length) * 10) / 10;
  }
  this.upvoteCount = this.upvotes?.length || 0;
  next();
});

module.exports = mongoose.model('Submission', submissionSchema);
