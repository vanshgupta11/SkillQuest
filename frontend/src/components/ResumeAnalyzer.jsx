import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import {
  FileText, Upload, Sparkles, CheckCircle2, AlertTriangle,
  ArrowRight, RefreshCw, X, Award, Target,
  Briefcase, ChevronRight, Zap, Check, AlertCircle, FileCheck,
  Loader2, BookOpen, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// Client-side Zod Schema for input validation & formatting
const resumeInputSchema = z.object({
  jobDescription: z
    .string()
    .trim()
    .min(15, 'Job Description must be at least 15 characters long.')
    .max(15000, 'Job description must not exceed 15,000 characters.')
    .transform((val) => val.replace(/\r\n/g, '\n').trim()),
  resumeText: z
    .string()
    .trim()
    .optional()
    .transform((val) => (val ? val.replace(/\r\n/g, '\n').trim() : '')),
  hasFile: z.boolean(),
}).refine((data) => data.hasFile || (data.resumeText && data.resumeText.length >= 20), {
  message: 'Please upload a resume file (PDF, DOCX, TXT) or paste at least 20 characters of resume text.',
  path: ['resumeText'],
});

const JD_PRESETS = [
  {
    title: 'Full Stack Engineer',
    description: `We are looking for a Senior Full Stack Engineer.
Requirements:
- 3+ years experience with React, TypeScript, Node.js, Express, and PostgreSQL/MongoDB.
- Proven experience with Docker, AWS cloud infrastructure (S3, ECS, Lambda), and CI/CD pipelines.
- Solid understanding of RESTful APIs, state management, caching (Redis), and automated testing.
- Strong problem-solving skills and experience in agile team environments.`,
  },
  {
    title: 'Frontend React Specialist',
    description: `Seeking a skilled Frontend Engineer.
Requirements:
- Strong proficiency in modern JavaScript/TypeScript, React 18+, Next.js, and Tailwind CSS.
- Experience with complex state management (Redux Toolkit, Zustand, or TanStack Query).
- Deep knowledge of web performance optimization, responsive layouts, and accessibility (a11y).
- Familiarity with Jest/Vitest unit testing and Cypress E2E testing.`,
  },
  {
    title: 'Backend & Cloud Architect',
    description: `Looking for a Backend & Cloud Engineer.
Requirements:
- 4+ years of backend development in Node.js, Go, or Python.
- Deep expertise with Kubernetes, Docker containerization, Helm, and microservices architecture.
- Experience architecting secure cloud solutions on AWS/GCP with Terraform and automated CI/CD.
- Experience designing high-throughput database schemas and distributed message queues (Kafka, RabbitMQ).`,
  },
];

export default function ResumeAnalyzer({ onSelectQuestGoal }) {
  const { getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const [file, setFile] = useState(null);
  const [pastedText, setPastedText] = useState('');
  const [useTextInput, setUseTextInput] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Modal state for Skill Gap Confirmation Popup
  const [selectedGap, setSelectedGap] = useState(null);
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    setError('');
    const validExtensions = ['.pdf', '.docx', '.doc', '.txt', '.html', '.htm', '.md'];
    const name = selectedFile.name.toLowerCase();
    const isValid = validExtensions.some((ext) => name.endsWith(ext));

    if (!isValid) {
      setError('Please upload a PDF, Word (DOCX), or Text file.');
      return;
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);
  };

  const handleAnalyze = async (e) => {
    e.preventDefault();
    setError('');

    // Zod client-side validation & string formatting
    const validation = resumeInputSchema.safeParse({
      jobDescription,
      resumeText: pastedText,
      hasFile: !!file && !useTextInput,
    });

    if (!validation.success) {
      const firstError = validation.error.errors[0]?.message || 'Please check your input.';
      setError(firstError);
      return;
    }

    const sanitizedData = validation.data;

    setAnalyzing(true);
    setResult(null);
    setAnalysisStep(1);

    const stepTimer1 = setTimeout(() => setAnalysisStep(2), 1200);
    const stepTimer2 = setTimeout(() => setAnalysisStep(3), 2600);

    try {
      const formData = new FormData();
      if (file && !useTextInput) {
        formData.append('resume', file);
      } else {
        formData.append('resumeText', sanitizedData.resumeText);
      }
      formData.append('jobDescription', sanitizedData.jobDescription);

      const res = await fetch('/api/resume/analyze', {
        method: 'POST',
        body: formData,
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to analyze resume.');
      }

      setResult(data);
    } catch (err) {
      setError(err.message || 'Error occurred during AI analysis.');
    } finally {
      setAnalyzing(false);
      setAnalysisStep(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setPastedText('');
    setJobDescription('');
    setResult(null);
    setError('');
    setSelectedGap(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Open confirmation modal when a skill gap is clicked
  const handleOpenGapModal = (gap) => {
    setSelectedGap(gap);
    setModalError('');
    setModalSuccess('');
  };

  const handleCloseModal = () => {
    if (generatingRoadmap) return;
    setSelectedGap(null);
    setModalError('');
    setModalSuccess('');
  };

  // Generate roadmap for the selected skill gap from the popup modal
  const handleConfirmGenerateRoadmap = async () => {
    if (!selectedGap) return;

    const targetGoal = selectedGap.recommendedRoadmapTopic || selectedGap.skill;
    setGeneratingRoadmap(true);
    setModalError('');
    setModalSuccess('');

    try {
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ goal: targetGoal }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to create roadmap path. Please check backend API keys.');
      }

      setModalSuccess(`Successfully created Quest path with ${data.roadmap?.modules?.length || 0} modules!`);

      setTimeout(() => {
        handleCloseModal();
        navigate('/roadmap');
      }, 1100);
    } catch (err) {
      setModalError(err.message || 'Failed to generate roadmap.');
    } finally {
      setGeneratingRoadmap(false);
    }
  };

  const score = result?.analysis?.overallMatchScore ?? 0;
  const scoreColor =
    score >= 75
      ? 'text-emerald-600 stroke-emerald-600'
      : score >= 50
      ? 'text-amber-500 stroke-amber-500'
      : 'text-rose-500 stroke-rose-500';

  const scoreBadgeBg =
    score >= 75
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : score >= 50
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-rose-50 text-rose-700 border-rose-200';

  return (
    <div className="bg-white rounded-2xl border border-zinc-200/90 shadow-sm overflow-hidden">
      {/* Header Banner */}
      <div className="p-6 border-b border-zinc-100 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white shadow-sm shrink-0">
              <FileCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold font-heading">AI Resume & Job Description Matcher</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-400/30">
                  Zod Validated · Multer Powered
                </span>
              </div>
              <p className="text-zinc-400 text-xs mt-0.5">
                Upload your resume to extract full text, evaluate match score, and uncover critical skill gaps against any JD.
              </p>
            </div>
          </div>
          {result && (
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-all border border-zinc-700 shrink-0 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Analyze Another
            </button>
          )}
        </div>
      </div>

      <div className="p-6 space-y-6">
        {!result ? (
          <form onSubmit={handleAnalyze} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column: Resume Upload */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-orange-600" />
                    1. Upload Resume File
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseTextInput(!useTextInput);
                      setError('');
                    }}
                    className="text-[11px] text-zinc-500 hover:text-zinc-800 underline transition-colors"
                  >
                    {useTextInput ? 'Switch to File Upload' : 'Paste text instead'}
                  </button>
                </div>

                {!useTextInput ? (
                  <div
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[190px] ${
                      dragActive
                        ? 'border-orange-500 bg-orange-50/50'
                        : file
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-zinc-200 hover:border-zinc-300 bg-zinc-50/50 hover:bg-zinc-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      id="resume-file-input"
                      name="resume"
                      accept=".pdf,.docx,.doc,.txt,.html,.htm,.md"
                      onChange={handleFileChange}
                      className="hidden"
                    />

                    {file ? (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
                          <CheckCircle2 className="w-6 h-6" />
                        </div>
                        <div className="font-semibold text-zinc-900 text-xs truncate max-w-[240px]">
                          {file.name}
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {(file.size / 1024).toFixed(1)} KB · Click or drag to replace
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = '';
                          }}
                          className="mt-1 px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 rounded-md transition-colors inline-flex items-center gap-1"
                        >
                          <X className="w-3 h-3" /> Remove
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
                          <Upload className="w-6 h-6" />
                        </div>
                        <div className="text-xs font-semibold text-zinc-800">
                          Click to browse or drop your resume here
                        </div>
                        <div className="text-[11px] text-zinc-400">
                          Supports PDF, DOCX, Word, TXT, HTML (Max 10MB)
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <textarea
                      id="resume-text-input"
                      rows={7}
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Paste the full text or HTML of your resume here..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400 font-mono resize-none"
                    />
                    <div className="text-[11px] text-zinc-400 text-right mt-1">
                      {pastedText.length} characters
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Job Description */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-orange-600" />
                    2. Target Job Description (JD)
                  </label>
                  <span className="text-[11px] text-zinc-400">
                    {jobDescription.length} chars
                  </span>
                </div>

                <textarea
                  id="jd-text-input"
                  rows={6}
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the target job description requirements, role qualifications, and tech stack here..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 text-zinc-900 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400 resize-none min-h-[140px]"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-zinc-400 mr-1">Quick Sample:</span>
                  {JD_PRESETS.map((preset) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => setJobDescription(preset.description)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-[11px] font-medium transition-colors"
                    >
                      + {preset.title}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-end">
              <button
                type="submit"
                id="analyze-resume-btn"
                disabled={analyzing || (!file && !pastedText.trim()) || !jobDescription.trim()}
                className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all hover:scale-[1.01] active:scale-95"
              >
                {analyzing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {analysisStep === 1
                      ? 'Extracting Resume Text via Multer…'
                      : analysisStep === 2
                      ? 'Evaluating Technical Requirements…'
                      : 'Synthesizing Match Score & Skill Gaps…'}
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    Run AI Fit & Skill Gap Analysis
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Results View */
          <div className="space-y-6 animate-fadeIn">
            {/* Top Score Banner */}
            <div className="p-6 rounded-2xl bg-zinc-50 border border-zinc-200/80 flex flex-col md:flex-row items-center gap-6">
              {/* Circular Meter */}
              <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-zinc-200"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={scoreColor}
                    strokeDasharray={`${score}, 100`}
                    strokeLinecap="round"
                    strokeWidth="3.5"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold font-heading text-zinc-900 leading-none">
                    {score}%
                  </span>
                  <span className="text-[10px] font-semibold text-zinc-400 mt-0.5 uppercase tracking-wider">
                    Match
                  </span>
                </div>
              </div>

              {/* Summary and Match Tag */}
              <div className="flex-1 min-w-0 space-y-2 text-center md:text-left">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${scoreBadgeBg}`}>
                    {result.analysis.matchLevel || (score >= 75 ? 'Strong Match' : score >= 50 ? 'Moderate Match' : 'Growth Opportunity')}
                  </span>
                  <span className="text-xs text-zinc-400 font-medium">
                    Parsed from: <strong className="text-zinc-700">{result.fileInfo?.fileName}</strong> ({result.fileInfo?.charCount?.toLocaleString()} chars)
                  </span>
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">
                  {result.analysis.summary}
                </p>
              </div>

              {/* Action: Bridge to Quest Generator */}
              {result.analysis.suggestedQuestGoal && (
                <div className="shrink-0">
                  <button
                    onClick={() => {
                      handleOpenGapModal({
                        skill: result.analysis.suggestedQuestGoal,
                        importance: 'High',
                        reason: 'Target skill set identified to maximize job fit and eliminate core gaps.',
                        recommendedRoadmapTopic: result.analysis.suggestedQuestGoal,
                      });
                    }}
                    className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-95"
                  >
                    <Zap className="w-3.5 h-3.5" /> Bridge Missing Skills
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Two Column Grid: Matched Skills vs Missing Skills */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Matched Skills */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Matching Strengths & Skills ({result.analysis.matchingSkills?.length || 0})
                </h3>
                <div className="space-y-2">
                  {result.analysis.matchingSkills?.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-emerald-50/40 border border-emerald-200/70 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          {item.skill}
                        </span>
                        {item.importance && (
                          <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                            {item.importance} Priority
                          </span>
                        )}
                      </div>
                      {item.evidence && (
                        <p className="text-[11px] text-zinc-500 italic pl-5">
                          "{item.evidence}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Missing Skills / Skills Gap (Clickable with Modal) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Identified Skill Gaps ({result.analysis.missingSkills?.length || 0})
                  </h3>
                  <span className="text-[10px] text-zinc-400 font-medium">Click any gap to create quest</span>
                </div>

                <div className="space-y-2.5">
                  {result.analysis.missingSkills?.map((item, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleOpenGapModal(item)}
                      className="p-3.5 rounded-xl bg-amber-50/40 hover:bg-amber-50/80 border border-amber-200/70 hover:border-amber-300/90 transition-all duration-200 cursor-pointer group shadow-2xs hover:shadow-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-zinc-900 flex items-center gap-1.5 group-hover:text-orange-600 transition-colors">
                          <ChevronRight className="w-3.5 h-3.5 text-amber-500 group-hover:translate-x-0.5 transition-transform shrink-0" />
                          {item.skill}
                        </span>
                        <div className="flex items-center gap-2">
                          {item.importance && (
                            <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md">
                              {item.importance} Gap
                            </span>
                          )}
                          <span className="text-[10px] font-bold text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                            Build Path <ArrowRight className="w-3 h-3" />
                          </span>
                        </div>
                      </div>
                      {item.reason && (
                        <p className="text-[11px] text-zinc-600 pl-5">
                          {item.reason}
                        </p>
                      )}
                      {item.recommendedRoadmapTopic && (
                        <div className="pl-5 pt-0.5">
                          <span className="text-[11px] font-semibold text-orange-600 group-hover:underline inline-flex items-center gap-1">
                            <Target className="w-3 h-3" /> Curriculum Topic: "{item.recommendedRoadmapTopic}"
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Strengths & Recommendations Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Key Candidate Strengths */}
              {result.analysis.strengths?.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-orange-600" /> Key Candidate Highlights
                  </h4>
                  <ul className="space-y-1.5 pl-1">
                    {result.analysis.strengths.map((s, i) => (
                      <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                        <span className="text-orange-500 font-bold">•</span>
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actionable Improvement Steps */}
              {result.analysis.recommendedActionPlan?.length > 0 && (
                <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200/70 space-y-2">
                  <h4 className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-orange-600" /> Recommended Action Plan
                  </h4>
                  <ul className="space-y-1.5 pl-1">
                    {result.analysis.recommendedActionPlan.map((step, i) => (
                      <li key={i} className="text-xs text-zinc-600 flex items-start gap-2">
                        <span className="text-orange-500 font-bold">{i + 1}.</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Confirmation Modal Popup ────────────────────────────────────────── */}
      {selectedGap && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs animate-fadeIn">
          <div
            className="bg-white rounded-2xl border border-zinc-200 shadow-xl max-w-lg w-full overflow-hidden animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-zinc-900 to-zinc-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading">Generate Learning Quest Path</h3>
                  <p className="text-[11px] text-zinc-400">Bridge identified gap with personalized modules</p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                disabled={generatingRoadmap}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-700/50 transition-colors disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-zinc-900">
                    {selectedGap.skill}
                  </span>
                  {selectedGap.importance && (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md">
                      {selectedGap.importance} Gap
                    </span>
                  )}
                </div>
                {selectedGap.reason && (
                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {selectedGap.reason}
                  </p>
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/80 space-y-1">
                <div className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Target Curriculum Topic:
                </div>
                <div className="text-xs font-bold text-zinc-900 flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                  "{selectedGap.recommendedRoadmapTopic || selectedGap.skill}"
                </div>
              </div>

              <p className="text-xs text-zinc-500 leading-relaxed">
                Would you like to build an adaptive learning roadmap with curated study modules, interactive documentation, and video tutorials for this topic?
              </p>

              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {modalSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{modalSuccess} Redirecting to Quest Path…</span>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-zinc-50 border-t border-zinc-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={generatingRoadmap}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 border border-zinc-200 text-zinc-700 font-semibold text-xs transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerateRoadmap}
                disabled={generatingRoadmap}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
              >
                {generatingRoadmap ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating Quest & Modules…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Yes, Build Quest Path
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
