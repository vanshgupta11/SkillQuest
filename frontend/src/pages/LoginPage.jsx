import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, ArrowRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      setLoading(false);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo@skillquest.io', 'demo1234');
      setLoading(false);
      navigate('/dashboard');
    } catch {
      // If demo user doesn't exist yet, auto register demo
      try {
        const { register } = useAuth();
        await register('Demo User', 'demo@skillquest.io', 'demo1234');
        setLoading(false);
        navigate('/dashboard');
      } catch {
        setError('Could not connect to authentication server.');
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center px-4 py-12 bg-zinc-50/60">
      <div className="w-full max-w-[400px]">
        
        {/* Brand Icon Header */}
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-orange-600/20">
            <Compass className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight font-heading">
            Sign in to SkillQuest
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Adaptive skill diagnostics & personalized learning paths
          </p>
        </div>

        {/* Clean Modern Card */}
        <div className="bg-white rounded-2xl p-7 border border-zinc-200/90 shadow-sm">
          
          {/* Quick Demo Access Button */}
          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading}
            className="w-full mb-5 py-2.5 px-4 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200/80 text-orange-950 text-xs font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            <span>Quick Demo Sign In (1-Click)</span>
          </button>

          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-zinc-200/80 w-full" />
            <span className="bg-white px-3 text-[11px] uppercase tracking-wider text-zinc-400 font-medium shrink-0">
              or enter credentials
            </span>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-zinc-700">
                  Password
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] mt-2"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Signing In…</>
              ) : (
                <><ArrowRight className="w-3.5 h-3.5" /> Sign In</>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-zinc-100 text-center text-xs text-zinc-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-orange-600 font-semibold hover:text-orange-700 hover:underline">
              Create Account
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
