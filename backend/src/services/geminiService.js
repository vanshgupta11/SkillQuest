const { GoogleGenerativeAI } = require('@google/generative-ai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

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
 * Validates JSON response and retries once on invalid JSON.
 * 
 * @param {string} goal - User's learning goal
 * @param {string} tier - User's currentTier (Beginner|Intermediate|Advanced)
 * @param {Array} youtubeResultsPerModule - Optional: YouTube results to pass back for video selection
 * @returns {Object} Parsed roadmap JSON
 */
async function generateRoadmapWithGemini(goal, tier, youtubeResultsPerModule = null) {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not set in environment variables. Please add it to your .env file.');
  }

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

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
  if (!GEMINI_API_KEY) {
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
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
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
  } catch (err) {
    console.warn('[Gemini] Remedial generation failed, using fallback:', err.message);
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
    summary: `Dynamic learning guide tailored for ${userTier} tier: ${moduleDescription}`,
    userTier,
    adaptedDepth: userTier === 'Beginner' ? 'Fundamental Concept & Syntax Focus' : userTier === 'Intermediate' ? 'Architecture & Pattern Focus' : 'Deep Internals & Performance Optimization',
    keyConcepts: [
      {
        heading: `Core Concept 1: ${moduleTitle} Fundamentals`,
        explanation: `At the ${userTier} level, understanding ${moduleTitle} requires grasping how state, data flow, and components interact cleanly without unnecessary complexity.`,
      },
      {
        heading: `Core Concept 2: ${userTier} Implementation Patterns`,
        explanation: `When implementing ${moduleTitle} for ${userTier} projects, structure your code modularly, keeping concerns separated and adhering to standard best practices.`,
      },
      {
        heading: `Core Concept 3: Common Pitfalls & Optimizations`,
        explanation: `Avoid anti-patterns such as redundant state mutations or blocking event loops. Ensure clean error handling and efficient resource cleanup.`,
      },
    ],
    codeExample: `// Adaptive Code Example (${userTier} Tier)
// Focus: ${moduleTitle}

function executeAdaptiveModule() {
  const userProficiency = "${userTier}";
  console.log(\`Running ${moduleTitle} tailored for \${userProficiency} tier...\`);
  return { status: "active", tier: userProficiency };
}`,
    quiz: [
      { id: 1, question: `What is the primary objective when applying ${moduleTitle} at the ${userTier} level?`, options: ['Simplify complexity', 'Maximize speed', 'Enforce modularity', 'All of the above'], answer: 'All of the above' },
      { id: 2, question: `Which design pattern is best suited for ${userTier} module architecture?`, options: ['Clean Separation of Concerns', 'Single Global Mutator', 'Monolithic Handler', 'Direct DOM Coupling'], answer: 'Clean Separation of Concerns' },
    ],
  };

  if (!GEMINI_API_KEY) {
    console.warn('[Gemini] GEMINI_API_KEY not set. Serving structured dynamic fallback module content.');
    return fallbackContent;
  }

  try {
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-3.6-flash' });

    const prompt = `You are SkillForge's Adaptive Learning Engine.
Dynamically generate tailored study material for the module: "${moduleTitle}" (${moduleDescription}).

Target User Proficiency Tier: ${userTier} (Difficulty: ${moduleDifficulty}).

Guidelines:
- If User Tier is Beginner: Explain with simple analogies, clear step-by-step guidance, fundamental syntax, and foundational rules.
- If User Tier is Intermediate: Focus on real-world design patterns, API composition, refactoring, and state management.
- If User Tier is Advanced: Focus on internal architecture, performance optimizations, memory overhead, concurrency, and high-scale edge cases.

Return ONLY valid raw JSON matching this exact schema:
{
  "title": "${moduleTitle}",
  "summary": "string — 2 sentence summary tailored for ${userTier} tier",
  "adaptedDepth": "string — e.g. Fundamental Syntax / Architectural Patterns / Advanced Performance",
  "keyConcepts": [
    {
      "heading": "string — Concept title",
      "explanation": "string — 3-4 sentence detailed explanation written specifically for ${userTier} tier"
    },
    {
      "heading": "string — Concept title",
      "explanation": "string — 3-4 sentence explanation"
    },
    {
      "heading": "string — Concept title",
      "explanation": "string — 3-4 sentence explanation"
    }
  ],
  "codeExample": "string — clean, commented code snippet illustrating the concept for ${userTier} tier",
  "quiz": [
    {
      "id": 1,
      "question": "string — diagnostic question testing comprehension",
      "answer": "string — key answer or explanation"
    },
    {
      "id": 2,
      "question": "string — second question",
      "answer": "string — key answer"
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
  } catch (err) {
    console.warn('[Gemini] Dynamic module content generation failed, using fallback:', err.message);
    return fallbackContent;
  }
}

module.exports = { generateRoadmapWithGemini, generateRemedialModuleWithGemini, generateDynamicModuleContentWithGemini };


