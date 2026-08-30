import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Compass, Mail, Lock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register(fullName, email, password);
      setLoading(false);
      navigate('/assessment');
    } catch (err) {
      setError(err.message || 'Registration failed');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-130px)] flex items-center justify-center px-4 py-12 bg-zinc-50/60">
      <div className="w-full max-w-[400px]">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="w-11 h-11 rounded-xl bg-orange-600 flex items-center justify-center text-white mx-auto mb-3 shadow-md shadow-orange-600/20">
            <Compass className="w-6 h-6 stroke-[2.2]" />
          </div>
          <h1 className="text-xl font-bold text-zinc-900 tracking-tight font-heading">
            Create SkillQuest Account
          </h1>
          <p className="text-zinc-500 text-xs mt-1">
            Start your adaptive learning & mastery journey
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl p-7 border border-zinc-200/90 shadow-sm">
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  id="register-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  id="register-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="dev@skillquest.io"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-3" />
                <input
                  id="register-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="•••••••• (min 6 characters)"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-white border border-zinc-200 text-zinc-900 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900 transition-all placeholder:text-zinc-400"
                />
              </div>
            </div>

            <button
              id="register-submit-btn"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] mt-2"
            >
              {loading ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Account…</>
              ) : (
                <><ArrowRight className="w-3.5 h-3.5" /> Create Account</>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-zinc-100 text-center text-xs text-zinc-500">
            Already have an account?{' '}
            <Link to="/login" className="text-orange-600 font-semibold hover:text-orange-700 hover:underline">
              Sign In
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
