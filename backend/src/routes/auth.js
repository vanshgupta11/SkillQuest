const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, JWT_SECRET } = require('../middleware/auth');
const { computeLevel } = require('../services/xpEngine');

// @route   POST /api/auth/register
// @desc    Register a new user with email, fullName, and password
router.post('/register', async (req, res) => {
  try {
    const { email, password, fullName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'An account with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await User.create({
      email: email.toLowerCase(),
      fullName: fullName || 'Developer',
      passwordHash,
      currentTier: 'Beginner',
      totalXp: 0,
      level: 1,
      streakDays: 1,
      lastActiveAt: new Date(),
    });

    const token = jwt.sign(
      { id: newUser._id, email: newUser.email, currentTier: newUser.currentTier },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const levelStats = computeLevel(newUser.totalXp);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        fullName: newUser.fullName,
        currentTier: newUser.currentTier,
        totalXp: newUser.totalXp,
        level: levelStats.level,
        streakDays: newUser.streakDays,
        progressPercent: levelStats.progressPercent,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration', error: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user with email/password & return JWT token
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: user._id, email: user.email, currentTier: user.currentTier },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const levelStats = computeLevel(user.totalXp);

    res.json({
      message: 'Logged in successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName || 'Developer',
        currentTier: user.currentTier,
        totalXp: user.totalXp,
        level: levelStats.level,
        streakDays: user.streakDays,
        progressPercent: levelStats.progressPercent,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login', error: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get authenticated user profile using Bearer JWT token
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-passwordHash');
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }

    const levelStats = computeLevel(user.totalXp);

    res.json({
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName || 'Developer',
        currentTier: user.currentTier,
        totalXp: user.totalXp,
        level: levelStats.level,
        streakDays: user.streakDays,
        progressPercent: levelStats.progressPercent,
        xpToNextLevel: levelStats.xpForNextLevel - user.totalXp,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching user profile' });
  }
});

module.exports = router;
