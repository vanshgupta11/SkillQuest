import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Brain, CheckCircle2, XCircle, ChevronRight, ChevronLeft,
  Loader2, Zap, Clock, Trophy, RefreshCw, ArrowLeft,
  Sparkles, Target, BarChart2, BookOpen, AlertTriangle,
  Check, X, Star, TrendingUp, Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import XpToast from '../components/XpToast';

// ── Timer Hook ───────────────────────────────────────────────────────────────
function useCountdown(initialSeconds, onExpire) {
  const [seconds, setSeconds] = useState(initialSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);

  const start = useCallback(() => setRunning(true), []);
  const stop = useCallback(() => setRunning(false), []);
  const reset = useCallback((s = initialSeconds) => { setSeconds(s); setRunning(false); }, [initialSeconds]);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          setRunning(false);
          onExpire?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, onExpire]);

  return { seconds, running, start, stop, reset };
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
function ProgressRing({ percent, size = 64, stroke = 5, color = '#f97316' }) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
    </svg>
  );
}

// ── Score Gauge ───────────────────────────────────────────────────────────────
function ScoreCard({ score, total, correct, timeTaken, difficulty }) {
  const pct = Math.round((correct / total) * 100);
  const grade = pct >= 90 ? { label: 'Excellent!', color: 'emerald', emoji: '🏆' }
    : pct >= 75 ? { label: 'Great Job!', color: 'orange', emoji: '🎯' }
    : pct >= 50 ? { label: 'Good Effort!', color: 'amber', emoji: '📈' }
    : { label: 'Keep Practicing', color: 'rose', emoji: '💪' };

  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;

  return (
    <div className="text-center">
      <div className="relative inline-flex items-center justify-center mb-4">
        <ProgressRing
          percent={pct}
          size={140}
          stroke={10}
          color={pct >= 75 ? '#22c55e' : pct >= 50 ? '#f97316' : '#ef4444'}
        />
        <div className="absolute flex flex-col items-center">
          <span className="text-3xl font-extrabold text-slate-900">{pct}%</span>
          <span className="text-xs font-bold text-slate-500">{correct}/{total}</span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-2">
        <span className="text-2xl">{grade.emoji}</span>
        <h2 className="text-xl font-extrabold text-slate-900 font-heading">{grade.label}</h2>
      </div>

      <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold">
          <Check className="w-3.5 h-3.5" /> {correct} Correct
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          <X className="w-3.5 h-3.5" /> {total - correct} Wrong
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold">
          <Clock className="w-3.5 h-3.5" /> {mins}m {secs}s
        </div>
      </div>
    </div>
  );
}

