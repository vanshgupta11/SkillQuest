const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

router.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    service: 'SkillForge API',
    version: '1.0.0',
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
