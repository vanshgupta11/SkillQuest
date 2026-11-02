import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Zap, BookOpen, Target, ArrowRight, Shield,
  Award, CheckCircle2, Send, Loader2, Map,
  AlertCircle, Flame, Crown, Star, Sparkles, Compass,
  ChevronRight, RefreshCw, Layers
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import ResumeAnalyzer from '../components/ResumeAnalyzer';

// Popular Quick-Goal Suggestions
const QUICK_GOALS = [
  'Full-Stack Next.js 14 & Node Architecture',
  'Python Data Pipelines & ETL Engineering',
  'Microservices, Docker & Kubernetes Systems',
  'Machine Learning & PyTorch Deep Learning',
  'DSA & LeetCode High-Frequency Patterns',
];

// ── Gamified Level Progress Bar ─────────────────────────────────────────────
function LevelProgressBar({ level, progressPercent, totalXp, xpToNextLevel }) {
  return (
    <div className="card-modern-elevated p-6 sm:p-7 relative overflow-hidden bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3.5">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white font-extrabold text-lg shadow-md shadow-orange-500/25">
              {level}
            </div>
            <span className="absolute -bottom-1 -right-1 px-1 py-0.2 rounded-md bg-slate-900 text-[9px] font-bold text-white uppercase">
              LVL
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 font-heading">Level {level} Tech Explorer</h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-orange-100 text-orange-800">Active</span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-medium">{totalXp.toLocaleString()} Lifetime XP Earned</div>
          </div>
        </div>

        <div className="sm:text-right">
          <div className="text-xs font-bold text-slate-800">
            <span className="text-orange-600 font-extrabold">{xpToNextLevel} XP</span> needed for Level {level + 1}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 font-medium">{progressPercent}% Tier Completion</div>
        </div>
      </div>

      {/* Modern High-End Progress Bar */}
      <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden relative p-0.5">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 transition-all duration-700 shadow-sm"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold mt-2">
        <span>Level {level} (0%)</span>
        <span>50% Checkpoint</span>
        <span>Level {level + 1}</span>
      </div>
    </div>
  );
}

