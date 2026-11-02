import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Flame, Zap, Trophy, Target, Calendar, BookOpen,
  Star, TrendingUp, User, Edit3, Check, X, Award,
  Activity, ChevronRight, Compass
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

// ─── Activity Heatmap Component ────────────────────────────────────────────────
function ActivityHeatmap({ heatmapData }) {
  const [tooltip, setTooltip] = useState(null);

  // Build a map of date -> { xp, count }
  const dataMap = {};
  heatmapData.forEach((d) => {
    dataMap[d.date] = d;
  });

  // Generate the last 52 weeks (364 days) starting from Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent Sunday to align the grid
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 363); // ~52 weeks back
  // Move to the nearest Sunday before startDate
  const dayOfWeek = startDate.getDay();
  startDate.setDate(startDate.getDate() - dayOfWeek);

  // Build weeks array
  const weeks = [];
  let current = new Date(startDate);
  while (current <= today) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const dateStr = current.toISOString().slice(0, 10);
      const inRange = current <= today;
      week.push({
        date: dateStr,
        data: inRange ? (dataMap[dateStr] || null) : null,
        inRange,
        isToday: dateStr === today.toISOString().slice(0, 10),
      });
      current = new Date(current);
      current.setDate(current.getDate() + 1);
    }
    weeks.push(week);
  }

  const getColor = (data, inRange) => {
    if (!inRange) return 'bg-slate-100/40';
    if (!data) return 'bg-slate-100 dark:bg-slate-800/60';
    const xp = data.xp;
    if (xp >= 40) return 'bg-orange-600 shadow-sm shadow-orange-500/50';
    if (xp >= 25) return 'bg-orange-500';
    if (xp >= 15) return 'bg-orange-400';
    if (xp >= 5) return 'bg-orange-300';
    return 'bg-orange-200';
  };

  const monthLabels = [];
  let lastMonth = -1;
  weeks.forEach((week, wi) => {
    const firstDayOfWeek = week[0];
    const d = new Date(firstDayOfWeek.date);
    const month = d.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex: wi, label: d.toLocaleString('default', { month: 'short' }) });
      lastMonth = month;
    }
  });

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="relative">
      {/* Month Labels */}
      <div className="flex mb-1 ml-8">
        <div className="flex gap-[3px]" style={{ width: `${weeks.length * 14}px` }}>
          {weeks.map((_, wi) => {
            const label = monthLabels.find((m) => m.weekIndex === wi);
            return (
              <div key={wi} style={{ width: '11px', minWidth: '11px' }} className="text-[9px] text-slate-400 font-semibold select-none overflow-visible">
                {label ? label.label : ''}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex gap-2">
        {/* Day Labels */}
        <div className="flex flex-col gap-[3px] pt-0.5">
          {dayLabels.map((d, i) => (
            <div key={d} className="h-[11px] text-[9px] text-slate-400 font-medium leading-[11px] w-7 text-right pr-1 select-none">
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="flex gap-[3px] overflow-x-auto pb-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map((cell) => (
                <div
                  key={cell.date}
                  className={`w-[11px] h-[11px] rounded-[2px] cursor-default transition-all duration-100 ${getColor(cell.data, cell.inRange)} ${
                    cell.isToday ? 'ring-1 ring-orange-500 ring-offset-1 ring-offset-white' : ''
                  } hover:ring-1 hover:ring-orange-400 hover:ring-offset-1 hover:ring-offset-white hover:scale-125`}
                  onMouseEnter={(e) => {
                    if (!cell.inRange) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    setTooltip({
                      date: cell.date,
                      xp: cell.data?.xp || 0,
                      count: cell.data?.count || 0,
                      x: rect.left + window.scrollX,
                      y: rect.top + window.scrollY - 44,
                    });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-end gap-1.5 mt-2 text-[10px] text-slate-400 font-medium">
        <span>Less</span>
        {['bg-slate-100', 'bg-orange-200', 'bg-orange-300', 'bg-orange-400', 'bg-orange-500', 'bg-orange-600'].map((c, i) => (
          <div key={i} className={`w-[11px] h-[11px] rounded-[2px] ${c}`} />
        ))}
        <span>More</span>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-medium shadow-xl pointer-events-none"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.count === 0 ? (
            <span className="text-slate-300">No activity on {tooltip.date}</span>
          ) : (
            <span>
              <span className="text-orange-400 font-bold">{tooltip.xp} XP</span> · {tooltip.count} event{tooltip.count !== 1 ? 's' : ''} · {tooltip.date}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Stat Card ──────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, sub, color = 'orange', glow = false }) {
  const colors = {
    orange: { bg: 'bg-orange-50', icon: 'bg-orange-100 text-orange-600', value: 'text-orange-700', ring: 'ring-orange-200/60' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', value: 'text-amber-700', ring: 'ring-amber-200/60' },
    emerald: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', value: 'text-emerald-700', ring: 'ring-emerald-200/60' },
    violet: { bg: 'bg-violet-50', icon: 'bg-violet-100 text-violet-600', value: 'text-violet-700', ring: 'ring-violet-200/60' },
    sky: { bg: 'bg-sky-50', icon: 'bg-sky-100 text-sky-600', value: 'text-sky-700', ring: 'ring-sky-200/60' },
    rose: { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', value: 'text-rose-700', ring: 'ring-rose-200/60' },
  };
  const c = colors[color] || colors.orange;

  return (
    <div className={`${c.bg} rounded-2xl p-4 ring-1 ${c.ring} flex items-start gap-3`}>
      <div className={`${c.icon} p-2.5 rounded-xl shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide leading-none mb-1">{label}</p>
        <p className={`text-2xl font-extrabold ${c.value} leading-tight tabular-nums`}>{value}</p>
        {sub && <p className="text-[11px] text-slate-400 font-medium mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Tier Badge ─────────────────────────────────────────────────────────────────
function TierBadge({ tier }) {
  const configs = {
    Advanced: { bg: 'bg-gradient-to-r from-purple-600 to-violet-600', text: 'text-white', icon: '⚡', label: 'Advanced' },
    Intermediate: { bg: 'bg-gradient-to-r from-amber-500 to-orange-500', text: 'text-white', icon: '🔥', label: 'Intermediate' },
    Beginner: { bg: 'bg-gradient-to-r from-emerald-500 to-teal-500', text: 'text-white', icon: '🌱', label: 'Beginner' },
  };
  const cfg = configs[tier] || configs.Beginner;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.bg} ${cfg.text} shadow-sm`}>
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}

// ─── Main Profile Page ──────────────────────────────────────────────────────────
export default function ProfilePage() {
  const { user: authUser, token, getAuthHeaders } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/profile/me', {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error('Failed to load profile');
      const data = await res.json();
      setProfile(data);
      setEditName(data.user.fullName || '');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSaveName = async () => {
    try {
      setSaving(true);
      const res = await fetch('/api/profile/me', {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName: editName }),
      });
      if (!res.ok) throw new Error('Failed to update profile');
      await fetchProfile();
      setEditing(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50/30">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg animate-pulse">
            <User className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-600 animate-pulse">Loading your profile…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <p className="text-rose-600 font-semibold mb-3">{error}</p>
          <button onClick={fetchProfile} className="px-4 py-2 rounded-xl bg-orange-600 text-white text-sm font-semibold hover:bg-orange-700 transition-colors">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const { user, stats, activityHeatmap } = profile;
  const memberSince = new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const lastActive = user.lastActiveAt
    ? new Date(user.lastActiveAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Never';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-orange-50/40 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-2 text-xs text-slate-400 font-medium">
          <Link to="/dashboard" className="hover:text-orange-600 transition-colors flex items-center gap-1">
            <Compass className="w-3 h-3" /> Dashboard
          </Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-slate-700 font-semibold">Profile</span>
        </nav>

        {/* ── Hero Card ── */}
        <div className="relative bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
          {/* Decorative gradient bar */}
          <div className="h-2 w-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600" />

          {/* Ambient decoration */}
          <div className="absolute top-10 right-10 w-48 h-48 rounded-full bg-orange-100/40 blur-3xl pointer-events-none" />
          <div className="absolute top-10 left-1/2 w-32 h-32 rounded-full bg-amber-100/30 blur-2xl pointer-events-none" />

          <div className="p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              {/* Avatar */}
              <div className="relative shrink-0">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white text-3xl font-extrabold shadow-lg shadow-orange-500/25">
                  {(user.fullName || user.email || '?')[0].toUpperCase()}
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg bg-white flex items-center justify-center shadow-md ring-1 ring-slate-200">
                  <span className="text-sm">
                    {user.currentTier === 'Advanced' ? '⚡' : user.currentTier === 'Intermediate' ? '🔥' : '🌱'}
                  </span>
                </div>
              </div>

              {/* Name & Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    {editing ? (
                      <div className="flex items-center gap-2 mb-1">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="text-xl font-extrabold text-slate-900 border-b-2 border-orange-400 bg-transparent outline-none w-full max-w-xs"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditing(false); }}
                        />
                        <button onClick={handleSaveName} disabled={saving} className="p-1.5 rounded-lg bg-orange-500 text-white hover:bg-orange-600 transition-colors">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditing(false)} className="p-1.5 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mb-1">
                        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                          {user.fullName || 'Developer'}
                        </h1>
                        <button
                          onClick={() => setEditing(true)}
                          title="Edit name"
                          className="p-1 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                    <p className="text-sm text-slate-500 font-medium mb-2">{user.email}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TierBadge tier={user.currentTier} />
                      <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                        Level {user.level}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">
                        Member since {memberSince}
                      </span>
                    </div>
                  </div>
                </div>

                {/* XP Progress Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-600">XP Progress — Level {user.level}</span>
                    <span className="text-xs font-bold text-orange-600">{user.totalXp.toLocaleString()} XP</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-700 relative overflow-hidden"
                      style={{ width: `${user.progressPercent}%` }}
                    >
                      <div className="absolute inset-0 bg-white/25 animate-shimmer" />
                    </div>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400 font-medium">{user.progressPercent}% to next level</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {(user.xpForNextLevel - user.totalXp).toLocaleString()} XP needed
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Stats Grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 gap-3">
          <StatCard
            icon={Flame}
            label="Current Streak"
            value={`${stats.currentStreak}d`}
            sub={stats.currentStreak > 0 ? '🔥 Keep it going!' : 'Complete a module today'}
            color="orange"
          />
          <StatCard
            icon={Trophy}
            label="Best Streak"
            value={`${stats.maxStreak}d`}
            sub="Personal record"
            color="amber"
          />
          <StatCard
            icon={Zap}
            label="Total XP"
            value={stats.totalXpEarned.toLocaleString()}
            sub="Lifetime earned"
            color="violet"
          />
          <StatCard
            icon={BookOpen}
            label="Modules Done"
            value={stats.completedModules}
            sub="Completed modules"
            color="emerald"
          />
          <StatCard
            icon={Calendar}
            label="Active Days"
            value={stats.totalActiveDays}
            sub="Days with XP activity"
            color="sky"
          />
          <StatCard
            icon={Star}
            label="Current Tier"
            value={user.currentTier}
            sub={`Last active ${lastActive}`}
            color="rose"
          />
        </div>

        {/* ── Activity Heatmap ── */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/80 p-6 sm:p-8">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-orange-500" />
                Activity History
              </h2>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                {stats.totalActiveDays} active day{stats.totalActiveDays !== 1 ? 's' : ''} in the past year
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold text-slate-600">{stats.totalXpEarned.toLocaleString()} XP</p>
              <p className="text-[10px] text-slate-400 font-medium">total earned</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <ActivityHeatmap heatmapData={activityHeatmap} />
          </div>
        </div>

        {/* ── Achievement Tier Path ── */}
        <div className="bg-white rounded-3xl shadow-sm ring-1 ring-slate-200/80 p-6 sm:p-8">
          <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mb-5">
            <Award className="w-4 h-4 text-orange-500" />
            Skill Tier Journey
          </h2>
          <div className="flex items-center gap-0">
            {[
              { tier: 'Beginner', icon: '🌱', color: 'emerald', desc: 'Building foundations' },
              { tier: 'Intermediate', icon: '🔥', color: 'amber', desc: 'Growing mastery' },
              { tier: 'Advanced', icon: '⚡', color: 'violet', desc: 'Expert knowledge' },
            ].map((t, i) => {
              const isActive = user.currentTier === t.tier;
              const isPast = (
                (t.tier === 'Beginner') ||
                (t.tier === 'Intermediate' && ['Intermediate', 'Advanced'].includes(user.currentTier)) ||
                (t.tier === 'Advanced' && user.currentTier === 'Advanced')
              );

              return (
                <React.Fragment key={t.tier}>
                  <div className={`flex-1 flex flex-col items-center text-center gap-1.5 p-3 rounded-2xl transition-all ${
                    isActive ? 'bg-orange-50 ring-2 ring-orange-300' : isPast ? 'bg-slate-50' : 'opacity-50'
                  }`}>
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shadow-sm ${
                      isActive ? 'bg-white shadow-md shadow-orange-200' : 'bg-white'
                    }`}>
                      {t.icon}
                    </div>
                    <p className={`text-xs font-extrabold ${isActive ? 'text-orange-700' : 'text-slate-600'}`}>{t.tier}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{t.desc}</p>
                    {isActive && (
                      <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-orange-500 text-white">CURRENT</span>
                    )}
                  </div>
                  {i < 2 && (
                    <div className={`h-0.5 w-6 rounded-full shrink-0 ${isPast ? 'bg-orange-300' : 'bg-slate-200'}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            to="/roadmap"
            className="group flex items-center gap-4 p-4 bg-white rounded-2xl ring-1 ring-slate-200/80 hover:ring-orange-300 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center group-hover:bg-orange-500 group-hover:text-white transition-colors shrink-0">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-orange-700 transition-colors">Continue Learning</p>
              <p className="text-xs text-slate-400 font-medium">Pick up where you left off</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-orange-500 ml-auto transition-colors" />
          </Link>
          <Link
            to="/assessment"
            className="group flex items-center gap-4 p-4 bg-white rounded-2xl ring-1 ring-slate-200/80 hover:ring-orange-300 hover:shadow-md transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center group-hover:bg-violet-500 group-hover:text-white transition-colors shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 group-hover:text-violet-700 transition-colors">Take Assessment</p>
              <p className="text-xs text-slate-400 font-medium">Test your current skill level</p>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-violet-500 ml-auto transition-colors" />
          </Link>
        </div>

      </div>
    </div>
  );
}
