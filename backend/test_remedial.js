const mongoose = require('mongoose');
const connectDB = require('./src/config/db');
const User = require('./src/models/User');
const Roadmap = require('./src/models/Roadmap');
const Module = require('./src/models/Module');
const ModuleProgress = require('./src/models/ModuleProgress');
const axios = require('axios');

async function testRemedial() {
  await connectDB();

  let demoUser = await User.findOne({ email: 'demo@skillforge.io' });
  if (!demoUser) {
    demoUser = await User.create({ email: 'demo@skillforge.io', passwordHash: 'pw', currentTier: 'Intermediate' });
  }

  const r = await Roadmap.create({
    userId: demoUser._id,
    goal: 'Master Dynamic Feedback Loops',
    modules: [],
  });

  const m1 = await Module.create({
    roadmapId: r._id,
    title: 'Advanced State Management & Selectors',
    description: 'Learn Redux Toolkit, selectors, and state normalization.',
    difficulty: 'Intermediate',
  });

  const m2 = await Module.create({
    roadmapId: r._id,
    title: 'Server-Side Rendering & Next.js App Router',
    description: 'Explore SSR, SSG, and streaming HTML.',
    difficulty: 'Intermediate',
  });

  r.modules = [m1._id, m2._id];
  await r.save();

  console.log('Created Roadmap:', r._id.toString());
  console.log('Initial Modules Count:', r.modules.length);

  // Call running server's /api/progress/complete endpoint with score < 50%
  const res = await axios.post('http://localhost:5000/api/progress/complete', {
    userId: demoUser._id.toString(),
    moduleId: m1._id.toString(),
    quizScore: 30,
  });

  console.log('API Response Feedback:', res.data.feedback);

  const updatedRoadmap = await Roadmap.findById(r._id).populate('modules');
  console.log('Updated Roadmap Modules Count:', updatedRoadmap.modules.length);
  updatedRoadmap.modules.forEach((m, idx) => {
    console.log(`[Module ${idx + 1}] "${m.title}" (Difficulty: ${m.difficulty}, Remedial: ${m.isRemedial || false})`);
  });

  process.exit(0);
}

testRemedial();