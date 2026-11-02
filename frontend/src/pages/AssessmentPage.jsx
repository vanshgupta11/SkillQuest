import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CheckCircle, Cpu, Code2, Database, Brain, Sparkles, AlertCircle, RefreshCw, Layers, Award, Target, HelpCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DOMAINS_CONFIG = [
  {
    id: 'webdev',
    name: 'Full-Stack Web Engineering',
    tagline: 'Modern React, Node.js, Express, REST APIs & Distributed Web',
    icon: Code2,
    gradient: 'from-blue-500 to-indigo-600',
    tags: ['React 18', 'Node/Express', 'MongoDB', 'REST APIs', 'Async JS'],
  },
  {
    id: 'python',
    name: 'Python & Data Engineering',
    tagline: 'OOP, Generators, Concurrency, ETL pipelines & Pandas',
    icon: Cpu,
    gradient: 'from-amber-500 to-orange-600',
    tags: ['OOP & Dunder', 'Generators', 'Memory Models', 'Pandas', 'Pipelines'],
  },
  {
    id: 'dsa',
    name: 'Algorithms & Data Structures',
    tagline: 'Trees, Graphs, Dynamic Programming, Heaps & Big-O Complexity',
    icon: Database,
    gradient: 'from-purple-500 to-violet-600',
    tags: ['Binary Trees', 'Graphs & BFS/DFS', 'Dynamic Prog', 'Sorting', 'Big-O'],
  },
  {
    id: 'ml',
    name: 'Machine Learning & AI',
    tagline: 'Supervised Models, Neural Architectures, Scikit-Learn & Math',
    icon: Brain,
    gradient: 'from-emerald-500 to-teal-600',
    tags: ['Classification', 'Gradient Descent', 'Loss Functions', 'Neural Nets', 'PyTorch'],
  },
];