// ── Main Quiz Page ────────────────────────────────────────────────────────────
export default function QuizPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getAuthHeaders } = useAuth();

  const [quiz, setQuiz] = useState([]);
  const [moduleTitle, setModuleTitle] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [userTier, setUserTier] = useState('Beginner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Quiz state
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState({}); // { [questionId]: selectedOption }
  const [phase, setPhase] = useState('quiz'); // 'quiz' | 'review' | 'results'
  const [startTime, setStartTime] = useState(null);
  const [timeTaken, setTimeTaken] = useState(0);

  const [toast, setToast] = useState({ show: false, xpGained: 0, breakdown: {}, streakDays: 0, newLevel: 1, levelUp: false });

  const SECONDS_PER_QUESTION = 45;
  const handleTimerExpire = useCallback(() => {
    // Auto-move to next question
    setCurrentQ((q) => {
      if (q < quiz.length - 1) return q + 1;
      handleFinishQuiz();
      return q;
    });
  }, [quiz.length]);

  const timer = useCountdown(SECONDS_PER_QUESTION, handleTimerExpire);

  const fetchQuiz = async (forceNew = false) => {
    setLoading(true);
    setError(null);
    try {
      const url = `/api/course/${id}/quiz?count=10${forceNew ? '&forceNew=true' : ''}`;
      const res = await fetch(url, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error('Failed to load quiz');
      const data = await res.json();
      setQuiz(data.quiz || []);
      setModuleTitle(data.moduleTitle || 'Module Quiz');
      setDifficulty(data.difficulty || 'Beginner');
      setUserTier(data.userTier || 'Beginner');
      setAnswers({});
      setCurrentQ(0);
      setPhase('quiz');
      setStartTime(Date.now());
      timer.reset(SECONDS_PER_QUESTION);
      timer.start();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuiz(); }, [id]);

  const handleAnswer = (questionId, option) => {
    if (answers[questionId]) return; // already answered
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleNext = () => {
    if (currentQ < quiz.length - 1) {
      setCurrentQ((q) => q + 1);
      timer.reset(SECONDS_PER_QUESTION);
      timer.start();
    } else {
      handleFinishQuiz();
    }
  };

  const handlePrev = () => {
    if (currentQ > 0) {
      setCurrentQ((q) => q - 1);
      timer.reset(SECONDS_PER_QUESTION);
      timer.start();
    }
  };

  const handleFinishQuiz = useCallback(async () => {
    timer.stop();
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    setTimeTaken(elapsed);

    const correct = quiz.filter((q) => {
      const selected = answers[q.id];
      return selected && (selected === q.answer || selected.toLowerCase() === q.answer?.toLowerCase());
    }).length;
    const scorePercent = Math.round((correct / quiz.length) * 100);

    setPhase('results');

    // Submit completion + XP
    try {
      const res = await fetch('/api/progress/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ moduleId: id, quizScore: scorePercent }),
      });
      const data = await res.json();
      if (!data.alreadyCompleted) {
        setToast({
          show: true,
          xpGained: data.xpGained ?? 0,
          breakdown: data.breakdown ?? {},
          streakDays: data.streak?.streakDays ?? 0,
          newLevel: data.user?.level ?? 1,
          levelUp: false,
        });
      }
    } catch { /* silent — quiz still shows */ }
  }, [quiz, answers, startTime, id, timer]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-xl animate-pulse">
            <Brain className="w-8 h-8" />
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 text-sm">Generating AI Quiz…</p>
            <p className="text-xs text-slate-400 mt-1">Calibrating questions to your tier</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-sm">
          <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="font-semibold text-rose-700 text-sm mb-4">{error}</p>
          <button onClick={() => fetchQuiz()} className="px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold">Retry</button>
        </div>
      </div>
    );
  }

  const q = quiz[currentQ];
  const optionLetters = ['A', 'B', 'C', 'D'];
  const correctCount = quiz.filter((qq) => {
    const sel = answers[qq.id];
    return sel && (sel === qq.answer || sel.toLowerCase() === qq.answer?.toLowerCase());
  }).length;
  const scorePercent = quiz.length > 0 ? Math.round((correctCount / quiz.length) * 100) : 0;

  const difficultyColors = {
    Beginner: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Intermediate: 'bg-amber-100 text-amber-800 border-amber-200',
    Advanced: 'bg-purple-100 text-purple-800 border-purple-200',
  };

  // ── Results Phase ──
  if (phase === 'results') {
    return (
      <>
        <XpToast
          show={toast.show} xpGained={toast.xpGained} breakdown={toast.breakdown}
          streakDays={toast.streakDays} newLevel={toast.newLevel} levelUp={toast.levelUp}
          onDismiss={() => setToast((t) => ({ ...t, show: false }))}
        />
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/40 py-10 px-4">
          <div className="max-w-3xl mx-auto space-y-6">

            {/* Score card */}
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/80 p-8">
              <h1 className="text-lg font-extrabold text-slate-900 text-center mb-6 font-heading">Quiz Complete 🎉</h1>
              <ScoreCard
                score={scorePercent} total={quiz.length} correct={correctCount}
                timeTaken={timeTaken} difficulty={difficulty}
              />
              <div className="flex flex-col sm:flex-row gap-3 mt-8 justify-center">
                <button
                  onClick={() => setPhase('review')}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-colors"
                >
                  <BookOpen className="w-4 h-4" /> Review Answers
                </button>
                <button
                  onClick={() => fetchQuiz(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> New Quiz
                </button>
                <Link
                  to={`/course/${id}`}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Module
                </Link>
              </div>
            </div>

            {/* Per-question result chips */}
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/80 p-6">
              <h2 className="text-sm font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-orange-500" /> Question-by-question Breakdown
              </h2>
              <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                {quiz.map((qq, idx) => {
                  const sel = answers[qq.id];
                  const correct = sel && (sel === qq.answer || sel.toLowerCase() === qq.answer?.toLowerCase());
                  return (
                    <button
                      key={idx}
                      onClick={() => { setPhase('review'); setCurrentQ(idx); }}
                      className={`w-full aspect-square rounded-xl flex items-center justify-center text-xs font-extrabold transition-all hover:scale-105 ${
                        !sel ? 'bg-slate-100 text-slate-400 border border-slate-200'
                        : correct ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                        : 'bg-rose-100 text-rose-700 border border-rose-300'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 mt-3 text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-200 inline-block" /> Correct</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-rose-200 inline-block" /> Wrong</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-slate-200 inline-block" /> Skipped</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Review Phase ──
  if (phase === 'review') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 py-8 px-4">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <button onClick={() => setPhase('results')} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900">
              <ArrowLeft className="w-4 h-4" /> Back to Results
            </button>
            <span className="text-xs font-bold text-slate-500">Reviewing {quiz.length} Questions</span>
          </div>

          {quiz.map((qq, idx) => {
            const sel = answers[qq.id];
            const correct = sel && (sel === qq.answer || sel.toLowerCase() === qq.answer?.toLowerCase());
            return (
              <div key={qq.id} className={`bg-white rounded-2xl ring-1 p-5 space-y-3 ${correct ? 'ring-emerald-200' : sel ? 'ring-rose-200' : 'ring-slate-200'}`}>
                <div className="flex items-start gap-3">
                  <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 mt-0.5 ${
                    correct ? 'bg-emerald-100 text-emerald-700' : sel ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-500'
                  }`}>{idx + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900 leading-relaxed">{qq.question}</p>
                    {qq.topic && <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full mt-1 inline-block">{qq.topic}</span>}
                  </div>
                  {correct ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : sel ? <XCircle className="w-5 h-5 text-rose-500 shrink-0" /> : <span className="text-xs text-slate-400 font-bold shrink-0">Skipped</span>}
                </div>

                <div className="space-y-1.5 pl-10">
                  {qq.options?.map((opt, oIdx) => {
                    const isAnswer = opt === qq.answer || opt.toLowerCase() === qq.answer?.toLowerCase();
                    const isSelected = sel === opt;
                    return (
                      <div key={oIdx} className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium ${
                        isAnswer ? 'bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold'
                        : isSelected && !isAnswer ? 'bg-rose-50 border border-rose-300 text-rose-800'
                        : 'bg-slate-50 border border-slate-200 text-slate-600'
                      }`}>
                        <span className="w-5 h-5 rounded-md bg-white border border-current/20 flex items-center justify-center text-[10px] font-bold shrink-0">
                          {optionLetters[oIdx]}
                        </span>
                        {opt}
                        {isAnswer && <Check className="w-3.5 h-3.5 ml-auto shrink-0 text-emerald-600" />}
                      </div>
                    );
                  })}
                </div>

                {qq.explanation && (
                  <div className="ml-10 p-2.5 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800 font-medium leading-relaxed">
                    <strong>💡 Explanation:</strong> {qq.explanation}
                  </div>
                )}
              </div>
            );
          })}

          <div className="flex justify-center pb-8">
            <button onClick={() => setPhase('results')} className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800">
              Back to Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Quiz Phase ──
  const timerPct = (timer.seconds / SECONDS_PER_QUESTION) * 100;
  const timerColor = timer.seconds > 15 ? '#22c55e' : timer.seconds > 5 ? '#f97316' : '#ef4444';
  const selectedForCurrent = answers[q?.id];
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/40 py-6 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <Link to={`/course/${id}`} className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to Module
          </Link>
          <div className="flex items-center gap-2">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${difficultyColors[difficulty] || difficultyColors.Beginner}`}>
              {difficulty}
            </span>
            <span className="text-[11px] font-bold text-slate-500">{userTier} Tier</span>
          </div>
        </div>

        {/* Quiz Card */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
          {/* Top bar: progress + timer */}
          <div className="px-6 pt-5 pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <ProgressRing percent={timerPct} size={48} stroke={4} color={timerColor} />
                  <span className={`absolute inset-0 flex items-center justify-center text-xs font-extrabold ${timer.seconds <= 5 ? 'text-rose-600 animate-pulse' : 'text-slate-700'}`}>
                    {timer.seconds}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-extrabold text-slate-800">Question {currentQ + 1} of {quiz.length}</p>
                  <p className="text-[11px] text-slate-400 font-medium">{answeredCount} answered</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-600 truncate max-w-[140px]">{moduleTitle}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  <Sparkles className="w-3 h-3 text-orange-500" />
                  <span className="text-[11px] text-orange-600 font-bold">AI Generated</span>
                </div>
              </div>
            </div>

            {/* Overall progress bar */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-300"
                style={{ width: `${((currentQ) / quiz.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question + Options */}
          <div className="p-6 space-y-4">
            {q?.topic && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full">
                {q.topic}
              </span>
            )}
            <p className="text-base font-bold text-slate-900 leading-relaxed">
              <span className="text-orange-500 mr-2">Q{currentQ + 1}.</span>
              {q?.question}
            </p>

            <div className="space-y-2.5">
              {q?.options?.map((opt, oIdx) => {
                const isSelected = selectedForCurrent === opt;
                return (
                  <button
                    key={oIdx}
                    onClick={() => handleAnswer(q.id, opt)}
                    disabled={!!selectedForCurrent}
                    className={`w-full text-left p-3.5 rounded-2xl border text-sm font-medium transition-all duration-150 flex items-center gap-3 group ${
                      isSelected
                        ? 'bg-orange-50 border-orange-400 text-orange-950 shadow-sm'
                        : selectedForCurrent
                        ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-orange-300 hover:bg-orange-50/50 hover:text-slate-900'
                    }`}
                  >
                    <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-extrabold shrink-0 transition-colors ${
                      isSelected ? 'bg-orange-600 text-white' : 'bg-white border border-slate-300 text-slate-500 group-hover:border-orange-300 group-hover:text-orange-600'
                    }`}>
                      {optionLetters[oIdx]}
                    </span>
                    <span className="flex-1 leading-relaxed">{opt}</span>
                    {isSelected && <Check className="w-4 h-4 text-orange-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation */}
          <div className="px-6 pb-6 flex items-center justify-between gap-3">
            <button
              onClick={handlePrev}
              disabled={currentQ === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>

            <button
              onClick={() => navigate(`/course/${id}`)}
              className="text-xs text-slate-400 hover:text-slate-600 font-medium"
            >
              Exit Quiz
            </button>

            {currentQ < quiz.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 text-white text-xs font-bold hover:bg-orange-700 transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleFinishQuiz}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors"
              >
                <Trophy className="w-4 h-4" /> Finish
              </button>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="bg-white rounded-2xl ring-1 ring-slate-200/80 p-4">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2.5">Question Navigator</p>
          <div className="flex flex-wrap gap-2">
            {quiz.map((qq, idx) => {
              const sel = answers[qq.id];
              const isCurrent = idx === currentQ;
              return (
                <button
                  key={idx}
                  onClick={() => { setCurrentQ(idx); timer.reset(SECONDS_PER_QUESTION); timer.start(); }}
                  className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all ${
                    isCurrent ? 'bg-orange-600 text-white scale-110 shadow-md shadow-orange-200'
                    : sel ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {idx + 1}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
