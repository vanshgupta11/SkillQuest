import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Map, CheckCircle2, ChevronRight, Layers, Lock, PlayCircle,
  Loader2, Sparkles, Clock, ExternalLink, Youtube, FileText,
  AlertCircle, HelpCircle, TrendingUp, Compass, Award, Check,
  Filter, Zap
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DIFFICULTY_CONFIG = {
  Beginner:     { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700', dot: 'bg-emerald-500' },
  Intermediate: { badge: 'bg-amber-50 border-amber-200 text-amber-700',     dot: 'bg-amber-500' },
  Advanced:     { badge: 'bg-purple-50 border-purple-200 text-purple-700',   dot: 'bg-purple-500' },
};

const STATUS_CONFIG = {
  completed:   { label: 'Completed',   class: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  in_progress: { label: 'In Progress', class: 'bg-orange-50 border-orange-200 text-orange-700' },
  not_started: { label: 'Locked / Not Started', class: 'bg-slate-100 border-slate-200 text-slate-500' },
};

function ResourceLink({ resource }) {
  const isYouTube = resource.source === 'YouTube' || resource.url?.includes('youtube.com') || resource.url?.includes('youtu.be');
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200/80 hover:border-slate-300 transition-all group text-xs shadow-xs"
    >
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isYouTube ? 'bg-red-50 text-red-600 border border-red-200/80' : 'bg-orange-50 text-orange-600 border border-orange-200/80'
      }`}>
        {isYouTube ? <Youtube className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-slate-800 group-hover:text-slate-950 font-bold truncate text-xs">
          {resource.title}
        </div>
        <div className="text-slate-400 text-[10px] uppercase font-semibold mt-0.5 flex items-center gap-1.5">
          <span>{resource.source || 'Curated Guide'}</span>
          <span>•</span>
          <span className="text-slate-500">Verified Study Resource</span>
        </div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-800 shrink-0 transition-colors" />
    </a>
  );
}

function ModuleNode({ mod, index }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = mod.status === 'completed';
  const isInProgress = mod.status === 'in_progress';
  const isLocked = !mod.isUnlocked;
  const diffMeta = DIFFICULTY_CONFIG[mod.difficulty] || DIFFICULTY_CONFIG.Beginner;
  const statusConf = STATUS_CONFIG[mod.status] || STATUS_CONFIG.not_started;

  return (
    <div className="relative group">
      {/* Timeline Node Pin */}
      <div
        className={`absolute -left-[35px] md:-left-[43px] top-5 w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
          isCompleted
            ? 'bg-emerald-600 border-emerald-400 text-white shadow-emerald-500/20'
            : isInProgress
            ? 'bg-orange-600 border-orange-400 text-white ring-4 ring-orange-500/20 animate-pulse'
            : isLocked
            ? 'bg-slate-100 border-slate-300 text-slate-400'
            : mod.isRemedial
            ? 'bg-amber-500 border-amber-300 text-white'
            : 'bg-white border-slate-300 text-slate-700'
        }`}
      >
        {isCompleted ? (
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
        ) : isLocked ? (
          <Lock className="w-3.5 h-3.5" />
        ) : (
          <span>{index + 1}</span>
        )}
      </div>

      {/* Module Card */}
      <div
        className={`card-modern-elevated transition-all overflow-hidden ${
          mod.isRemedial
            ? 'bg-gradient-to-br from-amber-50/70 via-white to-amber-50/30 border-amber-300 shadow-sm'
            : isInProgress
            ? 'bg-white border-orange-400 shadow-md ring-2 ring-orange-400/20'
            : isLocked
            ? 'bg-slate-50/70 border-slate-200/80 opacity-65'
            : isCompleted
            ? 'bg-slate-50/50 border-slate-200/90'
            : 'bg-white border-slate-200/90'
        }`}
      >
        <div className="p-5 sm:p-6">
          {/* Card Meta Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 font-heading">
                Module {index + 1}
              </span>

              {mod.isRemedial && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-amber-700" /> Remedial Calibration
                </span>
              )}

              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-bold ${diffMeta.badge}`}>
                {mod.difficulty}
              </span>

              {mod.estimatedHours && (
                <span className="flex items-center gap-1 text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md">
                  <Clock className="w-3 h-3" /> ~{mod.estimatedHours}h
                </span>
              )}

              <span className="text-[11px] font-bold text-amber-600 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Zap className="w-3 h-3 fill-amber-500" /> +50 XP Bounty
              </span>
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold capitalize border ${statusConf.class}`}>
              {statusConf.label}
            </span>
          </div>

          <h3 className={`text-base sm:text-lg font-bold mb-1.5 font-heading ${isLocked ? 'text-slate-500' : 'text-slate-900'}`}>
            {mod.title}
          </h3>
          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed line-clamp-2">
            {mod.description}
          </p>

          {/* Action Row */}
          <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-100">
            <button
              onClick={() => setExpanded((e) => !e)}
              disabled={isLocked}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 disabled:opacity-30 transition-colors"
            >
              <Layers className="w-4 h-4 text-orange-600" />
              <span>{mod.resources?.length || 0} Learning Resources</span>
              <span className="text-[10px] text-slate-400">{expanded ? '▲' : '▼'}</span>
            </button>

            {isLocked ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-400 bg-slate-100 border border-slate-200">
                <Lock className="w-3.5 h-3.5" /> Complete Prior Module
              </span>
            ) : (
              <Link
                to={`/course/${mod._id}`}
                id={`open-module-${mod._id}`}
                className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                  isInProgress
                    ? 'btn-primary-gradient'
                    : isCompleted
                    ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800'
                    : mod.isRemedial
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-slate-900 hover:bg-slate-800 text-white'
                }`}
              >
                {isCompleted ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Review Course</>
                ) : isInProgress ? (
                  <><PlayCircle className="w-3.5 h-3.5" /> Continue Module</>
                ) : (
                  <>Start Module <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Expandable Resources */}
        {expanded && !isLocked && mod.resources?.length > 0 && (
          <div className="border-t border-slate-100 p-5 space-y-2.5 bg-slate-50/70">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" /> Curated Video & Reading Material
            </div>
            {mod.resources.map((res, i) => (
              <ResourceLink key={i} resource={res} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function RoadmapPage() {
  const { getAuthHeaders } = useAuth();
  const [roadmap, setRoadmap] = useState(null);
  const [userTier, setUserTier] = useState('Beginner');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all'); // 'all' | 'in_progress' | 'completed' | 'locked'

  useEffect(() => {
    fetch('/api/roadmap', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setRoadmap(data.status === 'no_roadmap' || !data.roadmap ? null : data.roadmap);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load quest path from backend.');
        setLoading(false);
      });

    fetch('/api/auth/me', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((d) => {
        if (d.user?.currentTier) setUserTier(d.user.currentTier);
      })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600 mx-auto mb-3" />
        <div className="text-slate-800 font-bold text-sm">Calibrating Quest Path…</div>
        <div className="text-slate-400 text-xs mt-1">Fetching adaptive modules & verified resources</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <div className="text-rose-700 font-bold text-sm">{error}</div>
      </div>
    );
  }

  const modules = roadmap?.modules || [];
  const completedCount = modules.filter((m) => m.status === 'completed').length;
  const progressPercent = modules.length > 0 ? Math.round((completedCount / modules.length) * 100) : 0;

  const filteredModules = modules.filter((mod) => {
    if (filter === 'completed') return mod.status === 'completed';
    if (filter === 'in_progress') return mod.status === 'in_progress';
    if (filter === 'locked') return !mod.isUnlocked;
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-fadeIn">

      {/* Quest Path Header Banner */}
      <div className="card-modern-elevated p-6 sm:p-8 bg-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold uppercase tracking-wider">
                <Compass className="w-3.5 h-3.5 text-orange-600" /> Interactive Quest Path
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold">
                <TrendingUp className="w-3.5 h-3.5 text-slate-500" /> Calibrated Tier: {userTier}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
              {roadmap ? roadmap.goal : 'Your Learning Roadmap'}
            </h1>
            {roadmap?.summary && (
              <p className="text-slate-600 text-xs sm:text-sm mt-1.5 leading-relaxed">
                {roadmap.summary}
              </p>
            )}
          </div>

          {/* Progress Gauge */}
          {roadmap && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-center shrink-0 min-w-[180px]">
              <div className="text-2xl font-extrabold text-orange-600 font-heading">
                {progressPercent}%
              </div>
              <div className="text-xs font-bold text-slate-800 mt-0.5">
                {completedCount} of {modules.length} Cleared
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-2">
                <div
                  className="h-full bg-orange-600 rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Filter Tabs */}
        {roadmap && modules.length > 0 && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-slate-400 mr-1 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter:
              </span>
              {[
                { id: 'all', label: `All (${modules.length})` },
                { id: 'in_progress', label: `In Progress (${modules.filter(m => m.status === 'in_progress').length})` },
                { id: 'completed', label: `Completed (${completedCount})` },
                { id: 'locked', label: `Locked (${modules.filter(m => !m.isUnlocked).length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filter === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Link
              to="/dashboard"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              Change Goal / Re-synthesize →
            </Link>
          </div>
        )}
      </div>

      {/* Empty State */}
      {!roadmap ? (
        <div className="card-modern-elevated p-12 bg-white text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 mx-auto shadow-sm">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 font-heading">
            No Active Quest Path Found
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto leading-relaxed">
            Head over to your Dashboard or run a Skill Diagnostic to synthesize an AI-tailored study roadmap.
          </p>
          <div className="pt-2">
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl btn-primary-gradient text-xs font-bold shadow-md"
            >
              <Map className="w-4 h-4" /> Go to Dashboard & Build Path
            </Link>
          </div>
        </div>
      ) : (
        /* Vertical Illuminated Timeline */
        <div className="relative border-l-2 border-orange-200/90 ml-4 md:ml-8 pl-6 md:pl-8 space-y-7">
          {filteredModules.map((mod, index) => (
            <ModuleNode key={mod._id || index} mod={mod} index={index} />
          ))}

          {/* Quest Path Finish Marker */}
          <div className="relative pt-2">
            <div className="absolute -left-[35px] md:-left-[43px] top-6 w-8 h-8 rounded-full bg-slate-900 border-2 border-orange-400 flex items-center justify-center text-orange-400 shadow-md">
              <Award className="w-4 h-4" />
            </div>
            <div className="p-6 rounded-2xl bg-slate-950 text-white text-center border border-slate-800 shadow-lg">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-orange-400 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Platform Certification
              </div>
              <h3 className="text-base font-bold font-heading">Complete All Modules to Graduate</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Each completed study guide and passed quiz accumulates XP and unlocks platform mastery badges.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
