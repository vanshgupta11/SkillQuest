import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Volume2, VolumeX, Send, Users, BookOpen,
  Code, Copy, Check, Hash, ArrowLeft, Radio, AlertCircle,
  HelpCircle, Sparkles, Loader2, CheckCircle2, Headphones,
  Layers, Lightbulb, MessageSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StudyRoomDetailPage() {
  const { code } = useParams();
  const { user, getAuthHeaders } = useAuth();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [moduleData, setModuleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  // Chat State
  const [messages, setMessages] = useState([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatBottomRef = useRef(null);

  // Audio Sharing State
  const [isMuted, setIsMuted] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioConnected, setAudioConnected] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [peerSpeakingStates, setPeerSpeakingStates] = useState({});

  // Audio Media Refs
  const localStreamRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const eventSourceRef = useRef(null);

  const currentUserId = String(user?._id || user?.id || 'guest-' + Math.random().toString(36).substr(2, 6));
  const currentUserName = user?.fullName || user?.email?.split('@')[0] || 'Peer Explorer';

  // 1. Initial Room Fetch & Join
  useEffect(() => {
    let mounted = true;

    const initRoom = async () => {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Room not found');
        }

        if (mounted) {
          setRoom(data.room);
          setMessages(data.room.messages || []);
          if (data.module) {
            setModuleData(data.module);
          } else {
            // Fetch default fallback or general module
            fetch('/api/course/sample-module')
              .then((r) => r.json())
              .then((cd) => {
                if (mounted && cd.course) setModuleData(cd.course);
              })
              .catch(() => {});
          }
          setLoading(false);
        }

        // Send Join Request
        await fetch(`/api/rooms/${code}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            userId: currentUserId,
            name: currentUserName,
            avatar: '🎧',
          }),
        });
      } catch (err) {
        if (mounted) {
          setError(err.message || 'Error joining study room');
          setLoading(false);
        }
      }
    };

    initRoom();

    // 2. Connect Server-Sent Events (SSE) for Real-Time Messages & Signaling
    const sse = new EventSource(`/api/rooms/${code}/events`);
    eventSourceRef.current = sse;

    sse.addEventListener('message', (event) => {
      try {
        const newMsg = JSON.parse(event.data);
        setMessages((prev) => [...prev, newMsg]);
      } catch (err) {
        console.warn('SSE message parse error:', err);
      }
    });

    sse.addEventListener('participant-joined', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.participants) {
          setRoom((prev) => (prev ? { ...prev, participants: payload.participants } : prev));
        }
        if (payload.systemMessage) {
          setMessages((prev) => [...prev, payload.systemMessage]);
        }
      } catch (err) {}
    });

    sse.addEventListener('participant-left', (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.participants) {
          setRoom((prev) => (prev ? { ...prev, participants: payload.participants } : prev));
        }
        if (payload.systemMessage) {
          setMessages((prev) => [...prev, payload.systemMessage]);
        }
      } catch (err) {}
    });

    sse.addEventListener('signal', (event) => {
      try {
        const signalData = JSON.parse(event.data);
        if (signalData.signalType === 'speaking-state') {
          setPeerSpeakingStates((prev) => ({
            ...prev,
            [signalData.senderId]: signalData.data?.isSpeaking || false,
          }));
        }
      } catch (err) {}
    });

    // Cleanup on Leave / Unmount
    return () => {
      mounted = false;
      sse.close();
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close().catch(() => {});

      // Notify server of leave
      fetch(`/api/rooms/${code}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUserId }),
      }).catch(() => {});
    };
  }, [code, currentUserId, currentUserName]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Audio Sharing & Microphone Initialization
  const toggleAudio = async () => {
    setAudioError('');

    if (isMuted) {
      // Unmuting: initialize mic if not already started
      try {
        if (!localStreamRef.current) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          localStreamRef.current = stream;

          // Set up Web Audio API volume detection to power the speaking indicator
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          const audioCtx = new AudioContextClass();
          audioContextRef.current = audioCtx;

          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);
          analyserRef.current = analyser;

          // Volume detection loop
          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          let wasSpeaking = false;

          const detectVoice = () => {
            if (!analyserRef.current) return;
            analyserRef.current.getByteFrequencyData(dataArray);

            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            const speakingNow = average > 25; // threshold

            setIsSpeaking(speakingNow);

            if (speakingNow !== wasSpeaking) {
              wasSpeaking = speakingNow;
              // Broadcast speaking state signal to peers
              fetch(`/api/rooms/${code}/signal`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  senderId: currentUserId,
                  signalType: 'speaking-state',
                  data: { isSpeaking: speakingNow },
                }),
              }).catch(() => {});
            }

            animFrameRef.current = requestAnimationFrame(detectVoice);
          };

          detectVoice();
          setAudioConnected(true);
        } else {
          localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = true));
        }

        setIsMuted(false);
      } catch (err) {
        setAudioError('Microphone access unavailable or denied. You can still listen and chat.');
        setIsMuted(true);
      }
    } else {
      // Muting
      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => (track.enabled = false));
      }
      setIsSpeaking(false);
      setIsMuted(true);

      // Broadcast muted state
      fetch(`/api/rooms/${code}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: currentUserId,
          signalType: 'speaking-state',
          data: { isSpeaking: false },
        }),
      }).catch(() => {});
    }
  };

  // 4. Send Message Handler
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessageText.trim() || sendingMessage) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setSendingMessage(true);

    try {
      await fetch(`/api/rooms/${code}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          text: textToSend,
          senderId: currentUserId,
          senderName: currentUserName,
        }),
      });
      setSendingMessage(false);
    } catch {
      setSendingMessage(false);
    }
  };

  const handleCopyRoomCode = () => {
    navigator.clipboard.writeText(room?.code || code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center animate-fadeIn">
        <Loader2 className="w-10 h-10 animate-spin text-orange-600 mx-auto mb-3" />
        <div className="text-slate-800 font-bold text-sm">Entering Study Room [{code}]…</div>
        <div className="text-slate-400 text-xs mt-1">Connecting real-time events, audio sharing &amp; module workspace</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center animate-fadeIn space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-slate-900">{error}</h2>
        <Link
          to="/rooms"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl btn-primary-gradient text-xs font-bold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Study Lounges
        </Link>
      </div>
    );
  }

  const participants = room?.participants || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 animate-fadeIn">

      {/* Top Header & Audio Control Bar */}
      <div className="card-modern-elevated p-5 sm:p-6 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/rooms"
            title="Leave room"
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyRoomCode}
                title="Click to copy room code"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-orange-100/80 hover:bg-orange-200/80 text-orange-950 font-mono text-xs font-extrabold border border-orange-300/80 transition-colors"
              >
                <Hash className="w-3.5 h-3.5 text-orange-600" />
                <span>Room Code: {room?.code}</span>
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-orange-700" />}
              </button>

              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-semibold">
                <Users className="w-3.5 h-3.5 text-slate-500" /> {participants.length} Active Peers
              </span>
            </div>

            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 font-heading mt-1">
              {room?.name}
            </h1>
            <p className="text-slate-500 text-xs mt-0.5 line-clamp-1">
              {room?.topic}
            </p>
          </div>
        </div>

        {/* Audio Sharing Lounge Controls */}
        <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200/80 self-start md:self-auto">
          {/* Mute / Unmute Button */}
          <button
            onClick={toggleAudio}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-xs ${
              !isMuted
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {!isMuted ? (
              <>
                <Mic className="w-4 h-4 text-white" />
                <span>Microphone Live</span>
                {isSpeaking && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                )}
              </>
            ) : (
              <>
                <MicOff className="w-4 h-4 text-slate-400" />
                <span>Unmute Mic</span>
              </>
            )}
          </button>

          <div className="text-[11px] text-slate-500 font-medium hidden sm:block pr-2">
            {!isMuted ? 'Voice sharing active' : 'Audio muted'}
          </div>
        </div>
      </div>

      {audioError && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{audioError}</span>
        </div>
      )}

      {/* Main Split Grid: Shared Study Guide on Left, Live Chat & Audio Lounge on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── LEFT / CENTER: Collaborative Module Workspace (8 cols) ── */}
        <div className="lg:col-span-7 space-y-6">

          {/* Module Banner */}
          <div className="card-modern-elevated p-6 bg-white space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold flex items-center gap-1.5 uppercase tracking-wider">
                <BookOpen className="w-3.5 h-3.5 text-orange-600" />
                Co-Studying Module
              </span>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {moduleData?.difficulty || 'Intermediate'} Difficulty
              </span>
            </div>

            <h2 className="text-xl font-bold text-slate-900 font-heading">
              {moduleData?.title || 'Interactive Architecture & Study Guide'}
            </h2>
            <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
              {moduleData?.summary || moduleData?.description || 'Study together with your peers in this room. Discuss the key architectural tenets and solve knowledge check questions collaboratively.'}
            </p>
          </div>

          {/* Detailed In-Depth Concepts (Collaborative Learning) */}
          {moduleData?.keyConcepts && moduleData.keyConcepts.length > 0 && (
            <div className="card-modern-elevated p-6 bg-white space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-orange-600" /> Core Concepts Under Discussion
                </h3>
                <span className="text-[11px] font-bold text-slate-400">
                  {moduleData.keyConcepts.length} Principles
                </span>
              </div>

              <div className="space-y-4">
                {moduleData.keyConcepts.map((concept, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
                    <div className="flex items-start gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-orange-600 text-white text-xs flex items-center justify-center font-bold shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 font-heading">
                          {concept.heading}
                        </h4>
                        <p className="text-slate-600 text-xs leading-relaxed mt-1">
                          {concept.explanation}
                        </p>
                      </div>
                    </div>

                    {concept.subpoints && concept.subpoints.length > 0 && (
                      <ul className="pl-8 space-y-1 text-xs text-slate-700">
                        {concept.subpoints.map((pt, pIdx) => (
                          <li key={pIdx} className="flex items-start gap-1.5">
                            <span className="text-orange-500 font-bold">•</span>
                            <span>{pt}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {concept.practicalTakeaway && (
                      <div className="ml-8 p-2 rounded-lg bg-orange-50 border border-orange-200/80 text-[11px] text-orange-950 font-semibold flex items-center gap-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        <span>Rule: {concept.practicalTakeaway}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reference Code Sandbox */}
          {moduleData?.codeExample && (
            <div className="card-modern-elevated p-6 bg-white space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                  <Code className="w-4 h-4 text-orange-600" /> Reference Code Implementation
                </h3>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(moduleData.codeExample);
                    setCopiedCode(true);
                    setTimeout(() => setCopiedCode(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1"
                >
                  {copiedCode ? <><Check className="w-3.5 h-3.5 text-emerald-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy Code</>}
                </button>
              </div>

              <div className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 text-[10px] text-slate-400 font-mono">
                  shared_module_implementation.js
                </div>
                <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto leading-relaxed max-h-80">
                  <code>{moduleData.codeExample}</code>
                </pre>
              </div>
            </div>
          )}

          {/* Group Knowledge Check Discussion */}
          {moduleData?.quiz && moduleData.quiz.length > 0 && (
            <div className="card-modern-elevated p-6 bg-white space-y-4">
              <h3 className="text-sm font-bold text-slate-900 font-heading flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-500" /> Group Knowledge Check (Discuss with Room)
              </h3>
              <div className="space-y-3">
                {moduleData.quiz.map((q, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs space-y-2">
                    <div className="font-bold text-slate-800">
                      <span className="text-orange-600 font-extrabold mr-1">Q{idx + 1}:</span> {q.question}
                    </div>
                    {q.options && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-[11px] font-medium">
                            {opt}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN: Live Audio Lounge & Real-Time Chat (5 cols) ── */}
        <div className="lg:col-span-5 space-y-6 sticky top-20">

          {/* Audio Lounge Participants Grid */}
          <div className="card-modern-elevated p-5 bg-white space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <h3 className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1.5 uppercase tracking-wider">
                <Headphones className="w-4 h-4 text-orange-600" /> Active Audio Lounge
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                Voice Mesh
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Local User Tile */}
              <div className={`p-3 rounded-2xl border text-center transition-all ${
                isSpeaking
                  ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/40 shadow-xs'
                  : 'bg-slate-50 border-slate-200/80'
              }`}>
                <div className="relative inline-block mx-auto mb-1.5">
                  <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-sm font-bold mx-auto">
                    🎧
                  </div>
                  <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${
                    !isMuted ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                  }`}>
                    {!isMuted ? <Mic className="w-2.5 h-2.5" /> : <MicOff className="w-2.5 h-2.5" />}
                  </span>
                </div>
                <div className="text-xs font-bold text-slate-900 truncate">
                  You ({currentUserName})
                </div>
                <div className="text-[10px] font-medium text-slate-400">
                  {!isMuted ? (isSpeaking ? 'Speaking…' : 'Listening') : 'Muted'}
                </div>
              </div>

              {/* Peer Participants */}
              {participants.filter(p => p.userId !== currentUserId).map((peer) => {
                const peerSpeaking = peerSpeakingStates[peer.userId] || peer.isSpeaking;

                return (
                  <div
                    key={peer.userId}
                    className={`p-3 rounded-2xl border text-center transition-all ${
                      peerSpeaking
                        ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/40 shadow-xs'
                        : 'bg-slate-50 border-slate-200/80'
                    }`}
                  >
                    <div className="relative inline-block mx-auto mb-1.5">
                      <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-sm font-bold mx-auto">
                        {peer.avatar || '👤'}
                      </div>
                      <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-full ${
                        peerSpeaking ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                      }`}>
                        {peerSpeaking ? <Mic className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
                      </span>
                    </div>
                    <div className="text-xs font-bold text-slate-800 truncate">
                      {peer.name}
                    </div>
                    <div className="text-[10px] font-medium text-slate-400">
                      {peerSpeaking ? 'Speaking…' : 'In Lounge'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Chat Panel */}
          <div className="card-modern-elevated p-5 bg-white flex flex-col h-[460px]">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 shrink-0">
              <h3 className="text-xs font-bold text-slate-900 font-heading flex items-center gap-1.5 uppercase tracking-wider">
                <MessageSquare className="w-4 h-4 text-orange-600" /> Room Discussion
              </h3>
              <span className="text-[10px] text-slate-400 font-medium">Real-time Stream</span>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  <MessageSquare className="w-6 h-6 mx-auto mb-1.5 opacity-30 text-orange-500" />
                  Say hello! Ask a question about the active module.
                </div>
              ) : (
                messages.map((m, idx) => {
                  const isMe = m.senderId === currentUserId;

                  if (m.isSystem) {
                    return (
                      <div key={m.id || idx} className="text-center py-1 px-2 my-1">
                        <span className="inline-block px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[10px] font-semibold">
                          {m.text}
                        </span>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold text-slate-600">
                          {isMe ? 'You' : m.senderName}
                        </span>
                        <span className="text-[9px] text-slate-400">
                          {m.timestamp ? new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className={`p-2.5 rounded-2xl max-w-[85%] leading-relaxed ${
                        isMe
                          ? 'bg-slate-900 text-white rounded-br-xs'
                          : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                      }`}>
                        {m.text}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={chatBottomRef} />
            </div>

            {/* Message Input Form */}
            <form onSubmit={handleSendMessage} className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 shrink-0">
              <input
                type="text"
                value={newMessageText}
                onChange={(e) => setNewMessageText(e.target.value)}
                placeholder="Discuss concept or ask question…"
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-orange-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-orange-500/20"
              />
              <button
                type="submit"
                disabled={!newMessageText.trim() || sendingMessage}
                className="p-2.5 rounded-xl btn-primary-gradient disabled:opacity-40 text-white shadow-xs shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
