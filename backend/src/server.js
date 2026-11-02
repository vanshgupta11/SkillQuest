const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./config/db');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const assessmentRoutes = require('./routes/assessment');
const dashboardRoutes = require('./routes/dashboard');
const roadmapRoutes = require('./routes/roadmap');
const courseRoutes = require('./routes/course');
const progressRoutes = require('./routes/progress');
const resumeRoutes = require('./routes/resume');
const roomRoutes = require('./routes/rooms');
const profileRoutes = require('./routes/profile');
const peerRoutes = require('./routes/peer');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/assessment', assessmentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/course', courseRoutes);
app.use('/api/progress', progressRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/peer', peerRoutes);


// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SkillForge API',
    description: 'Adaptive skill-learning platform backend',
    health: '/api/health',
    endpoints: [
      '/api/auth/login',
      '/api/auth/register',
      '/api/assessment',
      '/api/dashboard/stats',
      '/api/dashboard/leaderboard',
      '/api/roadmap',
      '/api/course/:id',
      '/api/progress/complete',
      '/api/progress/streak-test',
    ],
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;

// Connect DB and launch server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 SkillForge Backend API running on port ${PORT}`);
  });
});
