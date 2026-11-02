const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract clean readable text from an uploaded resume file buffer.
 * Supports PDF, DOCX, DOC, TXT, HTML, and Markdown.
 *
 * @param {Object} file - Multer file object ({ buffer, originalname, mimetype })
 * @returns {Promise<{ text: string, charCount: number, fileType: string }>}
 */
async function extractResumeText(file) {
  if (!file || !file.buffer) {
    throw new Error('No resume file uploaded.');
  }

  const mime = (file.mimetype || '').toLowerCase();
  const filename = (file.originalname || '').toLowerCase();
  let extractedText = '';
  let fileType = 'Unknown';

  // 1. PDF Documents
  if (mime.includes('pdf') || filename.endsWith('.pdf')) {
    fileType = 'PDF';
    try {
      const parser = new PDFParse({ data: file.buffer });
      const parseResult = await parser.getText();
      if (typeof parseResult === 'string') {
        extractedText = parseResult;
      } else if (parseResult && parseResult.text) {
        extractedText = parseResult.text;
      }
    } catch (err) {
      console.warn('[Resume Extractor] PDFParse failed, trying raw text fallback:', err.message);
      extractedText = file.buffer.toString('utf-8');
    }
  }

  // 2. Word Documents (DOCX / DOC)
  else if (
    mime.includes('wordprocessingml') ||
    mime.includes('msword') ||
    filename.endsWith('.docx') ||
    filename.endsWith('.doc')
  ) {
    fileType = 'DOCX';
    try {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      extractedText = result.value || '';
    } catch (err) {
      console.warn('[Resume Extractor] Mammoth DOCX parsing failed:', err.message);
      extractedText = file.buffer.toString('utf-8');
    }
  }

  // 3. Plain Text, HTML, RTF, Markdown
  else {
    fileType = filename.endsWith('.html') || filename.endsWith('.htm') ? 'HTML' : 'Text';
    extractedText = file.buffer.toString('utf-8');
  }

  // Clean and normalize text
  const cleanedText = (extractedText || '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!cleanedText || cleanedText.length < 20) {
    throw new Error(
      'Unable to extract meaningful text from the uploaded file. Please ensure the file is not scanned/empty or try uploading a PDF, DOCX, or text file.'
    );
  }

  return {
    text: cleanedText,
    charCount: cleanedText.length,
    fileType,
    fileName: file.originalname || 'resume',
  };
}

module.exports = { extractResumeText };
