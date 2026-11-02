const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Submission = require('../models/Submission');
const User = require('../models/User');

/**
 * POST /api/peer/submit
 * Submit a project for peer review.
 */
router.post('/submit', protect, async (req, res) => {
  try {
    const { moduleId, moduleTitle, projectTitle, projectDescription, projectUrl, techStack } = req.body;

    if (!projectTitle || !projectDescription) {
      return res.status(400).json({ message: 'projectTitle and projectDescription are required.' });
    }

    const user = await User.findById(req.user.id).select('fullName email');

    const submission = await Submission.create({
      userId: req.user.id,
      moduleId: moduleId || 'general',
      moduleTitle: moduleTitle || 'Independent Showcase',
      authorName: user?.fullName || user?.email?.split('@')[0] || 'Learner',
      projectTitle,
      projectDescription,
      projectUrl: projectUrl || '',
      techStack: Array.isArray(techStack) ? techStack.slice(0, 8) : [],
    });

    res.status(201).json({ message: 'Project submitted for peer review!', submission });
  } catch (err) {
    console.error('[Peer] Submit error:', err);
    res.status(500).json({ message: 'Error submitting project', error: err.message });
  }
});

/**
 * GET /api/peer/feed
 * Get the community peer review feed, sorted by upvotes or recent.
 */
router.get('/feed', protect, async (req, res) => {
  try {
    const { sort = 'recent', moduleId, page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};
    if (moduleId) filter.moduleId = moduleId;

    const sortObj = sort === 'top' ? { upvoteCount: -1, createdAt: -1 } : { createdAt: -1 };

    const [submissions, total] = await Promise.all([
      Submission.find(filter)
        .sort(sortObj)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Submission.countDocuments(filter),
    ]);

    // Annotate each submission with viewer's upvote status
    const userId = req.user.id.toString();
    const annotated = submissions.map((s) => ({
      ...s,
      hasUpvoted: s.upvotes?.some((uid) => uid.toString() === userId),
      reviewCount: s.reviews?.length || 0,
    }));

    res.json({
      submissions: annotated,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching peer feed', error: err.message });
  }
});

/**
 * POST /api/peer/:id/upvote
 * Toggle upvote on a submission.
 */
router.post('/:id/upvote', protect, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const userId = req.user.id;
    const alreadyUpvoted = submission.upvotes.some((uid) => uid.toString() === userId.toString());

    if (alreadyUpvoted) {
      submission.upvotes = submission.upvotes.filter((uid) => uid.toString() !== userId.toString());
    } else {
      submission.upvotes.push(userId);
    }

    submission.upvoteCount = submission.upvotes.length;
    await submission.save();

    res.json({
      upvoteCount: submission.upvoteCount,
      hasUpvoted: !alreadyUpvoted,
    });
  } catch (err) {
    res.status(500).json({ message: 'Error toggling upvote', error: err.message });
  }
});

/**
 * POST /api/peer/:id/review
 * Add a review to a submission (cannot review own submission).
 */
router.post('/:id/review', protect, async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    if (!rating || !feedback) return res.status(400).json({ message: 'rating and feedback are required.' });
    if (rating < 1 || rating > 5) return res.status(400).json({ message: 'Rating must be 1–5.' });

    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    if (submission.userId.toString() === req.user.id.toString()) {
      return res.status(403).json({ message: 'Cannot review your own submission.' });
    }

    // One review per user per submission
    const alreadyReviewed = submission.reviews.some((r) => r.reviewerId.toString() === req.user.id.toString());
    if (alreadyReviewed) return res.status(400).json({ message: 'You have already reviewed this submission.' });

    const user = await User.findById(req.user.id).select('fullName email');
    submission.reviews.push({
      reviewerId: req.user.id,
      reviewerName: user?.fullName || user?.email?.split('@')[0] || 'Reviewer',
      rating: parseInt(rating),
      feedback,
    });

    await submission.save();
    res.json({ message: 'Review submitted!', avgRating: submission.avgRating, reviewCount: submission.reviews.length });
  } catch (err) {
    res.status(500).json({ message: 'Error submitting review', error: err.message });
  }
});

/**
 * GET /api/peer/my-submissions
 * Get current user's own submissions.
 */
router.get('/my-submissions', protect, async (req, res) => {
  try {
    const submissions = await Submission.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
    res.json({ submissions });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching submissions', error: err.message });
  }
});

module.exports = router;
