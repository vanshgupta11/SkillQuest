import React from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import AssessmentPage from './pages/AssessmentPage';
import RoadmapPage from './pages/RoadmapPage';
import CourseDetailPage from './pages/CourseDetailPage';
import StudyRoomsPage from './pages/StudyRoomsPage';
import StudyRoomDetailPage from './pages/StudyRoomDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import QuizPage from './pages/QuizPage';
import LeaderboardPage from './pages/LeaderboardPage';
import PeerReviewPage from './pages/PeerReviewPage';
import { Compass, Sparkles } from 'lucide-react';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const isAuthPage = ['/login', '/register'].includes(location.pathname);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm font-semibold">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-orange-500/25 animate-bounce">
            <Compass className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <div className="w-3.5 h-3.5 rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
            <span>Calibrating SkillQuest Engine…</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-orange-500 selection:text-white">
      {!isAuthPage && <Navbar />}
      <main className="flex-1">
        <Routes>
          <Route
            path="/"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
          />
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
          />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/assessment" element={<AssessmentPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/course/:id" element={<CourseDetailPage />} />
          <Route path="/rooms" element={<StudyRoomsPage />} />
          <Route path="/room/:code" element={<StudyRoomDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/quiz/:id" element={<QuizPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/peer-review" element={<PeerReviewPage />} />
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </main>

      {/* Modern High-Aesthetic Footer */}
      {!isAuthPage && (
        <footer className="border-t border-slate-200/80 bg-white/70 backdrop-blur-md py-8 mt-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-lg bg-orange-600 flex items-center justify-center text-white text-[10px] font-bold">
                <Compass className="w-3.5 h-3.5" />
              </div>
              <span className="font-extrabold text-slate-800 font-heading">SkillQuest</span>
              <span>·</span>
              <span>Adaptive AI Skill-Learning Platform</span>
            </div>

            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-700">All Systems Operational</span>
              </div>
              <span>&copy; {new Date().getFullYear()} SkillQuest</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
