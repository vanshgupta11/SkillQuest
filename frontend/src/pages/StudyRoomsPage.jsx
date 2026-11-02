import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Users, Radio, Mic, MicOff, Volume2, Plus, ArrowRight,
  Sparkles, BookOpen, Hash, Copy, Check, Search, Shield,
  Loader2, AlertCircle, MessageSquare, Headphones
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StudyRoomsPage() {
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(null);

  // Create room modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomTopic, setNewRoomTopic] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const fetchRooms = () => {
    fetch('/api/rooms')
      .then((r) => r.json())
      .then((d) => {
        setRooms(d.rooms || []);
        setLoading(false);
      })
      .catch(() => {
        setError('Could not load community study rooms.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCopyCode = (e, code) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleJoinByCode = (e) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    const cleanCode = joinCodeInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
    navigate(`/room/${cleanCode}`);
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!newRoomName.trim() || newRoomName.trim().length < 3) {
      setCreateError('Room name must be at least 3 characters.');
      return;
    }
    setCreating(true);
    setCreateError('');

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: newRoomName.trim(),
          topic: newRoomTopic.trim() || 'Collaborative study & peer learning session',
          customCode: customCode.trim() || undefined,
          creatorName: user?.fullName || user?.email?.split('@')[0] || 'Student Explorer',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setCreateError(data.message || 'Failed to create room.');
        setCreating(false);
        return;
      }

      setCreating(false);
      setShowCreateModal(false);
      navigate(`/room/${data.room.code}`);
    } catch {
      setCreateError('Network error creating study room.');
      setCreating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fadeIn">

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white p-7 sm:p-10 border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 rounded-full bg-orange-600/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-20 w-80 h-80 rounded-full bg-indigo-600/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-orange-400 text-xs font-semibold mb-3">
              <Radio className="w-3.5 h-3.5 animate-pulse text-orange-400" />
              <span>SkillQuest Live Peer Community</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight font-heading leading-tight">
              Study Rooms &amp; <span className="gradient-accent-orange">Live Audio Lounges</span>
            </h1>
            <p className="text-slate-300 mt-2.5 text-xs sm:text-sm leading-relaxed max-w-xl">
              Join interactive study session rooms using unique room codes. Share voice audio in real time, discuss curriculum concepts, compare code snippets, and master modules together.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col gap-3 shrink-0">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-3 rounded-xl btn-primary-gradient text-xs font-bold flex items-center justify-center gap-2 shadow-md whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Create Study Room
            </button>
          </div>
        </div>
      </div>

      {/* Quick Join By Code Bar */}
      <div className="card-modern-elevated p-5 sm:p-6 bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
              <Hash className="w-4 h-4 text-orange-600" /> Have a Study Room Code?
            </h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Enter any 6-character room code shared by your classmates or study group.
            </p>
          </div>

          <form onSubmit={handleJoinByCode} className="flex items-center gap-2.5 w-full sm:w-auto">
            <input
              type="text"
              value={joinCodeInput}
              onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
              placeholder="e.g. QUEST-101"
              className="px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs uppercase font-mono font-bold tracking-wider focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 w-full sm:w-48 placeholder:normal-case placeholder:font-sans placeholder:font-normal"
            />
            <button
              type="submit"
              disabled={!joinCodeInput.trim()}
              className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold transition-all shadow-xs shrink-0 flex items-center gap-1.5"
            >
              Join <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Active Community Study Rooms Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900 font-heading">
              Active Community Lounges
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Live Now
            </span>
          </div>

          <span className="text-xs text-slate-400 font-semibold">
            {rooms.length} Active Rooms
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-orange-600 mx-auto mb-3" />
            <div className="text-slate-700 font-bold text-xs">Finding Active Study Rooms…</div>
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
        ) : rooms.length === 0 ? (
          <div className="card-modern-elevated p-12 bg-white text-center space-y-3">
            <Headphones className="w-10 h-10 text-orange-500 mx-auto opacity-40" />
            <h3 className="text-sm font-bold text-slate-900 font-heading">No Active Study Rooms Right Now</h3>
            <p className="text-slate-500 text-xs max-w-sm mx-auto">
              Be the first to open a study lounge! Create a room and invite your peers to learn together.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="mt-2 px-5 py-2.5 rounded-xl btn-primary-gradient text-xs font-bold"
            >
              Create Study Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {rooms.map((room) => {
              const activeCount = room.participants?.length || 0;
              const isCopied = copiedCode === room.code;

              return (
                <div
                  key={room._id || room.code}
                  className="card-modern-elevated p-5 sm:p-6 bg-white flex flex-col justify-between space-y-4 hover:border-orange-300 transition-all group"
                >
                  <div className="space-y-3">
                    {/* Room Header Tags */}
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={(e) => handleCopyCode(e, room.code)}
                        title="Click to copy room code"
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 hover:bg-orange-50 hover:text-orange-800 border border-slate-200/80 text-slate-700 text-[11px] font-mono font-bold transition-colors"
                      >
                        <Hash className="w-3 h-3 text-orange-600" />
                        <span>{room.code}</span>
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>

                      {room.isAudioActive && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                          <Volume2 className="w-3 h-3" /> Audio Active
                        </span>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 font-heading group-hover:text-orange-600 transition-colors line-clamp-1">
                        {room.name}
                      </h3>
                      <p className="text-slate-500 text-xs line-clamp-2 mt-1 leading-relaxed">
                        {room.topic}
                      </p>
                    </div>

                    {/* Linked Module Tag */}
                    {room.moduleTitle && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-orange-50/60 border border-orange-100 text-[11px] text-orange-950 font-medium">
                        <BookOpen className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span className="truncate">{room.moduleTitle}</span>
                      </div>
                    )}
                  </div>

                  {/* Room Footer Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-1.5 overflow-hidden">
                        {(room.participants || []).slice(0, 3).map((p, pIdx) => (
                          <div
                            key={pIdx}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-200 flex items-center justify-center text-xs"
                          >
                            {p.avatar || '👤'}
                          </div>
                        ))}
                      </div>
                      <span className="text-[11px] font-semibold text-slate-500">
                        {activeCount} {activeCount === 1 ? 'Peer' : 'Peers'}
                      </span>
                    </div>

                    <Link
                      to={`/room/${room.code}`}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                    >
                      <span>Join Room</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Room Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="card-modern-elevated bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 font-heading">
                  Create a Collaborative Study Room
                </h3>
                <p className="text-slate-500 text-xs mt-0.5">
                  Set up a real-time study lounge with live chat and audio sharing.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Room Name *
                </label>
                <input
                  type="text"
                  required
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. React & State Architecture Study Group"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Topic / Focus
                </label>
                <input
                  type="text"
                  value={newRoomTopic}
                  onChange={(e) => setNewRoomTopic(e.target.value)}
                  placeholder="e.g. Reviewing module concepts 1-3 and implementing practical code"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1.5">
                  Custom Room Code (Optional)
                </label>
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="e.g. REACT-1 (Leave blank to auto-generate)"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-mono uppercase focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5">
                <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-medium">
                  Live voice audio sharing &amp; real-time chat will automatically be enabled.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !newRoomName.trim()}
                  className="px-5 py-2.5 rounded-xl btn-primary-gradient disabled:opacity-50 font-bold text-white shadow-md flex items-center gap-2"
                >
                  {creating ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Launching Room…</> : 'Launch Study Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
