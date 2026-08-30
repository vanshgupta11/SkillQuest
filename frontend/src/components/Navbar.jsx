import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Compass, Map, ShieldCheck, LogOut, LogIn, UserPlus, Flame } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  const isActive = (path) => {
    if (path === '/dashboard' && (location.pathname === '/' || location.pathname === '/dashboard')) {
      return true;
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: Compass },
    { label: 'Diagnostic', path: '/assessment', icon: ShieldCheck },
    { label: 'Quest Path', path: '/roadmap', icon: Map },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">

          {/* SkillQuest Brand Logo */}
          <Link to={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-orange-600 flex items-center justify-center text-white shadow-sm transition-transform duration-200 group-hover:scale-105">
              <Compass className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="font-heading font-extrabold text-base tracking-tight text-zinc-900">
                SkillQuest
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            </div>
          </Link>

          {/* Navigation Links */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      active
                        ? 'bg-zinc-900 text-white font-semibold shadow-sm'
                        : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${active ? 'text-orange-400' : 'text-zinc-400'}`} />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* User Controls */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <div
                  title="Daily Streak — complete 1 module per day to keep lit!"
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 text-[11px] font-bold text-orange-950 shadow-xs"
                >
                  <Flame className="w-4 h-4 text-orange-600 fill-orange-500 animate-pulse shrink-0" />
                  <span>{user.streakDays || 1}d Streak</span>
                </div>

                <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
                  <div className="hidden lg:flex flex-col text-right">
                    <span className="text-xs font-semibold text-zinc-800 truncate max-w-[120px]">
                      {user.fullName || user.email?.split('@')[0]}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-medium">
                      {user.currentTier || 'Beginner'} · Lv.{user.level || 1}
                    </span>
                  </div>

                  <button
                    onClick={logout}
                    title="Sign Out"
                    className="p-1.5 rounded-lg bg-zinc-100 hover:bg-rose-50 text-zinc-500 hover:text-rose-600 border border-zinc-200/60 hover:border-rose-200 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 inline mr-1" /> Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white shadow-sm transition-all hover:scale-[1.01] active:scale-95 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Register
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
