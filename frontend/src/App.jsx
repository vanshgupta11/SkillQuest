import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import DashboardPage from './pages/DashboardPage';
import AssessmentPage from './pages/AssessmentPage';
import RoadmapPage from './pages/RoadmapPage';
import CourseDetailPage from './pages/CourseDetailPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 text-zinc-500 text-sm font-medium">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full border-2 border-orange-600 border-t-transparent animate-spin" />
          <span>Loading SkillQuest…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 text-zinc-900 font-sans selection:bg-orange-500 selection:text-white">
      <Navbar />
      <main className="flex-1">
        <Routes>
          {/* Default route is /login if unauthenticated, else /dashboard */}
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
          <Route
            path="*"
            element={<Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />}
          />
        </Routes>
      </main>
      <footer className="border-t border-zinc-200/80 bg-white py-6 text-center text-xs text-zinc-400">
        SkillQuest &copy; 2026 · Adaptive Skill Learning Platform
      </footer>
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
