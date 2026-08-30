import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Trophy, Zap, BookOpen, Target, ArrowRight, Shield,
  Award, CheckCircle2, Send, Loader2, Map,
  AlertCircle, Flame, Crown, Star, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ── Level progress bar ──────────────────────────────────────────────────────
function LevelProgressBar({ level, progressPercent, totalXp, xpToNextLevel }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-600 flex items-center justify-center text-white font-extrabold text-base shadow-sm">
            {level}
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-900">Level {level} Explorer</div>
            <div className="text-xs text-zinc-500 font-medium">{totalXp.toLocaleString()} total XP earned</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-zinc-700">{xpToNextLevel} XP to Level {level + 1}</div>
          <div className="text-[11px] text-zinc-400 mt-0.5">{progressPercent}% complete</div>
        </div>
      </div>

      <div className="w-full h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-orange-600 transition-all duration-700"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
}

// ── Leaderboard widget ────────────────────────────────────────────────────────
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

  const medalIcons = ['🥇', '🥈', '🥉'];

  return (
    <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-sm">
      <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2 font-heading">
        <Crown className="w-4 h-4 text-amber-500" /> Mastery Leaderboard
      </h2>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-zinc-100 animate-pulse" />
          ))}
        </div>
      ) : board.length === 0 ? (
        <div className="text-center py-6 text-zinc-400 text-xs">
          <Trophy className="w-7 h-7 mx-auto mb-2 opacity-30" />
          Complete study modules to rank on the leaderboard!
        </div>
      ) : (
        <div className="space-y-2">
          {board.map((entry) => (
            <div
              key={entry.rank}
              className={`flex items-center gap-3 p-2.5 rounded-xl border text-xs transition-colors ${
                entry.rank <= 3
                  ? 'bg-amber-50/60 border-amber-200/60'
                  : 'bg-zinc-50/60 border-zinc-200/60'
              }`}
            >
              <div className="w-6 text-center font-bold text-zinc-700">
                {entry.rank <= 3 ? medalIcons[entry.rank - 1] : `#${entry.rank}`}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-zinc-800 truncate">{entry.displayName}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">
                  Lv.{entry.level} · {entry.currentTier}
                </div>
              </div>
              <div className="font-bold text-orange-600">
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
  const { getAuthHeaders } = useAuth();
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
    e.preventDefault();
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-7">

      {/* Modern High-Craft Header Banner */}
      <div className="bg-zinc-900 text-white rounded-2xl p-7 sm:p-9 shadow-sm relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold text-orange-400 uppercase tracking-wider">
              SkillQuest Platform
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-heading mt-1 leading-tight">
              Accelerate your technical mastery.
            </h1>
            <p className="text-zinc-400 mt-2 text-xs sm:text-sm leading-relaxed">
              Describe your objective to generate a structured curriculum calibrated precisely to your proficiency tier.
            </p>
          </div>
          <Link
            to="/assessment"
            id="start-assessment-btn"
            className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-xs shadow-sm flex items-center gap-2 transition-all hover:scale-[1.01] active:scale-95 shrink-0"
          >
            <Shield className="w-4 h-4" /> Start Skill Diagnostic
          </Link>
        </div>
      </div>

      {/* Goal Input Section */}
      <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-bold text-zinc-900 font-heading">
            Build a New Quest Path
          </h2>
          <p className="text-zinc-500 text-xs mt-0.5">
            Enter your target topic or skill to generate tailored modules with verified documentation & study guides.
          </p>
        </div>

        <form onSubmit={handleGenerateRoadmap} className="flex flex-col sm:flex-row gap-2.5">
          <input
            id="goal-input"
            type="text"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder='e.g. "React & Redux Toolkit Architecture", "System Design & Distributed Cache"'
            disabled={generating}
            className="flex-1 px-4 py-3 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-xs focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400 disabled:opacity-50"
          />
          <button
            id="generate-roadmap-btn"
            type="submit"
            disabled={generating || !goal.trim()}
            className="px-6 py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all whitespace-nowrap"
          >
            {generating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating Path…</>
            ) : (
              <><Send className="w-3.5 h-3.5" /> Build Quest Path</>
            )}
          </button>
        </form>

        {generateError && (
          <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0 mt-0.5" />
            <span>{generateError}</span>
          </div>
        )}
        {generateSuccess && (
          <div className="mt-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{generateSuccess} Redirecting…</span>
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Trophy, label: 'Total Experience', value: totalXp.toLocaleString() + ' XP', iconColor: 'text-zinc-700' },
          { icon: Award, label: 'Skill Tier', value: stats?.currentTier ?? 'Beginner', iconColor: 'text-zinc-700' },
          { icon: BookOpen, label: 'Modules Completed', value: `${stats?.completedModules ?? 0} / ${stats?.totalModules ?? 12}`, iconColor: 'text-zinc-700' },
          { icon: Flame, label: 'Active Streak', value: `${stats?.streakDays ?? 0} Days 🔥`, iconColor: 'text-orange-600 fill-orange-500 animate-pulse' },
        ].map(({ icon: Icon, label, value, iconColor }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-zinc-200/90 shadow-sm flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-center shrink-0">
              <Icon className={`w-5 h-5 ${iconColor}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-medium text-zinc-500 truncate">{label}</div>
              <div className="text-lg font-bold text-zinc-900 mt-0.5 truncate font-heading">{value}</div>
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

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Experience Log */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2 font-heading">
            <Zap className="w-4 h-4 text-orange-600" /> Recent Experience Log
          </h2>
          {stats?.recentActivity?.length > 0 ? (
            <div className="space-y-2.5">
              {stats.recentActivity.map((act) => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-zinc-50 border border-zinc-200/60 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-zinc-800 truncate">{act.title}</div>
                    <div className="text-[10px] text-zinc-400 mt-0.5">{act.date}</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shrink-0">
                    +{act.xp} XP
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-zinc-400 text-xs">
              <Star className="w-7 h-7 mx-auto mb-2 opacity-30" />
              Complete study modules to earn XP and level up.
            </div>
          )}
        </div>

        {/* Quick Navigation */}
        <div className="bg-white rounded-2xl p-6 border border-zinc-200/90 shadow-sm">
          <h2 className="text-sm font-bold text-zinc-900 mb-4 flex items-center gap-2 font-heading">
            <Target className="w-4 h-4 text-orange-600" /> Quick Navigation
          </h2>
          <div className="space-y-2.5">
            <Link to="/assessment" className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 hover:border-zinc-300 hover:bg-zinc-100/80 transition-all group flex items-center gap-3">
              <Shield className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold text-zinc-900 text-xs">Skill Diagnostic</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Benchmark your proficiency tier</div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 ml-auto group-hover:text-zinc-800 transition-colors" />
            </Link>
            <Link to="/roadmap" className="p-3.5 rounded-xl bg-zinc-50 border border-zinc-200/60 hover:border-zinc-300 hover:bg-zinc-100/80 transition-all group flex items-center gap-3">
              <Map className="w-5 h-5 text-orange-600 shrink-0" />
              <div>
                <div className="font-semibold text-zinc-900 text-xs">Active Quest Path</div>
                <div className="text-[11px] text-zinc-500 mt-0.5">Resume active learning modules</div>
              </div>
              <ArrowRight className="w-4 h-4 text-zinc-400 ml-auto group-hover:text-zinc-800 transition-colors" />
            </Link>
          </div>
        </div>

        {/* Leaderboard */}
        <LeaderboardWidget />
      </div>
    </div>
  );
}
