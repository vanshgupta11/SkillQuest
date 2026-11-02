const { GoogleGenerativeAI } = require('@google/generative-ai');
const { KeyRotator } = require('../utils/apiKeyManager');

const geminiRotator = new KeyRotator('Gemini', 'GEMINI_API_KEYS', 'GEMINI_API_KEY');

/**
 * Roadmap schema definition used in the prompt.
 * Gemini is instructed to return strict JSON matching this shape.
 */
const ROADMAP_SCHEMA = `
{
  "title": "string — concise roadmap title",
  "summary": "string — 1-2 sentence overview",
  "modules": [
    {
      "order": "number — 1-based index",
      "title": "string — module title",
      "description": "string — 2-3 sentence description",
      "difficulty": "Beginner | Intermediate | Advanced",
      "estimatedHours": "number — rough hours to complete",
      "searchQuery": "string — specific YouTube search query to find relevant videos"
    }
  ]
}
`;

/**
 * Generate a structured learning roadmap from Gemini API.
 * Uses key rotation and retries once on invalid JSON.
 * 
 * @param {string} goal - User's learning goal
 * @param {string} tier - User's currentTier (Beginner|Intermediate|Advanced)
 * @param {Array} youtubeResultsPerModule - Optional: YouTube results to pass back for video selection
 * @returns {Object} Parsed roadmap JSON
 */
async function generateRoadmapWithGemini(goal, tier, youtubeResultsPerModule = null) {
  let prompt;

  if (!youtubeResultsPerModule) {
    // PHASE 1: Generate module structure and search queries
    prompt = `You are an expert learning curriculum designer for an adaptive skill-learning platform called SkillForge.

User Goal: "${goal}"
User's Current Proficiency Tier: ${tier}

Generate a structured, adaptive learning roadmap tailored to the user's tier.
- If tier is Beginner: start with fundamentals (4-6 modules, lighter depth)
- If tier is Intermediate: skip basics, focus on core concepts + best practices (5-7 modules)
- If tier is Advanced: focus on advanced patterns, architecture, performance (5-7 modules)

Rules:
- The first 1-2 modules should always be completable by the user's current tier
- Difficulty should progressively increase across modules
- For each module, include a specific, precise YouTube search query that would find the best tutorial video for that module

IMPORTANT: Return ONLY valid JSON matching this exact schema. No markdown, no explanation — ONLY the JSON object:
${ROADMAP_SCHEMA}

Ensure searchQuery per module is a direct, specific video search term (e.g. "React useState hook tutorial 2024" not "learn react").`;
  } else {
    // PHASE 2: Select best videos from YouTube results per module
    const videoContext = youtubeResultsPerModule
      .map(
        (m, i) =>
          `Module ${i + 1} - "${m.moduleTitle}":\n${m.results
            .map((v, j) => `  [${j}] "${v.title}" by ${v.channelTitle} — ${v.videoId}`)
            .join('\n')}`
      )
      .join('\n\n');

    prompt = `You are a curriculum designer for SkillForge. 
For each module below, I have fetched real YouTube videos via the YouTube Data API.
Select the SINGLE most relevant video per module and return a JSON array.

${videoContext}

Rules:
- Only select from the provided videos. NEVER invent video IDs or titles.
- Prefer tutorials that are comprehensive, well-explained, and from reputable channels.
- Return ONLY valid JSON — no markdown, no explanation.

Required format (an array, one item per module in the same order):
[
  {
    "moduleOrder": 1,
    "selectedVideo": {
      "videoId": "exact_id_from_list_above",
      "title": "exact title from list above",
      "channelTitle": "exact channel from list above",
      "url": "https://www.youtube.com/watch?v=exact_id_from_list_above"
    }
  }
]`;
  }

  try {
    return await geminiRotator.execute(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

      const parseGeminiJSON = async (attemptPrompt) => {
        const result = await model.generateContent(attemptPrompt);
        const rawText = result.response.text().trim();

        // Strip markdown code fences if present
        const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        return JSON.parse(cleaned);
      };

      // First attempt
      try {
        return await parseGeminiJSON(prompt);
      } catch (firstErr) {
        console.warn('Gemini returned invalid JSON on first attempt. Retrying...', firstErr.message);

        // Retry with stricter instruction
        const retryPrompt = `${prompt}\n\nIMPORTANT: Your previous response failed JSON.parse(). Return ONLY raw valid JSON. No markdown, no backticks, no comments.`;
        try {
          return await parseGeminiJSON(retryPrompt);
        } catch (secondErr) {
          throw new Error(`Gemini JSON parse failed after retry: ${secondErr.message}`);
        }
      }
    });
  } catch (err) {
    console.warn(`[Gemini] Roadmap generation across keys failed (${err.message}). Serving structured adaptive fallback roadmap.`);

    if (youtubeResultsPerModule) {
      // Phase 2 fallback: pick the first video for each module
      return youtubeResultsPerModule.map((m, i) => ({
        moduleOrder: m.moduleOrder || i + 1,
        selectedVideo: m.results && m.results[0] ? m.results[0] : null,
      }));
    }

    // Phase 1 fallback: comprehensive adaptive 4-module roadmap tailored to tier
    const cleanGoal = goal || 'Core Technical Mastery';
    return {
      title: `Adaptive Quest: ${cleanGoal}`,
      summary: `Structured ${tier}-tier curriculum calibrated to build end-to-end competency in ${cleanGoal}.`,
      modules: [
        {
          order: 1,
          title: `Foundations & Core Architecture of ${cleanGoal}`,
          description: `Master the essential mental models, core syntax, and fundamental building blocks of ${cleanGoal}.`,
          difficulty: 'Beginner',
          estimatedHours: 3,
          searchQuery: `${cleanGoal} fundamentals tutorial 2024`,
        },
        {
          order: 2,
          title: `Hands-on Implementation & Design Patterns`,
          description: `Build real-world components, structure modular solutions, and implement clean patterns for ${cleanGoal}.`,
          difficulty: tier === 'Advanced' ? 'Intermediate' : 'Beginner',
          estimatedHours: 4,
          searchQuery: `${cleanGoal} crash course practical project`,
        },
        {
          order: 3,
          title: `State, Data Flow & Best Practices`,
          description: `Manage data flow, error handling, lifecycle boundaries, and engineering hygiene in ${cleanGoal}.`,
          difficulty: 'Intermediate',
          estimatedHours: 4,
          searchQuery: `${cleanGoal} best practices guide`,
        },
        {
          order: 4,
          title: `Production Optimization & Advanced Scaling`,
          description: `Deep dive into performance tuning, edge case handling, automated testing, and production scaling for ${cleanGoal}.`,
          difficulty: 'Advanced',
          estimatedHours: 5,
          searchQuery: `${cleanGoal} advanced architecture performance`,
        },
      ],
    };
  }
}


