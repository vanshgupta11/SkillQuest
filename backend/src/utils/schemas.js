const { z } = require('zod');

/**
 * Zod schema for validating the incoming Resume Analysis request payload.
 */
const resumeAnalyzeRequestSchema = z.object({
  jobDescription: z
    .string({
      required_error: 'Job description is required',
      invalid_type_error: 'Job description must be a string',
    })
    .trim()
    .min(15, 'Job description must be at least 15 characters long.')
    .max(15000, 'Job description must not exceed 15,000 characters.'),
  resumeText: z
    .string({ invalid_type_error: 'Resume text must be a string' })
    .trim()
    .min(20, 'Resume text must be at least 20 characters long.')
    .max(30000, 'Resume text is too large.')
    .optional(),
});

/**
 * Zod schema for validating, sanitizing, and formatting the AI analysis response.
 */
const resumeAnalysisOutputSchema = z.object({
  overallMatchScore: z.coerce
    .number()
    .min(0)
    .max(100)
    .default(70)
    .transform((val) => Math.round(val)),
  matchLevel: z
    .string()
    .default('Moderate Match')
    .transform((val) => {
      const clean = val.trim();
      return clean.length > 0 ? clean : 'Moderate Match';
    }),
  summary: z
    .string()
    .default('Analysis completed based on provided credentials.')
    .transform((val) => val.trim()),
  matchingSkills: z
    .array(
      z.object({
        skill: z.string().default('General Competency').transform((s) => s.trim()),
        evidence: z.string().default('').transform((e) => e.trim()),
        importance: z.string().default('High').transform((i) => i.trim()),
      })
    )
    .default([]),
  missingSkills: z
    .array(
      z.object({
        skill: z.string().default('Target Competency').transform((s) => s.trim()),
        importance: z.string().default('High').transform((i) => i.trim()),
        reason: z.string().default('Required by target job specification').transform((r) => r.trim()),
        recommendedRoadmapTopic: z
          .string()
          .default('')
          .transform((t) => t.trim()),
      })
    )
    .default([]),
  strengths: z
    .array(z.string().transform((s) => s.trim()))
    .default([]),
  weaknesses: z
    .array(z.string().transform((w) => w.trim()))
    .default([]),
  recommendedActionPlan: z
    .array(z.string().transform((a) => a.trim()))
    .default([]),
  suggestedQuestGoal: z
    .string()
    .default('')
    .transform((g) => g.trim()),
});

/**
 * Zod schema for Roadmap generation request.
 */
const roadmapGenerateRequestSchema = z.object({
  goal: z
    .string({
      required_error: 'Learning goal is required',
      invalid_type_error: 'Learning goal must be a string',
    })
    .trim()
    .min(3, 'Learning goal must be at least 3 characters long.')
    .max(300, 'Learning goal must not exceed 300 characters.'),
});

module.exports = {
  resumeAnalyzeRequestSchema,
  resumeAnalysisOutputSchema,
  roadmapGenerateRequestSchema,
};
