import React, { useEffect, useRef } from 'react';
import { Zap, TrendingUp, Flame } from 'lucide-react';

/**
 * XpToast — animated overlay shown after completing a module.
 * Auto-dismisses after `duration` ms (default 4500).
 */
export default function XpToast({
  show,
  xpGained = 0,
  breakdown = {},
  streakDays = 0,
  newLevel = 1,
  levelUp = false,
  onDismiss,
  duration = 4500,
}) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (!show) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onDismiss?.();
    }, duration);
    return () => clearTimeout(timerRef.current);
  }, [show, duration, onDismiss]);

  if (!show) return null;

  return (
    <div
      className="fixed top-5 right-5 z-50 max-w-sm w-full"
      role="alert"
      aria-live="polite"
      style={{ animation: 'slideInRight 0.35s cubic-bezier(0.22, 1, 0.36, 1) forwards' }}
    >
      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(120px) scale(0.92); }
          to   { opacity: 1; transform: translateX(0)     scale(1); }
        }
      `}</style>

      <div className="bg-white border border-orange-200 rounded-2xl shadow-xl shadow-orange-100/60 overflow-hidden">
        {/* Progress shimmer bar */}
        <div className="h-1 w-full bg-gray-100 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500"
            style={{ animation: `shrinkBar ${duration}ms linear forwards` }}
          />
          <style>{`
            @keyframes shrinkBar {
              from { transform: scaleX(1); transform-origin: left; }
              to   { transform: scaleX(0); transform-origin: left; }
            }
          `}</style>
        </div>

        <div className="p-5">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center">
                <Zap className="w-5 h-5 text-orange-600 fill-orange-100" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-orange-500">XP Awarded</div>
                <div className="text-2xl font-extrabold text-gray-900 leading-tight">
                  +{xpGained} <span className="text-orange-600">XP</span>
                </div>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1 transition-colors"
              aria-label="Close"
            >
              ×
            </button>
          </div>

          {/* Breakdown */}
          {breakdown.formula && (
            <div className="mb-3 p-3 rounded-xl bg-gray-50 border border-gray-200 font-mono text-xs text-gray-600">
              {breakdown.formula}
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 flex-wrap">
            {streakDays > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                {streakDays}-Day Streak
              </div>
            )}
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-orange-50 border border-orange-200 text-orange-700 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              Level {newLevel}
            </div>
            {levelUp && (
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-bold animate-pulse">
                🎉 Level Up!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