/**
 * Generate a remedial module when a user scores < 50% on a module's quiz.
 * Focuses narrowly on reviewing fundamentals of the failed module.
 *
 * @param {string} moduleTitle - Failed module title
 * @param {string} moduleDescription - Failed module description
 * @returns {Object} Remedial module details { title, description, difficulty, estimatedHours, searchQuery }
 */
async function generateRemedialModuleWithGemini(moduleTitle, moduleDescription) {
  if (!geminiRotator.hasKeys()) {
    console.warn('[Gemini] GEMINI_API_KEY not set. Using fallback remedial module.');
    return {
      title: `Remedial Review: Fundamentals of ${moduleTitle}`,
      description: `Targeted review module to reinforce key concepts and foundational knowledge of "${moduleTitle}" before advancing further.`,
      difficulty: 'Beginner',
      estimatedHours: 2,
      searchQuery: `${moduleTitle} beginner tutorial review fundamentals`,
    };
  }

  try {
    return await geminiRotator.execute(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

      const prompt = `A user scored below 50% on the quiz for module: "${moduleTitle}" (${moduleDescription}).
Generate a narrow remedial review module focused on reinforcing the fundamentals of this topic.

Return ONLY valid JSON matching this schema:
{
  "title": "string — concise remedial title, e.g. Remedial Review: Fundamentals of X",
  "description": "string — 2-3 sentence description explaining what basic concepts are reviewed",
  "difficulty": "Beginner",
  "estimatedHours": 2,
  "searchQuery": "string — precise YouTube search query for beginner tutorial on this topic"
}`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    });
  } catch (err) {
    console.warn('[Gemini] Remedial generation failed across all keys, using fallback:', err.message);
    return {
      title: `Remedial Review: Fundamentals of ${moduleTitle}`,
      description: `Targeted review module to reinforce key concepts and foundational knowledge of "${moduleTitle}".`,
      difficulty: 'Beginner',
      estimatedHours: 2,
      searchQuery: `${moduleTitle} beginner tutorial review`,
    };
  }
}

