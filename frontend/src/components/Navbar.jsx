import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Compass, Map, ShieldCheck, LogOut, LogIn, UserPlus,
  Flame, Menu, X, ChevronRight, Radio, User, Settings,
  Trophy, Zap, ChevronDown, Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    { label: 'Lounges', path: '/rooms', icon: Radio },
    { label: 'Leaderboard', path: '/leaderboard', icon: Trophy },
    { label: 'Peer Review', path: '/peer-review', icon: Users },
  ];

  const getTierColor = (tier) => {
    switch (tier?.toLowerCase()) {
      case 'advanced':
        return 'text-purple-700 bg-purple-50 border-purple-200/80';
      case 'intermediate':
        return 'text-amber-700 bg-amber-50 border-amber-200/80';
      default:
        return 'text-emerald-700 bg-emerald-50 border-emerald-200/80';
    }
  };

  // Streak is "alive" if lastActiveAt was within the last 48 hours
  const isStreakAlive = () => {
    if (!user?.lastActiveAt) return false;
    const msSinceLast = Date.now() - new Date(user.lastActiveAt).getTime();
    return msSinceLast <= 48 * 60 * 60 * 1000;
  };

  const streakCount = user?.streakDays || 0;
  const streakAlive = isStreakAlive();

  const handleLogout = () => {
    logout();
    setProfileOpen(false);
    navigate('/login');
  };

  const avatarInitial = (user?.fullName || user?.email || '?')[0].toUpperCase();

  return (
    <nav className="sticky top-0 z-50 glass-header">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* SkillQuest Brand Logo */}
          <Link to={isAuthenticated ? "/dashboard" : "/login"} className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-orange-500/25 transition-transform duration-200 group-hover:scale-105">
                <Compass className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-heading font-extrabold text-lg tracking-tight text-slate-900 group-hover:text-orange-600 transition-colors">
                  SkillQuest
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 uppercase tracking-wider">
                  AI
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium -mt-0.5 hidden sm:block">
                Adaptive Mastery Engine
              </span>
            </div>
          </Link>

          {/* Navigation Links (Desktop) */}
          <div className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1.5 rounded-xl border border-slate-200/60">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  id={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                    active
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60 font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${active ? 'text-orange-600' : 'text-slate-400'}`} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User Controls & Actions */}
          <div className="flex items-center gap-2.5">
            {isAuthenticated ? (
              <>
                {/* Streak Badge */}
                <div
                  title={
                    streakAlive
                      ? `🔥 ${streakCount}-day streak! Keep it going!`
                      : streakCount > 0
                      ? `⚠️ Streak at risk — complete a module today!`
                      : `Start your streak — complete a module today!`
                  }
                  className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold shadow-xs border transition-all ${
                    streakAlive && streakCount > 0
                      ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-500/5 border-orange-300/60 text-orange-900'
                      : streakCount > 0
                      ? 'bg-amber-50/80 border-amber-200/60 text-amber-700'
                      : 'bg-slate-50 border-slate-200/60 text-slate-500'
                  }`}
                >
                  <Flame
                    className={`w-4 h-4 shrink-0 ${
                      streakAlive && streakCount > 0
                        ? 'text-orange-600 fill-orange-500 animate-pulse'
                        : streakCount > 0
                        ? 'text-amber-500 fill-amber-400'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>
                    {streakCount > 0 ? `${streakCount}d` : '0d'} Streak
                    {!streakAlive && streakCount > 0 && (
                      <span className="ml-1 text-[9px] text-amber-500 font-bold">!</span>
                    )}
                  </span>
                </div>

                {/* Profile Avatar Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    id="nav-profile-btn"
                    onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 pl-2 sm:pl-2.5 sm:border-l sm:border-slate-200/80 focus:outline-none"
                  >
                    {/* Hidden desktop name/tier info */}
                    <div className="hidden lg:flex flex-col text-right">
                      <span className="text-xs font-bold text-slate-800 truncate max-w-[120px]">
                        {user.fullName || user.email?.split('@')[0]}
                      </span>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span className={`text-[10px] font-semibold px-1.5 rounded border ${getTierColor(user.currentTier)}`}>
                          {user.currentTier || 'Beginner'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Lv.{user.level || 1}
                        </span>
                      </div>
                    </div>

                    {/* Avatar circle */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white text-sm font-extrabold shadow-sm hover:shadow-md hover:scale-105 transition-all border-2 border-white ring-1 ring-orange-300/50">
                      {avatarInitial}
                    </div>

                    <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown Menu */}
                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-2xl shadow-xl ring-1 ring-slate-200/80 border border-slate-100 overflow-hidden z-50 animate-slide-down">
                      {/* User Info Header */}
                      <div className="px-4 py-3 bg-gradient-to-br from-orange-50 to-amber-50 border-b border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center text-white font-extrabold text-sm shadow-sm">
                            {avatarInitial}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 truncate">{user.fullName || 'Developer'}</p>
                            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                          </div>
                        </div>
                        {/* Mini XP/Level bar */}
                        <div className="mt-2.5">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                              <Zap className="w-3 h-3 text-orange-500" /> Level {user.level || 1}
                            </span>
                            <span className="text-[10px] font-bold text-orange-600">{(user.totalXp || 0).toLocaleString()} XP</span>
                          </div>
                          <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full"
                              style={{ width: `${user.progressPercent || 0}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1.5">
                        <Link
                          to="/profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold">View Profile</span>
                          <span className="ml-auto text-[10px] font-bold text-orange-500 bg-orange-100 px-1.5 py-0.5 rounded-full">NEW</span>
                        </Link>
                        <Link
                          to="/roadmap"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-orange-50 hover:text-orange-700 transition-colors"
                        >
                          <Trophy className="w-4 h-4 text-slate-400" />
                          <span className="font-semibold">My Quest Path</span>
                        </Link>
                      </div>

                      {/* Divider + Logout */}
                      <div className="border-t border-slate-100 py-1.5">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-600 hover:bg-rose-50 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          <span className="font-semibold">Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5 inline mr-1 text-slate-500" /> Sign In
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 rounded-xl text-xs font-semibold btn-primary-gradient flex items-center gap-1.5"
                >
                  <UserPlus className="w-3.5 h-3.5" /> Get Started
                </Link>
              </div>
            )}

            {/* Mobile Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 px-2 border-t border-slate-200/80 bg-white/95 backdrop-blur-md rounded-b-2xl shadow-lg mb-2">
            <div className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      active
                        ? 'bg-orange-50 text-orange-900 border border-orange-200'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${active ? 'text-orange-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                );
              })}

              {/* Profile link in mobile */}
              {isAuthenticated && (
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive('/profile')
                      ? 'bg-orange-50 text-orange-900 border border-orange-200'
                      : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <User className={`w-4 h-4 ${isActive('/profile') ? 'text-orange-600' : 'text-slate-400'}`} />
                    <span>My Profile</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              )}
            </div>

            {isAuthenticated && user && (
              <div className="mt-3 pt-3 border-t border-slate-100 px-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-semibold text-slate-700">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-rose-600 font-semibold hover:text-rose-700"
                >
                  <LogOut className="w-3.5 h-3.5" /> Sign Out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
