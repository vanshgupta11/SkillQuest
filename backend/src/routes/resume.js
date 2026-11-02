const express = require('express');
const multer = require('multer');
const { extractResumeText } = require('../utils/resumeExtractor');
const { analyzeResumeAgainstJD } = require('../services/geminiService');
const { resumeAnalyzeRequestSchema, resumeAnalysisOutputSchema } = require('../utils/schemas');

const router = express.Router();

// Multer memory storage configuration (Max 10MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.docx', '.doc', '.txt', '.html', '.htm', '.rtf', '.md'];
    const lowerName = file.originalname.toLowerCase();
    const isAllowedExt = allowedExtensions.some((ext) => lowerName.endsWith(ext));

    if (isAllowedExt || file.mimetype.includes('pdf') || file.mimetype.includes('word') || file.mimetype.includes('text')) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type. Please upload a PDF, DOCX, TXT, or HTML file.'));
    }
  },
});

/**
 * POST /api/resume/analyze
 * Extracts text from an uploaded resume using multer and compares it against
 * the provided Job Description (JD) using Gemini AI.
 * Uses Zod for input validation and output formatting.
 */
router.post('/analyze', upload.single('resume'), async (req, res) => {
  try {
    // 1. Zod input validation for job description and optional raw text
    const parsedInput = resumeAnalyzeRequestSchema.safeParse({
      jobDescription: req.body.jobDescription || req.body.jd,
      resumeText: req.body.resumeText,
    });

    if (!parsedInput.success) {
      const errorMsg = parsedInput.error.errors.map((e) => e.message).join(', ');
      return res.status(400).json({
        success: false,
        message: errorMsg,
        errors: parsedInput.error.format(),
      });
    }

    const { jobDescription } = parsedInput.data;
    let resumeText = '';
    let fileInfo = {
      fileName: 'Pasted Resume',
      fileType: 'Text',
      charCount: 0,
    };

    if (req.file) {
      const extracted = await extractResumeText(req.file);
      resumeText = extracted.text;
      fileInfo = {
        fileName: extracted.fileName,
        fileType: extracted.fileType,
        charCount: extracted.charCount,
      };
    } else if (parsedInput.data.resumeText) {
      resumeText = parsedInput.data.resumeText;
      fileInfo.charCount = resumeText.length;
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please upload a resume file (PDF, DOCX, TXT) or provide resume text.',
      });
    }

    console.log(`[Resume Analyzer] Analyzing resume (${fileInfo.fileName}, ${fileInfo.charCount} chars) against JD (${jobDescription.length} chars)...`);

    // 2. AI Execution
    const rawAnalysis = await analyzeResumeAgainstJD(resumeText, jobDescription);

    // 3. Zod formatting & sanitization of AI analysis output
    const parsedAnalysis = resumeAnalysisOutputSchema.safeParse(rawAnalysis);
    const finalAnalysis = parsedAnalysis.success ? parsedAnalysis.data : rawAnalysis;

    res.json({
      success: true,
      fileInfo,
      analysis: finalAnalysis,
    });
  } catch (err) {
    console.error('[Resume Analyzer] Error during analysis:', err.message);
    res.status(500).json({
      success: false,
      message: err.message || 'Failed to analyze resume against job description.',
    });
  }
});

module.exports = router;