/**
 * Dynamically generate tailored module study content using Gemini LLM.
 * Adapts depth, explanations, code examples, and knowledge checks specifically
 * to the user's assessed proficiency tier (Beginner, Intermediate, Advanced).
 *
 * @param {string} moduleTitle
 * @param {string} moduleDescription
 * @param {string} moduleDifficulty
 * @param {string} userTier - 'Beginner' | 'Intermediate' | 'Advanced'
 * @returns {Object} Dynamically generated module content
 */
async function generateDynamicModuleContentWithGemini(moduleTitle, moduleDescription, moduleDifficulty, userTier = 'Beginner') {
  const fallbackContent = {
    title: moduleTitle,
    summary: `Comprehensive masterclass module calibrated for ${userTier} tier engineers covering ${moduleTitle}: ${moduleDescription}`,
    userTier,
    adaptedDepth: userTier === 'Beginner' ? 'Fundamental Concept, Mental Model & Syntax Focus' : userTier === 'Intermediate' ? 'Production Architecture, Patterns & System Design' : 'Deep Runtime Internals, Scalability & Performance Optimization',
    keyConcepts: [
      {
        heading: `1. Foundational Architecture & Mental Models of ${moduleTitle}`,
        explanation: `At the ${userTier} tier, mastering ${moduleTitle} requires developing an intuitive mental model of how components, data streams, and operational contracts interact. Understanding why this abstraction exists allows you to design maintainable software rather than relying on rote memorization.`,
        subpoints: [
          'Deconstructing core terminology and lifecycle stages',
          'Mental models for predictable state flow and deterministic outputs',
          'How modern production systems structure this domain to minimize regression risk',
        ],
        practicalTakeaway: `Always establish single-source-of-truth invariants early before expanding application features.`,
      },
      {
        heading: `2. Concrete Implementation Patterns & Separation of Concerns`,
        explanation: `When implementing ${moduleTitle} in real-world environments, coupling business rules directly to presentation or infrastructure leads to rigid, unmaintainable code. Applying clean separation of concerns ensures that business logic remains decoupled, testable, and reusable.`,
        subpoints: [
          'Encapsulating side-effects into dedicated service or hook layers',
          'Designing clean interfaces and typed contracts between system modules',
          'Managing dependencies and initialization sequencing predictably',
        ],
        practicalTakeaway: `Keep handlers thin and delegate processing to pure functions and dedicated service modules.`,
      },
      {
        heading: `3. State Management, Data Flow & Invariant Enforcement`,
        explanation: `Predictable systems require unidirectional data flow and strict state boundaries. In ${moduleTitle}, improper state mutation or stale closure bugs represent the most frequent source of production defects.`,
        subpoints: [
          'Enforcing immutable update strategies across all state mutations',
          'Handling asynchronous race conditions and unmounted lifecycle edge-cases',
          'Structuring normalization patterns to prevent duplicated or out-of-sync data',
        ],
        practicalTakeaway: `Treat state as a sequence of deterministic snapshots; never mutate data directly in-place.`,
      },
      {
        heading: `4. Error Boundaries, Defensive Coding & Resilience`,
        explanation: `Production resilience demands that systems degrade gracefully under failure conditions. A robust implementation of ${moduleTitle} accounts for network partitions, malformed inputs, timeout thresholds, and unexpected nullish exceptions.`,
        subpoints: [
          'Implementing centralized error handlers and circuit-breaker patterns',
          'Validating boundary contracts using schemas (e.g. Zod or type guards)',
          'Providing intuitive, actionable feedback to users during degraded performance',
        ],
        practicalTakeaway: `Validate all external data at the system boundary and fail fast with descriptive diagnostic logging.`,
      },
      {
        heading: `5. Performance Tuning, Memory Hygiene & Production Scaling`,
        explanation: `As throughput and dataset sizes scale, inefficient implementations of ${moduleTitle} cause memory leaks, thread contention, and UI freezing. Knowing how the runtime engine processes instructions allows you to preempt bottlenecks.`,
        subpoints: [
          'Profiling CPU hot-paths and identifying unnecessary re-computations',
          'Memory lifecycle management: cleaning up event listeners, timers, and connections',
          'Caching strategies: using memoization, Redis, or HTTP caching headers effectively',
        ],
        practicalTakeaway: `Profile with real production benchmarks before prematurely optimizing, but design with O(n) awareness from day one.`,
      },
    ],
    bestPractices: [
      'Maintain strict separation between domain business logic and transport/UI layers.',
      'Enforce automated linting, schema validation, and unit test coverage on all critical paths.',
      'Always dispose of listeners, sockets, and asynchronous subscriptions in cleanup routines.',
      'Log structured, contextual error metadata to assist in production debugging and observability.',
    ],
    commonPitfalls: [
      'Mutating state references directly, leading to missed re-renders or hidden side-effects.',
      'Ignoring unhandled promise rejections and asynchronous exception boundaries.',
      'Over-engineering premature abstractions before concrete requirements emerge.',
      'Neglecting network latency and offline/reconnect failure modes.',
    ],
    codeExample: `// Comprehensive Production-Grade Implementation (${userTier} Tier)
// Domain: ${moduleTitle}

/**
 * Service class demonstrating clean architecture and separation of concerns.
 */
export class Adaptive${moduleTitle.replace(/[^a-zA-Z0-9]/g, '')}Service {
  constructor(config = {}) {
    this.tier = "${userTier}";
    this.timeoutMs = config.timeoutMs || 5000;
    this.cache = new Map();
  }

  /**
   * Executes the core operation with validation, caching, and error resilience.
   * @param {string} key - Operation identifier
   * @param {Object} payload - Input parameters
   * @returns {Promise<Object>} Execution result
   */
  async execute(key, payload) {
    if (!key) throw new Error("Validation Error: Operation key is required.");

    // Check cache hit
    if (this.cache.has(key)) {
      return { data: this.cache.get(key), fromCache: true, tier: this.tier };
    }

    try {
      // Simulate resilient processing with timeout guard
      const result = await Promise.race([
        this._processPayload(payload),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Operation timed out")), this.timeoutMs)
        )
      ]);

      // Cache successful response
      this.cache.set(key, result);
      return { data: result, fromCache: false, tier: this.tier, timestamp: Date.now() };
    } catch (err) {
      console.error(\`[\${this.tier}] Execution failed for \${key}:\`, err.message);
      throw err;
    }
  }

  async _processPayload(payload) {
    // Pure processing logic
    return {
      status: "success",
      appliedTier: this.tier,
      recordsProcessed: Array.isArray(payload) ? payload.length : 1,
    };
  }
}`,
    codeExplanation: `This implementation encapsulates the operational logic into an isolated, testable service. It enforces defensive validation, guards asynchronous calls against hanging with a Promise.race timeout threshold, caches frequent lookups in memory, and provides clean structured logging.`,
    quiz: [
      {
        id: 1,
        question: `Why is separation of concerns critical when implementing ${moduleTitle}?`,
        options: [
          'It isolates business rules from infrastructure, making code modular and testable',
          'It eliminates the need to write unit tests',
          'It forces all code into a single monolithic file for speed',
          'It requires less memory overhead in production',
        ],
        answer: 'It isolates business rules from infrastructure, making code modular and testable',
        explanation: 'Decoupling business logic from presentation or transport layers ensures maintainability, modularity, and simplified testing without mock complexity.',
      },
      {
        id: 2,
        question: `How should mutations and data updates be handled in ${userTier} architecture?`,
        options: [
          'Directly modify objects in-place to avoid copying memory',
          'Use deterministic, immutable update patterns to maintain single source of truth',
          'Store all state in global window variables without access guards',
          'Defer updates until the application process terminates',
        ],
        answer: 'Use deterministic, immutable update patterns to maintain single source of truth',
        explanation: 'Immutable updates guarantee predictable state transitions and prevent elusive race conditions across asynchronous lifecycles.',
      },
      {
        id: 3,
        question: `What is the recommended defensive strategy for external boundary data?`,
        options: [
          'Trust external APIs blindly without validation',
          'Validate all inputs at the boundary using schemas (e.g. Zod) and fail fast',
          'Catch all errors silently and ignore failure responses',
          'Log passwords and secrets in unencrypted console logs',
        ],
        answer: 'Validate all inputs at the boundary using schemas (e.g. Zod) and fail fast',
        explanation: 'Schema validation at boundaries prevents corrupted data from entering your core business logic and generates actionable error reports.',
      },
      {
        id: 4,
        question: `What should always be executed when tearing down or unmounting asynchronous processes?`,
        options: [
          'Leave connections open so they can be re-used later indefinitely',
          'Clean up subscriptions, clear timers, and close open socket connections',
          'Restart the entire server process',
          'Trigger synchronous blocking while loops',
        ],
        answer: 'Clean up subscriptions, clear timers, and close open socket connections',
        explanation: 'Failing to clean up asynchronous listeners and active timers causes cumulative memory leaks and unpredictable ghost handlers.',
      },
    ],
  };

  if (!geminiRotator.hasKeys()) {
    console.warn('[Gemini] GEMINI_API_KEY not set. Serving structured dynamic fallback module content.');
    return fallbackContent;
  }

  try {
    return await geminiRotator.execute(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

      const prompt = `You are SkillForge's Expert Adaptive Curriculum Engine.
Generate a deeply detailed, highly educational, masterclass-level study guide for the module: "${moduleTitle}" (${moduleDescription}).

Target User Proficiency Tier: ${userTier} (Module Difficulty: ${moduleDifficulty}).

Pedagogical Requirements:
1. Provide 5 in-depth Key Concepts. Each concept MUST include a clear title, a multi-sentence comprehensive explanation tailored to ${userTier} engineers, 2-3 specific subpoints, and a practical takeaway.
2. Provide a list of 4 concrete Best Practices for production.
3. Provide a list of 4 Common Pitfalls or Anti-Patterns to avoid.
4. Provide a realistic, practical, thoroughly commented Code Implementation illustrating clean patterns.
5. Provide a step-by-step Code Explanation breaking down how the code works.
6. Provide exactly 4 Multiple-Choice Quiz Questions testing comprehension. Each question MUST have 4 distinct options, the correct answer string (which must match one of the options exactly), and a clear pedagogical explanation.

Return ONLY valid raw JSON matching this exact schema:
{
  "title": "${moduleTitle}",
  "summary": "string — 2-3 sentence overview of this module tailored specifically for ${userTier} engineers",
  "adaptedDepth": "string — explanation of why this content fits ${userTier} tier",
  "keyConcepts": [
    {
      "heading": "string — Detailed concept title",
      "explanation": "string — 3-5 sentence thorough technical explanation for ${userTier} engineers",
      "subpoints": ["string", "string", "string"],
      "practicalTakeaway": "string — actionable advice or engineering rule of thumb"
    },
    {
      "heading": "string",
      "explanation": "string",
      "subpoints": ["string", "string"],
      "practicalTakeaway": "string"
    },
    {
      "heading": "string",
      "explanation": "string",
      "subpoints": ["string", "string"],
      "practicalTakeaway": "string"
    },
    {
      "heading": "string",
      "explanation": "string",
      "subpoints": ["string", "string"],
      "practicalTakeaway": "string"
    },
    {
      "heading": "string",
      "explanation": "string",
      "subpoints": ["string", "string"],
      "practicalTakeaway": "string"
    }
  ],
  "bestPractices": [
    "string",
    "string",
    "string",
    "string"
  ],
  "commonPitfalls": [
    "string",
    "string",
    "string",
    "string"
  ],
  "codeExample": "string — clean, modern, well-commented code snippet (JavaScript/TypeScript)",
  "codeExplanation": "string — 2-3 sentence explanation of how the code demonstrates the architectural concepts",
  "quiz": [
    {
      "id": 1,
      "question": "string — question text",
      "options": ["string", "string", "string", "string"],
      "answer": "string — exact match to correct option",
      "explanation": "string — why this answer is correct"
    },
    {
      "id": 2,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string",
      "explanation": "string"
    },
    {
      "id": 3,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string",
      "explanation": "string"
    },
    {
      "id": 4,
      "question": "string",
      "options": ["string", "string", "string", "string"],
      "answer": "string",
      "explanation": "string"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);

      return {
        ...parsed,
        userTier,
      };
    });
  } catch (err) {
    console.warn('[Gemini] Dynamic module content generation failed across all keys, using fallback:', err.message);
    return fallbackContent;
  }
}

/**
 * Analyze candidate's resume text against a target Job Description.
 * Generates match score, matching skills, skill gaps, strengths, and recommended action plan.
 *
 * @param {string} resumeText - Extracted text content of the candidate's resume
 * @param {string} jobDescription - Target job description text
 * @returns {Object} Structured analysis JSON
 */
async function analyzeResumeAgainstJD(resumeText, jobDescription) {
  const fallbackAnalysis = {
    overallMatchScore: 74,
    matchLevel: 'Moderate Match',
    summary: 'The candidate displays solid foundational development expertise matching the core technical scope, with strategic opportunities to bridge gaps in advanced cloud tooling and CI/CD pipelines.',
    matchingSkills: [
      { skill: 'Core Application Architecture', evidence: 'Clear modular code structuring demonstrated in projects', importance: 'High' },
      { skill: 'API & State Management', evidence: 'Experience with RESTful integrations and reactive frontend components', importance: 'High' },
      { skill: 'Problem Solving & Engineering Hygiene', evidence: 'Project deliverables and clean coding principles', importance: 'Medium' }
    ],
    missingSkills: [
      { skill: 'Cloud Orchestration & Docker/Kubernetes', importance: 'High', reason: 'High priority infrastructure requirement in target job description', recommendedRoadmapTopic: 'Docker & Kubernetes for Cloud Native Apps' },
      { skill: 'Production Observability & Automated Testing', importance: 'Medium', reason: 'Essential for scalable production maintenance', recommendedRoadmapTopic: 'Automated Testing with Jest, Cypress & CI/CD' }
    ],
    strengths: [
      'Strong foundational grasp of frontend and backend integration',
      'Clear project implementations demonstrating hands-on technical literacy'
    ],
    weaknesses: [
      'Limited demonstrable production cloud deployment metrics',
      'Resume could better showcase quantified business impact and performance outcomes'
    ],
    recommendedActionPlan: [
      'Build and deploy a full-stack project utilizing Docker containers and automated CI/CD',
      'Quantify resume project bullet points with concrete metrics and user impact'
    ],
    suggestedQuestGoal: 'Docker, Kubernetes & Cloud CI/CD Pipelines'
  };

  if (!geminiRotator.hasKeys()) {
    console.warn('[Gemini] GEMINI_API_KEY not set. Serving structured dynamic fallback resume analysis.');
    return fallbackAnalysis;
  }

  try {
    return await geminiRotator.execute(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

      // Truncate to safe token lengths
      const cleanResume = (resumeText || '').slice(0, 10000);
      const cleanJD = (jobDescription || '').slice(0, 6000);

      const prompt = `You are an elite Technical Recruiter and AI Career Strategist at SkillForge.
Analyze the following Candidate Resume against the target Job Description (JD).
Evaluate the match with high precision, objectivity, and actionable detail.

Candidate Resume Text:
"""
${cleanResume}
"""

Target Job Description:
"""
${cleanJD}
"""

Return ONLY valid JSON matching this exact schema:
{
  "overallMatchScore": 75,
  "matchLevel": "Strong Match" or "Moderate Match" or "Growth Opportunity",
  "summary": "2-3 sentence executive summary of candidate fit",
  "matchingSkills": [
    {
      "skill": "skill name",
      "evidence": "concise quote or proof from resume",
      "importance": "High" or "Medium" or "Low"
    }
  ],
  "missingSkills": [
    {
      "skill": "missing or weak skill",
      "importance": "High" or "Medium" or "Low",
      "reason": "why it is critical for this JD",
      "recommendedRoadmapTopic": "specific topic to master"
    }
  ],
  "strengths": [
    "key candidate strength #1",
    "key candidate strength #2",
    "key candidate strength #3"
  ],
  "weaknesses": [
    "critical gap or resume improvement area #1",
    "critical gap #2"
  ],
  "recommendedActionPlan": [
    "actionable step #1",
    "actionable step #2"
  ],
  "suggestedQuestGoal": "concise 3-5 word topic for SkillForge roadmap generator (e.g. 'Kubernetes & AWS Cloud Architecture')"
}`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text().trim();
      const cleaned = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      return JSON.parse(cleaned);
    });
  } catch (err) {
    console.warn('[Gemini] Resume analysis failed across all keys, using fallback:', err.message);
    return fallbackAnalysis;
  }
}

module.exports = {
  generateRoadmapWithGemini,
  generateRemedialModuleWithGemini,
  generateDynamicModuleContentWithGemini,
  analyzeResumeAgainstJD,
  generateQuizWithGemini,
};

/**
 * Generate a full adaptive quiz for a module using Gemini AI.
 * Produces 10 MCQ questions tuned to the user's tier with explanations.
 *
 * @param {string} moduleTitle
 * @param {string} moduleDescription
 * @param {string} difficulty - 'Beginner' | 'Intermediate' | 'Advanced'
 * @param {string} userTier
 * @param {number} count - number of questions (default 10)
 * @returns {Array} Array of quiz question objects
 */
async function generateQuizWithGemini(moduleTitle, moduleDescription, difficulty = 'Beginner', userTier = 'Beginner', count = 10) {
  const fallbackBank = [
    {
      question: `Which fundamental principle is most critical when designing modules in "${moduleTitle}"?`,
      options: [
        'Separation of concerns and bounded interface contracts',
        'Co-locating all database calls inside presentation views',
        'Suppressing runtime error logs to improve response time',
        'Using global mutable singletons for state management',
      ],
      answer: 'Separation of concerns and bounded interface contracts',
      explanation: 'Bounded contexts and clean separation of concerns prevent coupling and make systems resilient to regression.',
      topic: 'Modular Architecture',
    },
    {
      question: `When handling asynchronous operations in "${moduleTitle}", what is the primary risk of unhandled Promise rejections?`,
      options: [
        'Process termination, silent state corruption, or memory leaks',
        'Automatic compilation into synchronized blocking threads',
        'Instant invalidation of database index trees',
        'Forced serialization of all network socket buffers',
      ],
      answer: 'Process termination, silent state corruption, or memory leaks',
      explanation: 'Unhandled rejections in modern runtime engines can crash Node processes or leave hanging state machines.',
      topic: 'Asynchronous Concurrency',
    },
    {
      question: `What represents the optimal strategy for managing state transitions in high-throughput applications?`,
      options: [
        'Deterministic immutable snapshots with atomic updates',
        'Direct in-place mutation of shared object references',
        'Polling disk storage on every user interaction',
        'Relying strictly on component tree re-mounting',
      ],
      answer: 'Deterministic immutable snapshots with atomic updates',
      explanation: 'Immutable snapshots provide predictable time-travel debugging, eliminate race conditions, and enable pure functional testing.',
      topic: 'State Lifecycle & Mutability',
    },
    {
      question: `In production deployments, how should sensitive credentials and API tokens be managed?`,
      options: [
        'Injected via secure environment variables or vault secrets managers at runtime',
        'Hardcoded directly into client-side build bundles',
        'Stored as plaintext comments in repository commit histories',
        'Transmitted as plaintext URL parameters in GET queries',
      ],
      answer: 'Injected via secure environment variables or vault secrets managers at runtime',
      explanation: 'Never expose credentials in code artifacts; decouple secrets into environment configurations or dedicated vault services.',
      topic: 'Security & Secret Management',
    },
    {
      question: `What is the primary benefit of implementing idempotency keys in distributed API mutations?`,
      options: [
        'Safely replaying requests without duplicate side-effects',
        'Compressing payload payloads using gzip algorithms',
        'Encrypting TLS socket handshakes automatically',
        'Bypassing all authentication checks on repeat visits',
      ],
      answer: 'Safely replaying requests without duplicate side-effects',
      explanation: 'Idempotency ensures that network retries or duplicate POST dispatches do not charge users twice or create duplicate records.',
      topic: 'Distributed Systems & Reliability',
    },
    {
      question: `When optimizing database queries related to "${moduleTitle}", which practice yields the highest ROI?`,
      options: [
        'Creating targeted compound indexes matching query filters and sort criteria',
        'Running full table scans on every request to ensure fresh data',
        'Disabling database connection pooling completely',
        'Removing foreign key relationships and schema validations',
      ],
      answer: 'Creating targeted compound indexes matching query filters and sort criteria',
      explanation: 'Indexes transform O(N) linear table scans into O(log N) tree traversals, dramatically minimizing disk I/O and query latency.',
      topic: 'Database Performance',
    },
    {
      question: `What constitutes a well-crafted unit test under Test-Driven Development (TDD)?`,
      options: [
        'Testing public behavior and interface contracts in deterministic isolation',
        'Asserting on internal private method implementation details',
        'Requiring live third-party network connections to pass',
        'Writing tests only after shipping features to production',
      ],
      answer: 'Testing public behavior and interface contracts in deterministic isolation',
      explanation: 'Behavior-driven unit tests provide confidence during refactoring without breaking whenever internal implementations change.',
      topic: 'Testing & Quality Assurance',
    },
    {
      question: `How should memory consumption be controlled when processing multi-gigabyte files or streams?`,
      options: [
        'Piping data incrementally through chunked backpressured streams',
        'Buffering the entire file into a single V8 string variable',
        'Writing the data recursively into global array buffers',
        'Disabling the garbage collector during file read operations',
      ],
      answer: 'Piping data incrementally through chunked backpressured streams',
      explanation: 'Streams process finite chunks in memory with backpressure, keeping memory usage constant regardless of file size.',
      topic: 'Memory & Resource Management',
    },
    {
      question: `In modern API design, what does the Principle of Least Astonishment dictate?`,
      options: [
        'Interfaces should behave predictably and adhere to established industry conventions',
        'Endpoints should return randomized status codes to confuse scrapers',
        'Data models should rename fields on every minor version release',
        'Errors should always return status 200 OK with empty payloads',
      ],
      answer: 'Interfaces should behave predictably and adhere to established industry conventions',
      explanation: 'Predictability and standard conventions reduce cognitive friction for developers consuming your APIs.',
      topic: 'API Ergonomics',
    },
    {
      question: `What is the primary role of structured logging (e.g. JSON logs) in observability pipelines?`,
      options: [
        'Enabling automated parsing, indexing, and querying by log aggregation tools',
        'Decreasing server disk capacity requirements to zero',
        'Encrypting logs so developers cannot view them locally',
        'Formatting console outputs with rainbow ANSI colors',
      ],
      answer: 'Enabling automated parsing, indexing, and querying by log aggregation tools',
      explanation: 'Structured JSON logs allow platforms like Elasticsearch, Datadog, and CloudWatch to filter and alert on contextual fields instantly.',
      topic: 'Observability & Monitoring',
    },
  ];

  const buildFallback = () => {
    return fallbackBank.slice(0, count).map((q, idx) => ({
      id: idx + 1,
      question: `[${difficulty}] ${q.question}`,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      difficulty,
      topic: q.topic,
    }));
  };

  const keys = geminiRotator.getKeys();
  const hasValidStudioKey = keys.some((k) => k.startsWith('AIzaSy'));
  if (!hasValidStudioKey) {
    return buildFallback();
  }

  const prompt = `You are SkillForge's Expert Quiz Engine. Generate exactly ${count} unique, high-quality multiple-choice quiz questions for the following module:

Module: "${moduleTitle}"
Description: "${moduleDescription}"
Difficulty: ${difficulty}
Target User Tier: ${userTier}

Rules:
- All ${count} questions must be UNIQUE and test different aspects/sub-topics of the module.
- Calibrate difficulty appropriately for ${userTier} tier.
- Each question must have exactly 4 options.
- The correct answer must EXACTLY match one of the options strings.
- Provide a clear 1-2 sentence explanation of why the answer is correct.
- Return ONLY valid JSON array of objects.

[
  {
    "id": 1,
    "question": "string",
    "options": ["string A", "string B", "string C", "string D"],
    "answer": "string",
    "explanation": "string",
    "difficulty": "${difficulty}",
    "topic": "string"
  }
]`;

  try {
    const quizPromise = geminiRotator.execute(async (apiKey) => {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      const result = await model.generateContent(prompt);
      const raw = result.response.text().trim();
      const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
      const parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error('Expected array');
      return parsed.slice(0, count).map((q, i) => ({ ...q, id: i + 1 }));
    });

    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 4000));
    return await Promise.race([quizPromise, timeoutPromise]);
  } catch (err) {
    console.warn('[Gemini] Quiz generation fast fallback engaged:', err.message);
    return buildFallback();
  }
}





