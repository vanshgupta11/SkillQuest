import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Map, CheckCircle2, ChevronRight, Layers, Lock, PlayCircle,
  Loader2, Sparkles, Clock, ExternalLink, Youtube, FileText,
  AlertCircle, HelpCircle, TrendingUp, Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const DIFFICULTY_COLORS = {
  Beginner:     { badge: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  Intermediate: { badge: 'bg-amber-50 border-amber-200 text-amber-700' },
  Advanced:     { badge: 'bg-orange-50 border-orange-200 text-orange-700' },
};

const STATUS_CONFIG = {
  completed:   { label: 'Completed',   class: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  in_progress: { label: 'In Progress', class: 'bg-orange-50 border-orange-200 text-orange-700' },
  not_started: { label: 'Not Started', class: 'bg-zinc-100 border-zinc-200 text-zinc-500' },
};

function ResourceLink({ resource }) {
  const isYouTube = resource.source === 'YouTube';
  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-zinc-200/80 hover:border-zinc-300 transition-all group text-xs"
    >
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isYouTube ? 'bg-red-50 border border-red-200' : 'bg-orange-50 border border-orange-200'}`}>
        {isYouTube ? <Youtube className="w-3.5 h-3.5 text-red-600" /> : <FileText className="w-3.5 h-3.5 text-orange-600" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-zinc-800 group-hover:text-zinc-950 font-medium truncate text-xs">{resource.title}</div>
        <div className="text-zinc-400 text-[10px] uppercase font-semibold mt-0.5">{resource.source}</div>
      </div>
      <ExternalLink className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-700 flex-shrink-0 transition-colors" />
    </a>
  );
}

function ModuleNode({ mod, index }) {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = mod.status === 'completed';
  const isInProgress = mod.status === 'in_progress';
  const isLocked = !mod.isUnlocked;
  const colors = DIFFICULTY_COLORS[mod.difficulty] || DIFFICULTY_COLORS.Beginner;
  const statusConf = STATUS_CONFIG[mod.status] || STATUS_CONFIG.not_started;

  return (
    <div className="relative group">
      {/* Timeline node */}
      <div
        className={`absolute -left-[31px] md:-left-[39px] top-5 w-6 h-6 rounded-full border-2 flex items-center justify-center text-[11px] font-bold transition-all ${
          isCompleted
            ? 'bg-emerald-600 border-emerald-500 text-white'
            : isInProgress
            ? 'bg-orange-600 border-orange-500 text-white'
            : isLocked
            ? 'bg-zinc-100 border-zinc-300 text-zinc-400'
            : mod.isRemedial
            ? 'bg-amber-500 border-amber-400 text-white'
            : 'bg-white border-zinc-300 text-zinc-600'
        }`}
      >
        {isCompleted ? <CheckCircle2 className="w-3.5 h-3.5 stroke-[3]" /> : isLocked ? <Lock className="w-3 h-3" /> : <span>{index + 1}</span>}
      </div>

      {/* Module Card */}
      <div
        className={`rounded-2xl border transition-all ${
          mod.isRemedial
            ? 'bg-amber-50/50 border-amber-200'
            : isInProgress
            ? 'bg-white border-orange-300 shadow-sm'
            : isLocked
            ? 'bg-zinc-50/60 border-zinc-200/80 opacity-60'
            : isCompleted
            ? 'bg-zinc-50/60 border-zinc-200/80'
            : 'bg-white border-zinc-200/90 hover:border-zinc-300 shadow-sm'
        }`}
      >
        {/* Card header */}
        <div className="p-5">
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-600 font-heading">
                Module {index + 1}
              </span>

              {mod.isRemedial && (
                <span className="px-2 py-0.5 rounded-md bg-amber-100 border border-amber-300 text-amber-800 text-[11px] font-semibold flex items-center gap-1">
                  <HelpCircle className="w-3 h-3" /> Remedial Review
                </span>
              )}

              <span className={`px-2 py-0.5 rounded-md border text-[11px] font-semibold ${colors.badge}`}>
                {mod.difficulty}
              </span>

              {mod.estimatedHours && (
                <span className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium">
                  <Clock className="w-3 h-3" /> ~{mod.estimatedHours}h
                </span>
              )}
            </div>

            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold capitalize border ${statusConf.class}`}>
              {statusConf.label}
            </span>
          </div>

          <h3 className={`text-base font-bold mb-1 font-heading ${isLocked ? 'text-zinc-400' : 'text-zinc-900'}`}>
            {mod.title}
          </h3>
          <p className="text-zinc-500 text-xs leading-relaxed line-clamp-2">{mod.description}</p>

          {/* Action row */}
          <div className="flex items-center justify-between mt-4 pt-3 border-t border-zinc-100">
            <button
              onClick={() => setExpanded((e) => !e)}
              disabled={isLocked}
              className="flex items-center gap-1 text-xs font-semibold text-zinc-500 hover:text-zinc-900 disabled:opacity-30 transition-colors"
            >
              <Layers className="w-3.5 h-3.5" />
              {mod.resources?.length || 0} Resources {expanded ? '▲' : '▼'}
            </button>

            {isLocked ? (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-zinc-400 bg-zinc-100 border border-zinc-200">
                <Lock className="w-3 h-3" /> Locked
              </span>
            ) : (
              <Link
                to={`/course/${mod._id}`}
                id={`open-module-${mod._id}`}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all ${
                  isInProgress
                    ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-sm'
                    : isCompleted
                    ? 'bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700'
                    : mod.isRemedial
                    ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-sm'
                    : 'bg-zinc-900 hover:bg-zinc-800 text-white'
                }`}
              >
                {isCompleted ? (
                  <><CheckCircle2 className="w-3.5 h-3.5" /> Review</>
                ) : isInProgress ? (
                  <><PlayCircle className="w-3.5 h-3.5" /> Resume</>
                ) : (
                  <>Start Module <ChevronRight className="w-3.5 h-3.5" /></>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* Expandable resources */}
        {expanded && !isLocked && mod.resources?.length > 0 && (
          <div className="border-t border-zinc-100 p-4 space-y-2 bg-zinc-50/50 rounded-b-2xl">
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-2">Curated Resources</div>
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

  useEffect(() => {
    fetch('/api/roadmap', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        setRoadmap(data.status === 'no_roadmap' || !data.roadmap ? null : data.roadmap);
        setLoading(false);
      })
      .catch(() => { setError('Could not load quest path from backend.'); setLoading(false); });

    fetch('/api/auth/me', { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((d) => { if (d.user?.currentTier) setUserTier(d.user.currentTier); })
      .catch(() => {});
  }, []);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
        <div className="text-zinc-600 font-semibold text-xs">Loading Quest Path…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto mb-3" />
        <div className="text-rose-600 font-semibold text-xs">{error}</div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 border border-orange-200 text-orange-800 text-xs font-semibold">
            <Compass className="w-3.5 h-3.5 text-orange-600" /> Active Quest Path
          </div>
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-zinc-100 border border-zinc-200 text-zinc-700 text-xs font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-zinc-500" /> Proficiency Tier: {userTier}
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 font-heading">
          {roadmap ? roadmap.goal : 'Your Learning Roadmap'}
        </h1>
        {roadmap?.summary && (
          <p className="text-zinc-500 text-xs sm:text-sm mt-1 max-w-2xl leading-relaxed">{roadmap.summary}</p>
        )}
      </div>

      {/* No Roadmap */}
      {!roadmap ? (
        <div className="bg-white rounded-2xl p-10 border border-zinc-200/90 shadow-sm text-center">
          <Sparkles className="w-10 h-10 text-orange-500 mx-auto mb-3 opacity-60" />
          <h2 className="text-lg font-bold text-zinc-900 mb-1 font-heading">No Quest Path Created Yet</h2>
          <p className="text-zinc-500 text-xs max-w-md mx-auto mb-5">
            Go to your Dashboard, enter your target topic, and build your personalized quest path.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs shadow-sm transition-all"
          >
            <Map className="w-3.5 h-3.5" /> Go to Dashboard
          </Link>
        </div>
      ) : (
        /* Timeline */
        <div className="relative border-l-2 border-zinc-200 ml-4 md:ml-8 pl-6 md:pl-8 space-y-6">
          {roadmap.modules?.map((mod, index) => (
            <ModuleNode key={mod._id || index} mod={mod} index={index} />
          ))}

          {/* End marker */}
          <div className="relative">
            <div className="absolute -left-[31px] md:-left-[39px] top-2 w-6 h-6 rounded-full bg-orange-600 border-2 border-orange-500 flex items-center justify-center text-white">
              <Sparkles className="w-3 h-3" />
            </div>
            <div className="p-5 rounded-2xl bg-zinc-900 text-white text-center">
              <div className="text-xs font-bold font-heading">Quest Path Complete</div>
              <div className="text-[11px] text-zinc-400 mt-0.5">Finish all study modules to earn your SkillQuest certification</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
