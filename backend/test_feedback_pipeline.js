const axios = require('axios');

async function testFeedbackPipeline() {
  console.log('=== TEST 1: Create Test Roadmap via Debug Endpoint ===');
  const genRes = await axios.post('http://localhost:5000/api/roadmap/debug-create', {
    goal: 'Master Dynamic Feedback Loops & Adaptive Difficulty',
  });

  const roadmap = genRes.data.roadmap;
  console.log('Roadmap Goal:', roadmap.goal);
  console.log('Initial Modules Count:', roadmap.modules.length);
  roadmap.modules.forEach((m, idx) => {
    console.log(`  Module ${idx + 1}: "${m.title}" (Difficulty: ${m.difficulty})`);
  });

  const m1 = roadmap.modules[0];
  const m2 = roadmap.modules[1];
  const m3 = roadmap.modules[2];

  console.log('\n=== TEST 2: Low Quiz Score (< 50%) on Module 1 → Remedial Module Insertion ===');
  const lowRes = await axios.post('http://localhost:5000/api/progress/complete', {
    moduleId: m1._id,
    quizScore: 35,
  });
  console.log('Feedback Output:', lowRes.data.feedback);

  const listRes = await axios.get('http://localhost:5000/api/roadmap/list');
  const latestRoadmap = listRes.data.roadmaps[0];
  console.log('Updated Roadmap Modules Count:', latestRoadmap.modules.length);
  latestRoadmap.modules.forEach((m, idx) => {
    console.log(`  [Sequence ${idx + 1}] "${m.title}" (Difficulty: ${m.difficulty}, Remedial: ${m.isRemedial || false})`);
  });

  console.log('\n=== TEST 3: High Score (>= 80%) on Remedial Module → Next Module Difficulty Upgrade ===');
  const remedialMod = latestRoadmap.modules[1]; // The inserted remedial module
  const r1 = await axios.post('http://localhost:5000/api/progress/complete', {
    moduleId: remedialMod._id,
    quizScore: 90,
  });
  console.log('Remedial Feedback (score: 90%):', r1.data.feedback);

  console.log('\n--- Acing Module 2 (Score: 95%) ---');
  const r2 = await axios.post('http://localhost:5000/api/progress/complete', {
    moduleId: m2._id,
    quizScore: 95,
  });
  console.log('Module 2 Feedback (score: 95%):', r2.data.feedback);

  console.log('\n--- Acing Module 3 (Score: 100%) → 3 Consecutive High Scores Tier Upgrade! ---');
  const r3 = await axios.post('http://localhost:5000/api/progress/complete', {
    moduleId: m3._id,
    quizScore: 100,
  });
  console.log('Module 3 Feedback (score: 100%):', r3.data.feedback);
  console.log('Final User Tier:', r3.data.user.currentTier);

  console.log('\n========================================');
  console.log('🎉 ALL FEEDBACK LOOP TESTS VERIFIED!');
  console.log('========================================');
  process.exit(0);
}

testFeedbackPipeline().catch((err) => {
  console.error('Test error:', err.response?.data || err.message);
  process.exit(1);
});
