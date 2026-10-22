import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/scoring';
import {
  Shield,
  Clock,
  Plus,
  FastForward,
  Play,
  Pause,
  Download,
  Users,
  Code2,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Flame,
  Sparkles,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { user } = useAuth();
  const [competition, setCompetition] = useState<any | null>(null);
  const [remainingSec, setRemainingSec] = useState<number>(0);
  const [questions, setQuestions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [customAddMinutes, setCustomAddMinutes] = useState<number>(5);
  const [actionNotice, setActionNotice] = useState<string>('');

  const fetchAdminData = async () => {
    try {
      const compRes = await api.getCompetition();
      setCompetition(compRes.competition);
      setRemainingSec(compRes.currentQuestionRemainingSeconds);

      const qRes = await api.getQuestions(true);
      setQuestions(qRes.questions);

      const pRes = await api.getPlayers();
      setPlayers(pRes.players);

      const sRes = await api.getSubmissions();
      setSubmissions(sRes.submissions);
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(async () => {
      try {
        const compRes = await api.getCompetition();
        setRemainingSec(compRes.currentQuestionRemainingSeconds);
        setCompetition(compRes.competition);
      } catch {}
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Local second ticker
  useEffect(() => {
    if (remainingSec <= 0 || competition?.status !== 'active') return;
    const ticker = setInterval(() => {
      setRemainingSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(ticker);
  }, [remainingSec, competition?.status]);

  // CRITICAL: Admin adds time to current program
  const handleAddTime = async (minutes: number) => {
    try {
      const seconds = minutes * 60;
      const res = await api.addTimeToCurrentQuestion(seconds);
      setRemainingSec(res.currentQuestionRemainingSeconds);
      setCompetition(res.competition);
      showNotice(`Successfully added ${minutes} minute(s) to the active program timer!`);
    } catch (err: any) {
      alert(err.message || 'Failed to add time');
    }
  };

  // Force advance to next program
  const handleAdvance = async () => {
    if (!confirm('Advance immediately to the next program? The current program will be permanently locked.')) return;
    try {
      const res = await api.advanceToNextQuestion();
      setCompetition(res.competition);
      setRemainingSec(res.currentQuestionRemainingSeconds);
      showNotice('Arena advanced to the next challenge! Previous program is locked.');
    } catch (err: any) {
      alert(err.message || 'Failed to advance');
    }
  };

  // Toggle status (active / paused)
  const handleTogglePause = async () => {
    const newStatus = competition?.status === 'active' ? 'paused' : 'active';
    try {
      const res = await api.updateCompetitionStatus(newStatus);
      setCompetition(res.competition);
      showNotice(`Competition status updated to: ${newStatus.toUpperCase()}`);
    } catch (err: any) {
      alert(err.message || 'Failed to update competition status');
    }
  };

  const showNotice = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(''), 4000);
  };

  const currentQ = questions.find((q) => q.id === competition?.currentQuestionId) || questions[0];
  const acCount = submissions.filter((s) => s.verdict === 'ACCEPTED').length;
  const acRate = submissions.length > 0 ? Math.round((acCount / submissions.length) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Admin Title Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-900 border border-amber-500/40 rounded-2xl p-6 shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Grandmaster Administrator Panel</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center space-x-2">
            <span>Welcome,</span>
            <span className="text-amber-400 font-mono">BLACKDRAGON</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            You hold exclusive control over program timers, question progression, and tournament rules.
          </p>
        </div>

        {/* Quick CSV Export Actions */}
        <div className="flex items-center space-x-2">
          <a
            href="/api/admin/export/leaderboard"
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold border border-zinc-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Leaderboard CSV</span>
          </a>
          <a
            href="/api/admin/export/submissions"
            download
            className="flex items-center space-x-1.5 px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-bold border border-zinc-700 transition"
          >
            <Download className="w-4 h-4" />
            <span>Submissions CSV</span>
          </a>
        </div>
      </div>

      {actionNotice && (
        <div className="p-3 bg-amber-500/20 border border-amber-500/50 rounded-xl text-amber-300 text-sm font-semibold flex items-center space-x-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* CRITICAL CORE REQUIREMENT: PER-CODE TIMER MANAGEMENT PANEL */}
      <div className="bg-zinc-900 border-2 border-amber-500/60 rounded-2xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 transform translate-x-8 -translate-y-8 w-40 h-40 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-zinc-800 pb-4">
          <div>
            <span className="px-2.5 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded text-xs font-mono font-bold uppercase tracking-wider">
              Exclusive Admin Feature
            </span>
            <h2 className="text-xl font-black text-white mt-2">
              Active Program Timer & Progression Control
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              "For every code there should be a time. The time should be only added by the admin. If time is over, the next program executes and the previous program will not work."
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleTogglePause}
              className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shadow-md ${
                competition?.status === 'active'
                  ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-black'
              }`}
            >
              {competition?.status === 'active' ? (
                <>
                  <Pause className="w-4 h-4" />
                  <span>Pause Timer</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Resume Timer</span>
                </>
              )}
            </button>

            <button
              onClick={handleAdvance}
              className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-900/40 transition"
              title="Force next program: locks the current one immediately"
            >
              <FastForward className="w-4 h-4" />
              <span>Next Program &gt;&gt;</span>
            </button>
          </div>
        </div>

        {/* Current Program Details & Live Countdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 space-y-2">
            <div className="flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono text-zinc-400 uppercase font-semibold">
                Now Executing in Arena:
              </span>
            </div>
            <h3 className="text-lg font-bold text-white">
              #{competition?.currentQuestionIndex !== undefined ? competition.currentQuestionIndex + 1 : 1}: {currentQ?.title}
            </h3>
            <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400">
              <span className="text-amber-400 font-bold">{currentQ?.points} Points</span>
              <span>•</span>
              <span>Difficulty: {currentQ?.difficulty}</span>
              <span>•</span>
              <span>Base Window: {currentQ?.allocatedTimeMinutes || 10}m</span>
            </div>
          </div>

          <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-800 flex flex-col items-center justify-center text-center space-y-1">
            <span className="text-xs font-mono uppercase text-zinc-400 font-bold tracking-wider">
              Remaining Program Time:
            </span>
            <div
              className={`text-4xl sm:text-5xl font-mono font-black tracking-widest ${
                remainingSec <= 60
                  ? 'text-red-500 animate-pulse'
                  : remainingSec <= 180
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {remainingSec > 0 ? formatDuration(remainingSec) : '00:00 - TIME OVER'}
            </div>
            <span className="text-[11px] text-zinc-500">
              When this reaches 00:00, previous code is permanently locked and the next program begins.
            </span>
          </div>
        </div>

        {/* Fast Add Time Buttons (Only admin BLACKDRAGON can add time) */}
        <div className="pt-2 border-t border-zinc-800 space-y-3">
          <span className="text-xs font-mono uppercase font-bold text-zinc-300 block">
            Add Time to Current Program:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleAddTime(1)}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-xl text-xs font-mono font-bold transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+1 Minute</span>
            </button>
            <button
              onClick={() => handleAddTime(3)}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-xl text-xs font-mono font-bold transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+3 Minutes</span>
            </button>
            <button
              onClick={() => handleAddTime(5)}
              className="px-4 py-2 bg-amber-500 text-black hover:bg-amber-400 rounded-xl text-xs font-mono font-black transition flex items-center space-x-1 shadow-md shadow-amber-500/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+5 Minutes</span>
            </button>
            <button
              onClick={() => handleAddTime(10)}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-xl text-xs font-mono font-bold transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+10 Minutes</span>
            </button>
            <button
              onClick={() => handleAddTime(15)}
              className="px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-black border border-amber-500/40 rounded-xl text-xs font-mono font-bold transition flex items-center space-x-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+15 Minutes</span>
            </button>

            {/* Custom Minutes Input */}
            <div className="flex items-center space-x-1.5 ml-auto">
              <input
                type="number"
                min="1"
                max="60"
                value={customAddMinutes}
                onChange={(e) => setCustomAddMinutes(parseInt(e.target.value, 10) || 1)}
                className="w-16 bg-zinc-950 border border-zinc-700 rounded-lg px-2 py-1.5 text-xs font-mono text-center text-white"
              />
              <button
                onClick={() => handleAddTime(customAddMinutes)}
                className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg text-xs font-semibold"
              >
                Add Custom Mins
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">Registered Contestants</span>
            <div className="text-2xl font-black text-white">{players.length}</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">Total Submissions</span>
            <div className="text-2xl font-black text-white">{submissions.length}</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">Accepted Solutions</span>
            <div className="text-2xl font-black text-white">{acCount} ({acRate}%)</div>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-lg flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Code2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-zinc-400 font-medium">Programs in Tournament</span>
            <div className="text-2xl font-black text-white">{questions.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
