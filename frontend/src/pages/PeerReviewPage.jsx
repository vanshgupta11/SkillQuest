import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, ThumbsUp, MessageSquare, Star, Plus, ExternalLink,
  Code2, Sparkles, Filter, Search, Award, Send, ChevronDown,
  ChevronUp, CheckCircle2, AlertCircle, Loader2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PeerReviewPage() {
  const { user, getAuthHeaders, isAuthenticated } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'mine'
  const [sortBy, setSortBy] = useState('recent'); // 'recent' | 'top'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('All');
  const [expandedReviews, setExpandedReviews] = useState({});

  // Review Form State per card
  const [reviewForms, setReviewForms] = useState({});
  const [submittingReview, setSubmittingReview] = useState({});

  // Submit Modal State
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitForm, setSubmitForm] = useState({
    projectTitle: '',
    projectDescription: '',
    projectUrl: '',
    moduleTitle: '',
    techStack: 'React, Tailwind, Node.js',
  });
  const [submittingProject, setSubmittingProject] = useState(false);
  const [modalError, setModalError] = useState('');

  // Toast feedback
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const fetchSubmissions = () => {
    setLoading(true);
    const endpoint = activeTab === 'mine'
      ? '/api/peer/my-submissions'
      : `/api/peer/feed?sort=${sortBy}`;

    fetch(endpoint, { headers: getAuthHeaders() })
      .then((res) => res.json())
      .then((data) => {
        let list = data.submissions || [];
        // If DB has no submissions yet, provide curated exemplary community projects
        if (list.length === 0 && activeTab === 'all') {
          list = [
            {
              _id: 'seed-1',
              projectTitle: 'Distributed Task Queue with Redis Streams & Worker Pool',
              authorName: 'Alex Mercer',
              moduleTitle: 'Asynchronous Architecture & Message Queues',
              projectDescription: 'Built a resilient background worker system featuring automatic retry backoffs, dead-letter queue inspection, and a visual dashboard for monitoring throughput and worker health.',
              projectUrl: 'https://github.com/example/redis-task-queue',
              techStack: ['Node.js', 'Redis', 'TypeScript', 'Docker'],
              upvoteCount: 14,
              hasUpvoted: false,
              avgRating: 4.8,
              reviewCount: 3,
              createdAt: new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString(),
              reviews: [
                {
                  reviewerName: 'Marcus Thorne',
                  rating: 5,
                  feedback: 'Phenomenal architecture! The retry jitter logic with exponential backoff is cleanly decoupled. Inspired my own queue implementation.',
                },
                {
                  reviewerName: 'Elena Rostova',
                  rating: 5,
                  feedback: 'Great documentation and clean docker-compose setup. Tested locally without any hiccups.',
                }
              ]
            },
            {
              _id: 'seed-2',
              projectTitle: 'Interactive Graph Visualizer for Dynamic Algorithms',
              authorName: 'Aisha Patel',
              moduleTitle: 'Data Structures & Algorithmic Optimization',
              projectDescription: 'Canvas-driven Dijkstra and A* pathfinding visualization with interactive obstacle drawing, heuristic toggles, and step-by-step frame execution for algorithmic pedagogy.',
              projectUrl: 'https://github.com/example/graph-path-visualizer',
              techStack: ['React', 'HTML5 Canvas', 'TailwindCSS'],
              upvoteCount: 9,
              hasUpvoted: false,
              avgRating: 4.6,
              reviewCount: 2,
              createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
              reviews: [
                {
                  reviewerName: 'Devon Vance',
                  rating: 4,
                  feedback: 'Visually stunning! Would love to see bi-directional search added in the future.',
                }
              ]
            },
            {
              _id: 'seed-3',
              projectTitle: 'Zero-Knowledge Auth Proof of Concept',
              authorName: 'Sofia Chen',
              moduleTitle: 'Security, Cryptography & Secure Tokens',
              projectDescription: 'Implementation of SRP (Secure Remote Password) protocol eliminating server-side password storage with Argon2 hashing and timing-safe token verification.',
              projectUrl: 'https://github.com/example/zk-auth-demo',
              techStack: ['Node.js', 'Crypto', 'React', 'Express'],
              upvoteCount: 19,
              hasUpvoted: true,
              avgRating: 5.0,
              reviewCount: 4,
              createdAt: new Date(Date.now() - 96 * 60 * 60 * 1000).toISOString(),
              reviews: [
                {
                  reviewerName: 'Jordan Lee',
                  rating: 5,
                  feedback: 'Exceptional security awareness. Clear threat model outlined in the README.',
                }
              ]
            }
          ];
        }
        setSubmissions(list);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load peer submissions', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchSubmissions();
  }, [activeTab, sortBy]);

  // Handle Upvote
  const handleUpvote = async (submissionId) => {
    if (!isAuthenticated) {
      showToast('Please log in to upvote submissions.');
      return;
    }

    // Optimistic UI Update
    setSubmissions((prev) =>
      prev.map((s) => {
        if (s._id === submissionId) {
          const nextState = !s.hasUpvoted;
          return {
            ...s,
            hasUpvoted: nextState,
            upvoteCount: nextState ? (s.upvoteCount || 0) + 1 : Math.max(0, (s.upvoteCount || 0) - 1),
          };
        }
        return s;
      })
    );

    try {
      const res = await fetch(`/api/peer/${submissionId}/upvote`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Could not update upvote.');
        fetchSubmissions();
      }
    } catch (err) {
      console.error('Upvote error', err);
      fetchSubmissions();
    }
  };

  // Handle Review Submission
  const handleSubmitReview = async (submissionId) => {
    if (!isAuthenticated) {
      showToast('Please log in to review projects.');
      return;
    }
    const form = reviewForms[submissionId] || { rating: 5, feedback: '' };
    if (!form.feedback.trim()) {
      showToast('Please write some constructive feedback before submitting.');
      return;
    }

    setSubmittingReview((prev) => ({ ...prev, [submissionId]: true }));

    try {
      const res = await fetch(`/api/peer/${submissionId}/review`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: form.rating || 5,
          feedback: form.feedback.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showToast('🎉 Review posted! +40 Karma XP earned.');
        // Reset form for that card
        setReviewForms((prev) => ({ ...prev, [submissionId]: { rating: 5, feedback: '' } }));
        fetchSubmissions();
      } else {
        showToast(data.message || 'Error submitting review.');
      }
    } catch (err) {
      showToast('Failed to submit review.');
    } finally {
      setSubmittingReview((prev) => ({ ...prev, [submissionId]: false }));
    }
  };

  // Handle Project Creation
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!submitForm.projectTitle.trim() || !submitForm.projectDescription.trim()) {
      setModalError('Title and description are required.');
      return;
    }

    setSubmittingProject(true);
    setModalError('');

    try {
      const stackArray = submitForm.techStack
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch('/api/peer/submit', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectTitle: submitForm.projectTitle.trim(),
          projectDescription: submitForm.projectDescription.trim(),
          projectUrl: submitForm.projectUrl.trim(),
          moduleTitle: submitForm.moduleTitle.trim() || 'Capstone Showcase',
          techStack: stackArray,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowSubmitModal(false);
        setSubmitForm({
          projectTitle: '',
          projectDescription: '',
          projectUrl: '',
          moduleTitle: '',
          techStack: 'React, Node.js',
        });
        showToast('🚀 Project submitted to peer review! +60 Showcase XP');
        fetchSubmissions();
      } else {
        setModalError(data.message || 'Error creating submission.');
      }
    } catch (err) {
      setModalError('Network error while submitting project.');
    } finally {
      setSubmittingProject(false);
    }
  };

  const allTags = ['All', 'React', 'Node.js', 'TypeScript', 'Redis', 'Docker', 'Python', 'TailwindCSS'];

  const filteredSubmissions = submissions.filter((s) => {
    const matchesSearch =
      s.projectTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.projectDescription.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.authorName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesTag =
      selectedTag === 'All' ||
      (Array.isArray(s.techStack) && s.techStack.some((t) => t.toLowerCase() === selectedTag.toLowerCase()));

    return matchesSearch && matchesTag;
  });

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 animate-in slide-in-from-top-4">
          <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-xs font-bold border border-slate-700">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-b from-orange-50 via-amber-50/30 to-transparent border-b border-orange-100/60 pt-10 pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100/80 border border-orange-200 text-orange-700 text-xs font-bold uppercase tracking-wider mb-3">
                <Users className="w-3.5 h-3.5" />
                <span>Collaborative Engineering Guild</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight font-heading">
                Peer Review & Code Showcase
              </h1>
              <p className="mt-2 text-sm text-slate-600 max-w-xl">
                Inspect architecture solutions, give constructive code feedback, and present your capstone projects to fellow learners.
              </p>
            </div>

            <button
              onClick={() => {
                if (!isAuthenticated) {
                  showToast('Please log in to submit a project.');
                  return;
                }
                setShowSubmitModal(true);
              }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-extrabold text-xs shadow-lg shadow-orange-500/25 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Submit Project for Review</span>
            </button>
          </div>

          {/* Sub Navigation & Filters */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-orange-200/50">
            {/* View Tabs */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'all'
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Community Feed
              </button>
              <button
                onClick={() => setActiveTab('mine')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'mine'
                    ? 'bg-white text-orange-600 shadow-sm border border-slate-200'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                My Submissions
              </button>
            </div>

            {/* Sort Controls */}
            {activeTab === 'all' && (
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600">
                <span className="text-slate-400">Sort by:</span>
                <button
                  onClick={() => setSortBy('recent')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'recent' ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-slate-100'
                  }`}
                >
                  Latest
                </button>
                <button
                  onClick={() => setSortBy('top')}
                  className={`px-3 py-1.5 rounded-lg transition-colors ${
                    sortBy === 'top' ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-slate-100'
                  }`}
                >
                  Most Upvoted 🔥
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
        {/* Search & Tag Chips */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by title, author, or tech…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400 shadow-sm"
            />
          </div>

          {/* Tech Stack Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                  selectedTag === tag
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Submissions Grid */}
        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-orange-600 animate-spin mb-3" />
            <p className="text-xs font-semibold text-slate-500">Loading community project showcases…</p>
          </div>
        ) : filteredSubmissions.length === 0 ? (
          <div className="py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200 p-8">
            <Code2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-700">No project submissions found</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {searchQuery || selectedTag !== 'All'
                ? 'Try adjusting your search query or technology filters.'
                : 'Be the first pioneer to showcase a project for community peer review!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredSubmissions.map((sub) => {
              const isExpanded = !!expandedReviews[sub._id];
              const formState = reviewForms[sub._id] || { rating: 5, feedback: '' };

              return (
                <div
                  key={sub._id}
                  className="bg-white rounded-3xl border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
                >
                  <div className="p-6">
                    {/* Header Bar */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-100 to-amber-100 text-orange-700 flex items-center justify-center font-bold text-xs border border-orange-200/70 shadow-sm">
                          {sub.authorName?.[0]?.toUpperCase() || 'P'}
                        </div>
                        <div>
                          <span className="text-xs font-bold text-slate-900 block truncate">
                            {sub.authorName || 'Learner'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {sub.moduleTitle || 'General Showcase'}
                          </span>
                        </div>
                      </div>

                      {/* Upvote Button */}
                      <button
                        onClick={() => handleUpvote(sub._id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                          sub.hasUpvoted
                            ? 'bg-orange-500 text-white border-orange-600 shadow-sm shadow-orange-500/20'
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-orange-50 hover:text-orange-600'
                        }`}
                      >
                        <ThumbsUp className={`w-3.5 h-3.5 ${sub.hasUpvoted ? 'fill-white' : ''}`} />
                        <span>{sub.upvoteCount || 0}</span>
                      </button>
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-extrabold text-slate-900 font-heading leading-snug group-hover:text-orange-600 transition-colors">
                      {sub.projectTitle}
                    </h3>

                    {/* Description */}
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {sub.projectDescription}
                    </p>

                    {/* Tech Stack Chips */}
                    {Array.isArray(sub.techStack) && sub.techStack.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-1.5">
                        {sub.techStack.map((tech) => (
                          <span
                            key={tech}
                            className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Action Bar */}
                  <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-3 text-xs">
                    {/* Rating & Review Counter */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 text-amber-500 font-black">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{sub.avgRating ? sub.avgRating.toFixed(1) : '5.0'}</span>
                      </div>
                      <button
                        onClick={() =>
                          setExpandedReviews((prev) => ({ ...prev, [sub._id]: !prev[sub._id] }))
                        }
                        className="flex items-center gap-1 text-slate-500 hover:text-slate-800 font-bold transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{sub.reviews?.length || sub.reviewCount || 0} Reviews</span>
                        {isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
                      </button>
                    </div>

                    {/* External Link */}
                    {sub.projectUrl && (
                      <a
                        href={sub.projectUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 font-bold text-orange-600 hover:text-orange-700 transition-colors"
                      >
                        <span>Demo / Repo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Expandable Review Section */}
                  {isExpanded && (
                    <div className="px-6 pb-6 pt-2 bg-slate-50/70 border-t border-slate-200/60 space-y-4 animate-in fade-in">
                      {/* Past Reviews */}
                      <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
                        {sub.reviews && sub.reviews.length > 0 ? (
                          sub.reviews.map((rev, idx) => (
                            <div key={idx} className="p-3 rounded-2xl bg-white border border-slate-200/80 space-y-1">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-bold text-slate-800">{rev.reviewerName}</span>
                                <div className="flex items-center text-amber-500">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-2.5 h-2.5 ${
                                        i < rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <p className="text-[11px] text-slate-600 leading-relaxed">
                                {rev.feedback}
                              </p>
                            </div>
                          ))
                        ) : (
                          <p className="text-center text-[11px] text-slate-400 py-2">
                            No reviews posted yet. Be the first to evaluate this architecture!
                          </p>
                        )}
                      </div>

                      {/* Add Review Form */}
                      <div className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">Leave Constructive Feedback</span>
                          {/* Star Picker */}
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() =>
                                  setReviewForms((prev) => ({
                                    ...prev,
                                    [sub._id]: { ...(prev[sub._id] || {}), rating: num },
                                  }))
                                }
                                className="text-amber-400 hover:scale-110 transition-transform"
                              >
                                <Star
                                  className={`w-4 h-4 ${
                                    num <= (formState.rating || 5) ? 'fill-amber-400' : 'text-slate-200'
                                  }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Architecture notes, clean code compliments, or suggestions…"
                            value={formState.feedback || ''}
                            onChange={(e) =>
                              setReviewForms((prev) => ({
                                ...prev,
                                [sub._id]: { ...(prev[sub._id] || {}), feedback: e.target.value },
                              }))
                            }
                            className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                          />
                          <button
                            onClick={() => handleSubmitReview(sub._id)}
                            disabled={submittingReview[sub._id]}
                            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                          >
                            {submittingReview[sub._id] ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>Post</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Submit Project Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center">
                  <Code2 className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-black text-lg text-slate-900">
                  Submit Project for Peer Review
                </h3>
              </div>
              <button
                onClick={() => setShowSubmitModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleCreateProject} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Project Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Queue or Fullstack E-Commerce API"
                  value={submitForm.projectTitle}
                  onChange={(e) => setSubmitForm({ ...submitForm, projectTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Related Module / Subject</label>
                <input
                  type="text"
                  placeholder="e.g. React Architecture, Node Microservices, or System Design"
                  value={submitForm.moduleTitle}
                  onChange={(e) => setSubmitForm({ ...submitForm, moduleTitle: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Architecture & Implementation Notes *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Summarize your design patterns, architectural trade-offs, and what you would like peers to evaluate…"
                  value={submitForm.projectDescription}
                  onChange={(e) => setSubmitForm({ ...submitForm, projectDescription: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 leading-relaxed"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">GitHub / Live Demo URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/your-username/repo-name"
                  value={submitForm.projectUrl}
                  onChange={(e) => setSubmitForm({ ...submitForm, projectUrl: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tech Stack (comma separated)</label>
                <input
                  type="text"
                  placeholder="React, TypeScript, Docker, Redis, PostgreSQL"
                  value={submitForm.techStack}
                  onChange={(e) => setSubmitForm({ ...submitForm, techStack: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingProject}
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold flex items-center gap-2 shadow-md shadow-orange-500/20 transition-all disabled:opacity-50"
                >
                  {submittingProject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Publish to Showcase</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
