import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  BookOpen, CheckCircle, ExternalLink, ArrowLeft,
  FileText, HelpCircle, Youtube, Loader2, Zap,
  Sparkles, Code, Check, Copy, Brain, Layers, Shield,
  Award, Clock, CheckCircle2, ChevronRight, AlertTriangle,
  Lightbulb, Database, RefreshCw, Radio
} from 'lucide-react';
import XpToast from '../components/XpToast';
import { useAuth } from '../context/AuthContext';

export default function CourseDetailPage() {
  const { id } = useParams();
  const { getAuthHeaders } = useAuth();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  const [toast, setToast] = useState({
    show: false, xpGained: 0, breakdown: {}, streakDays: 0, newLevel: 1, levelUp: false,
  });
  const [prevLevel, setPrevLevel] = useState(1);
  const [feedbackBanners, setFeedbackBanners] = useState([]);

  const fetchCourseData = (force = false) => {
    setLoading(true);
    const url = `/api/course/${id}${force ? '?forceRefresh=true' : ''}`;
    fetch(url, { headers: getAuthHeaders() })
      .then((r) => r.json())
      .then((d) => {
        setCourse(d.course);
        if (d.course?.isCompleted) setCompleted(true);
        setLoading(false);
      })
      .catch(() => {
        setCourse({
          _id: id,
          title: `Module ${id}: Production Architecture & System Design`,
          description: 'Comprehensive study guide calibrated to your engineering tier.',
          difficulty: 'Intermediate',
          userTier: 'Intermediate',
          summary: 'In-depth exploration of core design patterns, clean abstractions, and resilience models for production-scale software.',
          keyConcepts: [
            {
              heading: '1. Modular Architecture & Mental Models',
              explanation: 'Decoupling application logic into cohesive boundaries prevents ripple effects across features. Understanding the flow of data across boundaries guarantees testability and long-term maintainability.',
              subpoints: ['Single responsibility boundaries', 'Predictable data lifecycle stages', 'Minimizing side-effect propagation'],
              practicalTakeaway: 'Design modules with well-defined interface contracts before adding complex features.',
            },
            {
              heading: '2. Immutable State Transitions & Race Conditions',
              explanation: 'Unpredictable state mutations lead to elusive production bugs. Immutable updates guarantee that every transition produces a deterministic snapshot.',
              subpoints: ['Eliminating direct object mutations', 'Handling asynchronous race conditions', 'Normalization of nested data structures'],
              practicalTakeaway: 'Always treat state as read-only and dispatch explicit transitions.',
            },
            {
              heading: '3. Defensive Boundary Validation & Error Resilience',
              explanation: 'Systems must fail gracefully. Boundary schemas guarantee that malformed external inputs never contaminate internal domain handlers.',
              subpoints: ['Schema validation with Zod or type guards', 'Graceful circuit-breaking on external API degradation', 'Structured diagnostic logging'],
              practicalTakeaway: 'Validate inputs at the edge of the system and fail fast with clear errors.',
            },
            {
              heading: '4. Performance Profiling & Resource Hygiene',
              explanation: 'Resource leaks degrade throughput over time. Proper lifecycle hygiene ensures unmounted resources, timers, and connections are cleanly disposed.',
              subpoints: ['CPU hot-path optimization', 'Disposing listeners and subscriptions during unmount', 'Strategic caching at HTTP and memory layers'],
              practicalTakeaway: 'Always pair resource allocation with explicit teardown handlers.',
            },
          ],
          bestPractices: [
            'Separate transport and UI logic completely from domain business rules.',
            'Enforce automated boundary schema validation on all incoming external data.',
            'Dispose of event listeners, sockets, and timers in cleanup functions.',
            'Maintain continuous automated test coverage for critical data transformations.',
          ],
          commonPitfalls: [
            'Mutating objects in-place, causing missed updates and erratic rendering.',
            'Catching exceptions silently without logging contextual error metadata.',
            'Prematurely over-abstracting architectures before requirements stabilize.',
          ],
          codeExample: `// Production Implementation Example\nexport class ResilientModuleService {\n  constructor(config = {}) {\n    this.timeoutMs = config.timeoutMs || 5000;\n    this.cache = new Map();\n  }\n\n  async execute(key, payload) {\n    if (!key) throw new Error("Key is required");\n    if (this.cache.has(key)) return this.cache.get(key);\n\n    const data = await this._process(payload);\n    this.cache.set(key, data);\n    return data;\n  }\n}`,
          codeExplanation: 'Encapsulates data operations with caching guards, timeout limits, and clean validation.',
          quiz: [
            {
              id: 1,
              question: 'Why should business logic be separated from UI/transport layers?',
              options: ['To isolate core rules and allow independent testing', 'To make files larger', 'To avoid using functions', 'To bypass validation'],
              answer: 'To isolate core rules and allow independent testing',
              explanation: 'Separating concerns keeps business rules decoupled from presentation and infrastructure, making code modular and easily testable.',
            },
            {
              id: 2,
              question: 'What is the main benefit of immutable state management?',
              options: ['Deterministic snapshots and elimination of hidden mutation bugs', 'Faster file downloads', 'Decreased CPU memory', 'Zero network calls'],
              answer: 'Deterministic snapshots and elimination of hidden mutation bugs',
              explanation: 'Immutable states prevent unintended mutations and guarantee deterministic transitions across asynchronous lifecycles.',
            },
          ],
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCourseData();
  }, [id]);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleQuizOptionSelect = (questionId, optionValue) => {
    if (quizSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionValue }));
  };

  const handleMarkComplete = useCallback(async (quizScoreToSubmit = 100) => {
    if (completing || completed) return;
    setCompleting(true);

    try {
      const res = await fetch('/api/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ moduleId: id, quizScore: quizScoreToSubmit }),
      });
      const data = await res.json();

      if (data.alreadyCompleted) {
        setCompleted(true);
        setCompleting(false);
        return;
      }

      const { xpGained, breakdown, streak, user, feedback } = data;
      const levelUp = user?.level > prevLevel;
      setPrevLevel(user?.level ?? 1);
      setCompleted(true);
      setQuizSubmitted(true);
      setCompleting(false);

      const banners = [];
      if (feedback?.tierUpgraded) banners.push({ type: 'tier-up', msg: `🚀 Tier Upgraded! Advanced from ${feedback.oldTier} to ${feedback.newTier}.` });
      if (feedback?.tierDowngraded) banners.push({ type: 'tier-down', msg: `📉 Tier Adjusted: Moved from ${feedback.oldTier} to ${feedback.newTier}.` });
      if (feedback?.nextModuleUpgraded) banners.push({ type: 'next-up', msg: `⚡ High Score! Next module "${feedback.nextModuleTitle}" upgraded to ${feedback.newNextDifficulty}.` });
      if (feedback?.remedialCreated) banners.push({ type: 'remedial', msg: `📚 Remedial review module "${feedback.remedialTitle}" inserted into path.` });
      setFeedbackBanners(banners);

      setToast({ show: true, xpGained: xpGained ?? 0, breakdown: breakdown ?? {}, streakDays: streak?.streakDays ?? user?.streakDays ?? 0, newLevel: user?.level ?? 1, levelUp });
    } catch {
      setCompleted(true);
      setCompleting(false);
      setToast({ show: true, xpGained: 15, breakdown: { formula: '10 × 1.5 × 1.0 = 15 XP (offline)' }, streakDays: 1, newLevel: 1, levelUp: false });
    }
  }, [id, completing, completed, prevLevel]);

  const handleCalculateQuizScore = () => {
    if (!course?.quiz || course.quiz.length === 0) {
      handleMarkComplete(100);
      return;
    }
    let correctCount = 0;
    course.quiz.forEach((q) => {
      const selected = selectedAnswers[q.id];
      if (selected && (selected === q.answer || selected.toLowerCase() === String(q.answer).toLowerCase())) {
        correctCount++;
      }
    });
    const scorePercentage = Math.round((correctCount / course.quiz.length) * 100);
    setQuizScore(scorePercentage);
    setQuizSubmitted(true);
    handleMarkComplete(scorePercentage > 0 ? scorePercentage : 75);
  };

  const dismissToast = useCallback(() => setToast((t) => ({ ...t, show: false })), []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600 mx-auto mb-3" />
        <div className="text-slate-800 font-bold text-sm">Loading Detailed Study Module…</div>
        <div className="text-slate-400 text-xs mt-1">Checking database storage and synthesizing comprehensive concepts</div>
      </div>
    );
  }

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <>
      <XpToast
        show={toast.show}
        xpGained={toast.xpGained}
        breakdown={toast.breakdown}
        streakDays={toast.streakDays}
        newLevel={toast.newLevel}
        levelUp={toast.levelUp}
        onDismiss={dismissToast}
      />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">

        {/* Back Navigation & Database Persisted Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            to="/roadmap"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors bg-white px-3.5 py-2 rounded-xl border border-slate-200/90 shadow-xs w-fit"
          >
            <ArrowLeft className="w-4 h-4 text-orange-600" /> Back to Quest Path
          </Link>

          <div className="flex items-center gap-2.5 flex-wrap">
            <Link
              to="/rooms"
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-orange-950 text-xs font-bold hover:border-orange-300 transition-all shadow-xs"
            >
              <Radio className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
              <span>Study in Community Lounge</span>
            </Link>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
              <Database className="w-3.5 h-3.5 text-emerald-600" /> Stored in Database
            </span>

            <span className="text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200/80 px-3 py-1 rounded-full flex items-center gap-1 shadow-xs">
              <Zap className="w-3.5 h-3.5 fill-amber-500" /> +50 XP on Quiz Completion
            </span>
          </div>
        </div>

        {/* Feedback Banners */}
        {feedbackBanners.length > 0 && (
          <div className="space-y-2.5">
            {feedbackBanners.map((banner, i) => (
              <div
                key={i}
                className="p-4 rounded-xl border text-xs font-bold flex items-center gap-3 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200 text-orange-950 shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                <span className="leading-relaxed flex-1">{banner.msg}</span>
                <button
                  onClick={() => setFeedbackBanners((bs) => bs.filter((_, j) => j !== i))}
                  className="opacity-50 hover:opacity-100 text-xs shrink-0 p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Header Hero Card */}
        <div className="card-modern-elevated p-6 sm:p-8 bg-white relative overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <Brain className="w-3.5 h-3.5 text-orange-600" />
                Adaptive ({course?.userTier || 'Standard'} Tier)
              </span>

              {course?.isRemedial && (
                <span className="px-3 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-xs font-bold">
                  Remedial Calibration
                </span>
              )}

              <span className="px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                {course?.difficulty || 'Intermediate'} Difficulty
              </span>
            </div>

            {completed && (
              <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" /> Completed &amp; XP Claimed
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 leading-tight font-heading">
            {course?.title}
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed max-w-3xl">
            {course?.summary || course?.description}
          </p>
        </div>

        {/* In-Depth Key Concepts Section (5 Detailed Points) */}
        {course?.keyConcepts?.length > 0 && (
          <div className="card-modern-elevated p-6 sm:p-8 bg-white space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-orange-600" /> In-Depth Architecture &amp; Core Principles
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  Detailed technical breakdown calibrated for {course?.userTier || 'Standard'} tier engineers.
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200/80">
                {course.keyConcepts.length} Deep Concepts
              </span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {course.keyConcepts.map((concept, idx) => (
                <div key={idx} className="p-5 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-3 transition-all hover:bg-slate-50 hover:border-slate-300">
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-xl bg-orange-600 text-white text-xs flex items-center justify-center font-extrabold shrink-0 shadow-xs mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 font-heading">
                        {concept.heading}
                      </h3>
                      <p className="text-slate-600 text-xs sm:text-sm leading-relaxed mt-1.5">
                        {concept.explanation}
                      </p>
                    </div>
                  </div>

                  {/* Subpoints Bullet List */}
                  {concept.subpoints && concept.subpoints.length > 0 && (
                    <div className="pl-10 space-y-1.5">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Core Tenets:
                      </div>
                      <ul className="space-y-1">
                        {concept.subpoints.map((pt, pIdx) => (
                          <li key={pIdx} className="text-xs text-slate-700 flex items-start gap-2">
                            <span className="text-orange-500 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Practical Takeaway Badge */}
                  {concept.practicalTakeaway && (
                    <div className="ml-10 p-2.5 rounded-xl bg-orange-50/80 border border-orange-200 text-orange-950 text-xs font-semibold flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>Takeaway: {concept.practicalTakeaway}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Best Practices & Common Pitfalls Grid */}
        {((course?.bestPractices && course.bestPractices.length > 0) || (course?.commonPitfalls && course.commonPitfalls.length > 0)) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Best Practices */}
            {course?.bestPractices?.length > 0 && (
              <div className="card-modern-elevated p-6 bg-white space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2 text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Production Best Practices
                </h3>
                <ul className="space-y-2">
                  {course.bestPractices.map((bp, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2.5 p-2 rounded-lg bg-emerald-50/50 border border-emerald-100">
                      <span className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">✓</span>
                      <span className="leading-relaxed font-medium">{bp}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Common Pitfalls */}
            {course?.commonPitfalls?.length > 0 && (
              <div className="card-modern-elevated p-6 bg-white space-y-3.5">
                <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2 text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Common Anti-Patterns to Avoid
                </h3>
                <ul className="space-y-2">
                  {course.commonPitfalls.map((pit, i) => (
                    <li key={i} className="text-xs text-slate-700 flex items-start gap-2.5 p-2 rounded-lg bg-rose-50/50 border border-rose-100">
                      <span className="w-4 h-4 rounded-full bg-rose-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">✕</span>
                      <span className="leading-relaxed font-medium">{pit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Practical Code Implementation Snippet */}
        {course?.codeExample && (
          <div className="card-modern-elevated p-6 bg-white overflow-hidden space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                <Code className="w-4 h-4 text-orange-600" /> Reference Implementation ({course?.userTier} Tier)
              </h2>
              <button
                onClick={() => handleCopyCode(course.codeExample)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors shadow-xs"
              >
                {copiedCode ? (
                  <><Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" /> Copied!</>
                ) : (
                  <><Copy className="w-3.5 h-3.5" /> Copy Code</>
                )}
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
              <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>service.js</span>
                <span>JavaScript / ES6+</span>
              </div>
              <pre className="p-5 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed">
                <code>{course.codeExample}</code>
              </pre>
            </div>

            {course?.codeExplanation && (
              <p className="text-xs text-slate-500 leading-relaxed pt-1">
                <strong className="text-slate-700">Code Architecture Breakdown:</strong> {course.codeExplanation}
              </p>
            )}
          </div>
        )}

        {/* Curated Resources & Knowledge Check Quiz Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Curated Video Resources */}
          <div className="lg:col-span-1 card-modern-elevated p-6 bg-white space-y-4">
            <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-600" /> Curated Resources
            </h2>
            <div className="space-y-3">
              {course?.resources?.map((res, i) => {
                const isYT = res.source === 'YouTube' || res.url?.includes('youtube.com') || res.url?.includes('youtu.be');
                return (
                  <a
                    key={i}
                    href={res.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 hover:bg-white flex items-center justify-between group transition-all shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-xs ${
                        isYT ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-orange-50 border border-orange-200 text-orange-600'
                      }`}>
                        {isYT ? <Youtube className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors line-clamp-1">
                          {res.title}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium uppercase mt-0.5">
                          {res.source || 'Study Resource'}
                        </div>
                      </div>
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 transition-colors shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>

          {/* Knowledge Check Quiz (Interactive with Detailed Explanations) */}
          <div className="lg:col-span-2 card-modern-elevated p-6 bg-white space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
                <HelpCircle className="w-4 h-4 text-amber-500" /> Comprehensive Knowledge Check
              </h2>
              <div className="flex items-center gap-2">
                <Link
                  to={`/quiz/${id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                  <span>Timed 10Q AI Mode</span>
                </Link>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {course?.quiz?.length || 0} Questions
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {course?.quiz?.map((q, idx) => {
                const userSelected = selectedAnswers[q.id];
                const isCorrect = userSelected && (userSelected === q.answer || userSelected.toLowerCase() === String(q.answer).toLowerCase());

                return (
                  <div key={q.id || idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-3">
                    <div className="font-bold text-slate-800 leading-relaxed flex items-start gap-2">
                      <span className="text-orange-600 font-extrabold shrink-0">Q{idx + 1}:</span>
                      <span>{q.question}</span>
                    </div>

                    {q.options && q.options.length > 0 ? (
                      <div className="space-y-2">
                        {q.options.map((opt, oIdx) => {
                          const isSel = userSelected === opt;
                          let btnStyle = 'bg-white border-slate-200 text-slate-700 hover:border-slate-300';

                          if (quizSubmitted) {
                            if (opt === q.answer) {
                              btnStyle = 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold';
                            } else if (isSel) {
                              btnStyle = 'bg-rose-50 border-rose-300 text-rose-900 font-semibold';
                            }
                          } else if (isSel) {
                            btnStyle = 'bg-orange-50 border-orange-400 text-orange-950 font-bold shadow-xs';
                          }

                          return (
                            <button
                              key={oIdx}
                              disabled={quizSubmitted}
                              onClick={() => handleQuizOptionSelect(q.id, opt)}
                              className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-2.5 ${btnStyle}`}
                            >
                              <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 ${
                                isSel ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}>
                                {optionLetters[oIdx] || oIdx + 1}
                              </span>
                              <span className="flex-1 leading-relaxed">{opt}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-orange-900 font-mono bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200 text-xs">
                        Correct Answer: {q.answer}
                      </div>
                    )}

                    {/* Show explanation after quiz submission */}
                    {quizSubmitted && q.explanation && (
                      <div className={`p-2.5 rounded-lg border text-[11px] leading-relaxed mt-2 ${
                        isCorrect ? 'bg-emerald-50/70 border-emerald-200 text-emerald-800' : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}>
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!completed && !quizSubmitted ? (
              <button
                onClick={handleCalculateQuizScore}
                disabled={completing}
                className="w-full py-3 rounded-xl btn-primary-gradient disabled:opacity-60 text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
              >
                {completing ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Evaluating Responses…</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Submit Quiz &amp; Claim XP Bounty</>
                )}
              </button>
            ) : (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center flex items-center justify-center gap-2 shadow-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                <span>Quiz Evaluated! Score: {quizScore !== null ? `${quizScore}%` : 'Passed'} — Progress Recorded</span>
              </div>
            )}

            {/* Peer Review Callout */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50 border border-orange-200/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-600 text-white flex items-center justify-center shrink-0">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold text-slate-800 block">Built a project for this module?</span>
                  <span className="text-[11px] text-slate-500">Submit your GitHub repo or demo to community peer review and earn +60 Karma XP!</span>
                </div>
              </div>
              <Link
                to="/peer-review"
                className="px-3.5 py-2 rounded-xl bg-white border border-orange-200 text-orange-700 font-bold hover:bg-orange-50 transition-colors whitespace-nowrap shadow-xs"
              >
                Go to Peer Showcase
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