// ── Leaderboard Widget ────────────────────────────────────────────────────────
function LeaderboardWidget() {
  const [board, setBoard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/leaderboard')
      .then((r) => r.json())
      .then((d) => {
        setBoard(d.leaderboard || []);
        setLoading(false);
      })
      .catch(() => {
        setBoard([]);
        setLoading(false);
      });
  }, []);

  const getRankBadge = (rank) => {
    if (rank === 1) return <span className="text-base">🥇</span>;
    if (rank === 2) return <span className="text-base">🥈</span>;
    if (rank === 3) return <span className="text-base">🥉</span>;
    return <span className="text-xs font-bold text-slate-500">#{rank}</span>;
  };

  return (
    <div className="card-modern-elevated p-6 bg-white">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
          <Crown className="w-4 h-4 text-amber-500 fill-amber-400" /> Mastery Leaderboard
        </h2>
        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top Engineers</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-11 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : board.length === 0 ? (
        <div className="text-center py-8 text-slate-400 text-xs">
          <Trophy className="w-8 h-8 mx-auto mb-2 opacity-30 text-amber-500" />
          <p>Complete study modules to rank on the platform leaderboard!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {board.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-all ${
                entry.rank === 1
                  ? 'bg-amber-50/70 border-amber-200/80 shadow-xs'
                  : entry.rank <= 3
                  ? 'bg-orange-50/50 border-orange-200/60'
                  : 'bg-slate-50/70 border-slate-200/60'
              }`}
            >
              <div className="w-7 text-center flex items-center justify-center shrink-0">
                {getRankBadge(entry.rank)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-slate-800 truncate">{entry.displayName}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  Lv.{entry.level} · {entry.currentTier}
                </div>
              </div>
              <div className="font-extrabold text-orange-600 bg-white px-2 py-0.5 rounded-md border border-orange-200/50 text-[11px] shadow-xs">
                {entry.totalXp.toLocaleString()} XP
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main DashboardPage Component ─────────────────────────────────────────────
export default function DashboardPage() {
  const { getAuthHeaders, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [goal, setGoal] = useState('');
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');
  const [generateSuccess, setGenerateSuccess] = useState('');
  const navigate = useNavigate();

  const fetchStats = () => {
    fetch('/api/dashboard/stats', {
      headers: getAuthHeaders(),
    })
      .then((r) => r.json())
      .then((d) => setStats(d.userStats))
      .catch(() =>
        setStats({
          totalXp: 0,
          currentTier: 'Beginner',
          level: 1,
          progressPercent: 0,
          xpForNextLevel: 100,
          xpToNextLevel: 100,
          streakDays: 0,
          completedModules: 0,
          totalModules: 12,
          recentActivity: [],
        })
      );
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleGenerateRoadmap = async (e) => {
    e?.preventDefault?.();
    if (!goal.trim() || goal.trim().length < 5) {
      setGenerateError('Please describe your target learning goal (at least 5 characters).');
      return;
    }
    setGenerating(true);
    setGenerateError('');
    setGenerateSuccess('');

    try {
      const res = await fetch('/api/roadmap/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ goal: goal.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setGenerateError(data.message || 'Quest generation failed. Check API keys in backend .env.');
        setGenerating(false);
        return;
      }

      setGenerateSuccess(`Quest path for "${data.roadmap?.goal}" created with ${data.roadmap?.modules?.length} modules!`);
      setGenerating(false);
      setTimeout(() => navigate('/roadmap'), 1200);
    } catch {
      setGenerateError('Network error. Ensure the backend is running on port 5000.');
      setGenerating(false);
    }
  };

  const totalXp = stats?.totalXp ?? 0;
  const level = stats?.level ?? 1;
  const progressPercent = stats?.progressPercent ?? 0;
  const xpToNextLevel = stats?.xpToNextLevel ?? 100;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">

      {/* Modern High-Aesthetic Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white p-7 sm:p-10 border border-slate-800 shadow-xl">
        {/* Ambient Gradient Mesh Glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-orange-400 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>SkillQuest AI Platform</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading leading-tight">
              Master New Tech Skills, <br />
              <span className="gradient-accent-orange">Calibrated to Your Tier</span>
            </h1>
            <p className="text-slate-300 mt-2.5 text-xs sm:text-sm leading-relaxed max-w-xl">
              Diagnose your exact proficiency level and dynamically generate comprehensive curriculums with curated YouTube resources, interactive quizzes & verified study modules.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0">
            <Link
              to="/assessment"
              id="start-assessment-btn"
              className="px-5 py-3 rounded-xl btn-primary-gradient text-xs font-bold flex items-center justify-center gap-2 shadow-md"
            >
              <Shield className="w-4 h-4" /> Start Skill Diagnostic
            </Link>
            <Link
              to="/roadmap"
              className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/20 transition-colors flex items-center justify-center gap-2 text-center"
            >
              <Map className="w-4 h-4 text-orange-400" /> View Current Quest Path
            </Link>
          </div>
        </div>
      </div>

      {/* Goal Generation Box */}
      <div className="card-modern-elevated p-6 sm:p-7 bg-white">
        <div className="mb-4">
          <h2 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-600" /> Build a Dynamic Quest Path
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Enter a learning objective, tech stack, or engineering goal to synthesize a personalized multi-tier curriculum.
          </p>
        </div>

        <form onSubmit={handleGenerateRoadmap} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              id="goal-input"
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder='e.g. "React 18 & Redux Toolkit Architecture", "System Design & Distributed Cache"'
              disabled={generating}
              className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs sm:text-sm focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-slate-400 disabled:opacity-50"
            />
          </div>
          <button
            id="generate-roadmap-btn"
            type="submit"
            disabled={generating || !goal.trim()}
            className="px-6 py-3 rounded-xl btn-primary-gradient disabled:opacity-50 text-xs font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Generating Curriculum…</>
            ) : (
              <><Send className="w-4 h-4" /> Synthesize Path</>
            )}
          </button>
        </form>

        {/* Quick Goal Pills */}
        <div className="mt-3.5 flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-400">Popular:</span>
          {QUICK_GOALS.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setGoal(q)}
              className="text-[11px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200 border border-slate-200/70 text-slate-600 transition-all text-left"
            >
              {q}
            </button>
          ))}
        </div>

        {generateError && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{generateError}</span>
          </div>
        )}
        {generateSuccess && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{generateSuccess}</span>
          </div>
        )}
      </div>

      {/* AI Resume & Job Description Skill Gap Analyzer */}
      <ResumeAnalyzer
        onSelectQuestGoal={(recommendedGoal) => {
          setGoal(recommendedGoal);
          window.scrollTo({ top: 220, behavior: 'smooth' });
        }}
      />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Trophy, label: 'Total Experience', value: totalXp.toLocaleString() + ' XP', gradient: 'from-amber-500 to-orange-500', color: 'text-amber-600' },
          { icon: Award, label: 'Proficiency Tier', value: stats?.currentTier ?? 'Beginner', gradient: 'from-indigo-500 to-purple-600', color: 'text-indigo-600' },
          { icon: BookOpen, label: 'Modules Cleared', value: `${stats?.completedModules ?? 0} / ${stats?.totalModules ?? 12}`, gradient: 'from-blue-500 to-cyan-500', color: 'text-blue-600' },
          { icon: Flame, label: 'Streak Status', value: `${stats?.streakDays ?? 0} Days 🔥`, gradient: 'from-orange-500 to-red-500', color: 'text-orange-600' },
        ].map(({ icon: Icon, label, value, gradient }) => (
          <div key={label} className="card-modern-elevated p-5 bg-white flex items-center gap-3.5">
            <div className={`w-11 h-11 rounded-xl bg-gradient-to-tr ${gradient} flex items-center justify-center text-white shrink-0 shadow-sm`}>
              <Icon className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</div>
              <div className="text-base sm:text-lg font-bold text-slate-900 mt-0.5 truncate font-heading">{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Level Progress Bar */}
      <LevelProgressBar
        level={level}
        progressPercent={progressPercent}
        totalXp={totalXp}
        xpToNextLevel={xpToNextLevel}
      />

      {/* Bottom Grid: Activity, Quick Nav & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Experience Log */}
        <div className="card-modern-elevated p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 font-heading">
              <Zap className="w-4 h-4 text-orange-600" /> Recent Experience Log
            </h2>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">XP Events</span>
          </div>

          {stats?.recentActivity?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-slate-800 truncate">{act.title}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">{act.date}</div>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    +{act.xp} XP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-slate-400 text-xs">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-30 text-orange-500" />
              <p>Complete learning modules to earn XP and record your activities.</p>
            </div>
          )}
        </div>

        {/* Quick Navigation Cards */}
        <div className="card-modern-elevated p-6 bg-white">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2 font-heading">
            <Compass className="w-4 h-4 text-orange-600" /> Core Destinations
          </h2>
          <div className="space-y-3">
            <Link
              to="/assessment"
              className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-orange-300 hover:bg-orange-50/30 transition-all group flex items-center gap-3.5"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Shield className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-xs">Skill Diagnostic</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Adaptive 15-question benchmark</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors shrink-0" />
            </Link>

            <Link
              to="/roadmap"
              className="p-3.5 rounded-xl bg-slate-50/80 border border-slate-200/70 hover:border-orange-300 hover:bg-orange-50/30 transition-all group flex items-center gap-3.5"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
                <Map className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-slate-900 text-xs">Interactive Quest Path</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Continue curriculum modules</div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-600 transition-colors shrink-0" />
            </Link>
          </div>
        </div>

        {/* Leaderboard */}
        <LeaderboardWidget />
      </div>
    </div>
  );
}