export default function AssessmentPage() {
  const { getAuthHeaders } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState('webdev');
  const [quizState, setQuizState] = useState('domain_select'); // 'domain_select' | 'active_quiz' | 'results'
  const [questionBank, setQuestionBank] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [answersHistory, setAnswersHistory] = useState([]);
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatingRoadmap, setGeneratingRoadmap] = useState(false);

  const startAssessment = (domainId) => {
    setSelectedDomain(domainId);
    setLoading(true);
    setError('');

    fetch(`/api/assessment/questions?domain=${domainId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Could not load question bank');
        return res.json();
      })
      .then((data) => {
        if (!data.questions || data.questions.length === 0) throw new Error('Question bank is empty');
        setQuestionBank(data.questions);
        setCurrentStepIndex(0);
        setCurrentDifficulty(1);
        setAnsweredIds(new Set());
        setAnswersHistory([]);
        initNextAdaptiveQuestion(data.questions, 1, new Set());
        setQuizState('active_quiz');
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to initialize assessment');
        setLoading(false);
      });
  };

  const initNextAdaptiveQuestion = (bank, targetDifficulty, answeredSet) => {
    let pool = bank.filter((q) => q.difficulty === targetDifficulty && !answeredSet.has(q.id));
    if (pool.length === 0) pool = bank.filter((q) => !answeredSet.has(q.id));
    if (pool.length === 0) pool = bank;
    const selected = pool[Math.floor(Math.random() * pool.length)];
    setCurrentQuestion(selected);
    setCurrentDifficulty(targetDifficulty);
  };

  const handleOptionSelect = (selectedOptionIndex) => {
    if (!currentQuestion) return;
    const correctIdx = currentQuestion.correct !== undefined ? currentQuestion.correct : currentQuestion.correctOption;
    const isCorrect = selectedOptionIndex === correctIdx;
    const answerRecord = {
      questionId: currentQuestion.id,
      difficulty: currentQuestion.difficulty,
      domain: currentQuestion.domain || selectedDomain,
      selectedOptionIndex,
      isCorrect,
    };
    const updatedAnswers = [...answersHistory, answerRecord];
    const updatedAnsweredSet = new Set(answeredIds).add(currentQuestion.id);
    setAnswersHistory(updatedAnswers);
    setAnsweredIds(updatedAnsweredSet);

    const nextStepNum = currentStepIndex + 1;
    setCurrentStepIndex(nextStepNum);

    if (nextStepNum < 15) {
      let nextDiff = isCorrect ? Math.min(3, currentDifficulty + 1) : Math.max(1, currentDifficulty - 1);
      initNextAdaptiveQuestion(questionBank, nextDiff, updatedAnsweredSet);
    } else {
      submitAssessmentResults(updatedAnswers);
    }
  };

  const submitAssessmentResults = (finalAnswers) => {
    setLoading(true);
    const correctCount = finalAnswers.filter((a) => a.isCorrect).length;
    const scorePercentage = Math.round((correctCount / finalAnswers.length) * 100);
    const targetDomainObj = DOMAINS_CONFIG.find((d) => d.id === selectedDomain);
    const domainName = targetDomainObj ? targetDomainObj.name : selectedDomain;

    fetch('/api/assessment/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ domain: domainName, score: scorePercentage, answers: finalAnswers }),
    })
      .then((res) => res.json())
      .then((data) => {
        setResultsData(data);
        setQuizState('results');
        setLoading(false);
      })
      .catch(() => {
        let fallbackTier = 'Intermediate';
        if (scorePercentage >= 75) fallbackTier = 'Advanced';
        else if (scorePercentage < 45) fallbackTier = 'Beginner';
        setResultsData({
          status: 'success',
          tier: fallbackTier,
          score: scorePercentage,
          explanation: `Your diagnostic score is ${scorePercentage}%. SkillQuest benchmarked your current proficiency at the ${fallbackTier} tier with an adaptive evaluation curve.`,
        });
        setQuizState('results');
        setLoading(false);
      });
  };

  const getDifficultyMeta = (diff) => {
    switch (diff) {
      case 1:
        return { label: 'Fundamentals', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' };
      case 2:
        return { label: 'Intermediate', badge: 'bg-amber-50 border-amber-200 text-amber-700', dot: 'bg-amber-500' };
      case 3:
      default:
        return { label: 'Advanced', badge: 'bg-orange-50 border-orange-200 text-orange-700', dot: 'bg-orange-500' };
    }
  };

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">

      {/* State 1: Domain Selection */}
      {quizState === 'domain_select' && (
        <div className="space-y-8 animate-fadeIn">
          {/* Header Title Banner */}
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-wider mb-3">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Skill Diagnostics Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 font-heading tracking-tight">
              Benchmark Your Engineering Proficiency
            </h1>
            <p className="text-slate-600 text-sm mt-2 leading-relaxed">
              Take our 15-question adaptive assessment. Questions dynamically scale in difficulty based on your real-time responses to uncover your true mastery tier.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Domain Selection Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DOMAINS_CONFIG.map((dom) => {
              const Icon = dom.icon;
              const isSelected = selectedDomain === dom.id;
              return (
                <div
                  key={dom.id}
                  onClick={() => setSelectedDomain(dom.id)}
                  className={`relative p-6 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'bg-gradient-to-br from-white via-orange-50/40 to-amber-50/30 border-orange-400 shadow-md shadow-orange-500/10 ring-2 ring-orange-400/40'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 shadow-sm hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${dom.gradient} flex items-center justify-center text-white shadow-sm shrink-0`}>
                        <Icon className="w-6 h-6 stroke-[2]" />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-slate-900 font-heading">
                          {dom.name}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                          {dom.tagline}
                        </p>
                      </div>
                    </div>

                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                      isSelected ? 'border-orange-600 bg-orange-600 text-white' : 'border-slate-300 bg-white'
                    }`}>
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 stroke-[3]" />}
                    </div>
                  </div>

                  <div className="mt-4 pt-3.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    {dom.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Sparkles className="w-4 h-4 text-orange-500" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-900">15 Adaptive Diagnostic Questions</div>
                <div className="text-[11px] text-slate-500">Auto-calibrating across Fundamentals, Intermediate & Advanced</div>
              </div>
            </div>

            <button
              disabled={!selectedDomain || loading}
              onClick={() => startAssessment(selectedDomain)}
              className="w-full sm:w-auto px-6 py-3 rounded-xl btn-primary-gradient text-xs font-bold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Initializing Question Bank…
                </>
              ) : (
                <>
                  <span>Begin Diagnostic</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* State 2: Active Adaptive Quiz */}
      {quizState === 'active_quiz' && currentQuestion && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-card space-y-7 animate-fadeIn">

          {/* Top Progress & Difficulty Bar */}
          <div className="space-y-3 border-b border-slate-100 pb-5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full bg-slate-900 text-white text-xs font-extrabold uppercase tracking-wider font-heading">
                  Question {currentStepIndex + 1} of 15
                </span>

                <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${getDifficultyMeta(currentDifficulty).badge}`}>
                  <span className={`w-2 h-2 rounded-full ${getDifficultyMeta(currentDifficulty).dot} animate-pulse`} />
                  <span>Tier: {getDifficultyMeta(currentDifficulty).label}</span>
                </div>
              </div>

              <div className="text-xs font-bold text-slate-500">
                {Math.round(((currentStepIndex + 1) / 15) * 100)}% Completed
              </div>
            </div>

            {/* Visual Progress Line */}
            <div className="w-full h-2.5 rounded-full bg-slate-100 overflow-hidden relative">
              <div
                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 rounded-full transition-all duration-300 shadow-sm"
                style={{ width: `${((currentStepIndex + 1) / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* Question Text */}
          <div>
            <span className="text-[11px] font-bold text-orange-600 uppercase tracking-wider block mb-2">
              Adaptive Evaluation Challenge
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 leading-relaxed font-heading">
              {currentQuestion.question || currentQuestion.text}
            </h2>
          </div>

          {/* Multiple Choice Options */}
          <div className="space-y-3">
            {currentQuestion.options.map((optionText, optIndex) => (
              <button
                key={optIndex}
                onClick={() => handleOptionSelect(optIndex)}
                className="w-full text-left p-4 rounded-xl bg-slate-50/80 hover:bg-orange-50/40 border border-slate-200 hover:border-orange-400 text-slate-800 text-xs sm:text-sm font-medium transition-all duration-150 active:scale-[0.99] flex items-center gap-3.5 group"
              >
                <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 group-hover:border-orange-500 group-hover:bg-orange-600 group-hover:text-white flex items-center justify-center text-xs font-bold text-slate-600 transition-colors shrink-0 shadow-xs">
                  {optionLetters[optIndex]}
                </div>
                <div className="flex-1 min-w-0 leading-relaxed text-slate-800 group-hover:text-slate-950 font-medium">
                  {optionText}
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-orange-600 transition-colors shrink-0" />
              </button>
            ))}
          </div>

          <div className="pt-2 text-center text-[11px] text-slate-400 font-medium">
            Next question will auto-tune based on your answer accuracy
          </div>
        </div>
      )}

      {/* State 3: Diagnostic Results */}
      {quizState === 'results' && resultsData && (
        <div className="bg-white rounded-3xl p-8 sm:p-10 border border-slate-200/90 shadow-card text-center space-y-7 animate-fadeIn">

          <div className="relative inline-block mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-orange-500/30">
              <Award className="w-10 h-10 stroke-[2]" />
            </div>
            <span className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600 fill-emerald-50" />
            </span>
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Diagnostic Verified
            </div>
            <h2 className="text-3xl font-extrabold text-slate-900 font-heading">
              Proficiency Benchmarked: <span className="gradient-accent-orange">{resultsData.tier} Tier</span>
            </h2>
            <div className="text-sm font-semibold text-slate-500 mt-1">
              Diagnostic Mastery Score: <span className="font-extrabold text-slate-800">{resultsData.score}%</span>
            </div>
          </div>

          {/* Explanation Card */}
          <div className="max-w-xl mx-auto p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-600 leading-relaxed">
            {resultsData.explanation}
          </div>

          {/* Action CTAs */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              disabled={generatingRoadmap}
              onClick={async () => {
                setGeneratingRoadmap(true);
                const targetDomainObj = DOMAINS_CONFIG.find((d) => d.id === selectedDomain);
                const goalName = targetDomainObj ? targetDomainObj.name : 'Full-Stack Software Engineering';
                try {
                  await fetch('/api/roadmap/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ goal: goalName }),
                  });
                } catch {
                  // Fallback
                }
                setGeneratingRoadmap(false);
                window.location.href = '/roadmap';
              }}
              className="w-full sm:w-auto px-7 py-3 rounded-xl btn-primary-gradient text-xs font-bold flex items-center justify-center gap-2 shadow-md"
            >
              {generatingRoadmap ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" /> Crafting Personalized Curriculum…
                </>
              ) : (
                <>
                  <span>Build Quest Path for {resultsData.tier} Tier</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <button
              onClick={() => setQuizState('domain_select')}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retake Diagnostic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
