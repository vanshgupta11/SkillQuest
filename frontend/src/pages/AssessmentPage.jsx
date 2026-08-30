import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowRight, CheckCircle, Cpu, Code2, Database, Brain } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DOMAIN_ICONS = {
  webdev: Code2,
  python: Cpu,
  dsa: Database,
  ml: Brain,
};

export default function AssessmentPage() {
  const { getAuthHeaders } = useAuth();
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [domains] = useState([
    { id: 'webdev', name: 'Full-Stack Web Development', description: 'React, Express, MongoDB, REST APIs, & web architecture' },
    { id: 'python', name: 'Python Core & Data Engineering', description: 'OOP, generators, concurrency, pandas, & data pipelines' },
    { id: 'dsa', name: 'Data Structures & Algorithms', description: 'Arrays, trees, graphs, dynamic programming, & complexity' },
    { id: 'ml', name: 'Machine Learning Fundamentals', description: 'Supervised models, neural nets, scikit-learn, & PyTorch' },
  ]);

  const [quizState, setQuizState] = useState('domain_select');
  const [questionBank, setQuestionBank] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentDifficulty, setCurrentDifficulty] = useState(1);
  const [answeredIds, setAnsweredIds] = useState(new Set());
  const [answersHistory, setAnswersHistory] = useState([]);
  const [resultsData, setResultsData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    const isCorrect = selectedOptionIndex === currentQuestion.correctOption;
    const answerRecord = { questionId: currentQuestion.id, difficulty: currentQuestion.difficulty, domain: currentQuestion.domain, selectedOptionIndex, isCorrect };
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
    const targetDomainObj = domains.find((d) => d.id === selectedDomain);
    const domainName = targetDomainObj ? targetDomainObj.name : selectedDomain;

    fetch('/api/assessment/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ domain: domainName, score: scorePercentage, answers: finalAnswers }),
    })
      .then((res) => res.json())
      .then((data) => { setResultsData(data); setQuizState('results'); setLoading(false); })
      .catch(() => {
        let fallbackTier = 'Intermediate';
        if (scorePercentage >= 75) fallbackTier = 'Advanced';
        else if (scorePercentage < 45) fallbackTier = 'Beginner';
        setResultsData({ status: 'success', tier: fallbackTier, score: scorePercentage, explanation: `Your diagnostic score is ${scorePercentage}%. SkillQuest has benchmarked your current proficiency at the ${fallbackTier} level.` });
        setQuizState('results');
        setLoading(false);
      });
  };

  const getDifficultyLabel = (diff) => {
    if (diff === 1) return { label: 'Fundamentals', badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' };
    if (diff === 2) return { label: 'Intermediate', badge: 'bg-amber-50 border-amber-200 text-amber-700' };
    return { label: 'Advanced', badge: 'bg-orange-50 border-orange-200 text-orange-700' };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* State 1: Domain Selection */}
      {quizState === 'domain_select' && (
        <div>
          <div className="text-center mb-8">
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wider">
              Skill Diagnostic
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-heading mt-1">
              Select Your Skill Domain
            </h1>
            <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-lg mx-auto">
              15 adaptive diagnostic questions to accurately benchmark your proficiency tier.
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium text-center">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-7">
            {domains.map((dom) => {
              const IconComponent = DOMAIN_ICONS[dom.id] || Brain;
              const isSelected = selectedDomain === dom.id;
              return (
                <div
                  key={dom.id}
                  onClick={() => setSelectedDomain(dom.id)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-orange-50/70 border-orange-300 shadow-sm'
                      : 'bg-white border-zinc-200/90 hover:border-zinc-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? 'bg-orange-600 text-white' : 'bg-zinc-100 text-zinc-700'}`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-sm font-bold font-heading ${isSelected ? 'text-orange-950' : 'text-zinc-900'}`}>{dom.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{dom.description}</p>
                    </div>
                    {isSelected && <CheckCircle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-center">
            <button
              disabled={!selectedDomain || loading}
              onClick={() => startAssessment(selectedDomain)}
              className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-40 text-white font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-2"
            >
              {loading ? 'Initializing Diagnostic…' : <>Begin Skill Assessment <ArrowRight className="w-3.5 h-3.5" /></>}
            </button>
          </div>
        </div>
      )}

      {/* State 2: Active Quiz */}
      {quizState === 'active_quiz' && currentQuestion && (
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-zinc-200/90 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 font-heading">
                Question {currentStepIndex + 1} of 15
              </span>
              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${getDifficultyLabel(currentDifficulty).badge}`}>
                {getDifficultyLabel(currentDifficulty).label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-32 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className="h-full bg-orange-600 transition-all duration-300"
                  style={{ width: `${((currentStepIndex + 1) / 15) * 100}%` }}
                />
              </div>
              <span className="text-xs text-zinc-400 font-semibold">{Math.round(((currentStepIndex + 1) / 15) * 100)}%</span>
            </div>
          </div>

          <div>
            <h2 className="text-base sm:text-lg font-bold text-zinc-900 leading-relaxed font-heading mb-5">
              {currentQuestion.text}
            </h2>

            <div className="space-y-2.5">
              {currentQuestion.options.map((optionText, optIndex) => (
                <button
                  key={optIndex}
                  onClick={() => handleOptionSelect(optIndex)}
                  className="w-full text-left p-3.5 rounded-xl bg-zinc-50/70 border border-zinc-200/80 hover:border-zinc-900 hover:bg-white text-zinc-800 text-xs font-medium transition-all active:scale-[0.99] flex items-center justify-between group"
                >
                  <span>{optionText}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-900 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* State 3: Results */}
      {quizState === 'results' && resultsData && (
        <div className="bg-white rounded-2xl p-8 border border-zinc-200/90 shadow-sm text-center space-y-5">
          <div className="w-12 h-12 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-orange-600 mb-1">Diagnostic Complete</div>
            <h2 className="text-2xl font-extrabold text-zinc-900 font-heading">
              Assessed Tier: <span className="text-orange-600">{resultsData.tier}</span>
            </h2>
            <div className="text-xs font-medium text-zinc-500 mt-1">Score: {resultsData.score}%</div>
          </div>

          <p className="text-zinc-600 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            {resultsData.explanation}
          </p>

          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-2.5">
            <button
              onClick={async () => {
                setLoading(true);
                const targetDomainObj = domains.find((d) => d.id === selectedDomain);
                const goalName = targetDomainObj ? targetDomainObj.name : 'Software Engineering';
                try {
                  await fetch('/api/roadmap/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                    body: JSON.stringify({ goal: goalName }),
                  });
                } catch {
                  // Ignore and navigate to roadmap view
                }
                window.location.href = '/roadmap';
              }}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm transition-all"
            >
              Build Quest Path for {resultsData.tier} Tier →
            </button>
            <button
              onClick={() => setQuizState('domain_select')}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-zinc-100 hover:bg-zinc-200 text-zinc-700 text-xs font-semibold transition-all"
            >
              Retake Diagnostic
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
