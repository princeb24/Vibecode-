import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { formatDuration } from '../utils/scoring';
import {
  Swords,
  Trophy,
  Code2,
  FileText,
  Clock,
  Shield,
  LogOut,
  User,
  PlusCircle,
  Menu,
  X,
  FastForward,
  Plus,
} from 'lucide-react';

interface NavbarProps {
  currentRoute: string;
  navigate: (route: string) => void;
  onTimerChange?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentRoute, navigate, onTimerChange }) => {
  const { user, logout, isAdmin, quickLoginAdmin, quickLoginPlayer } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [remainingSec, setRemainingSec] = useState<number | null>(null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [isCompActive, setIsCompActive] = useState<boolean>(true);
  const [addingTime, setAddingTime] = useState(false);

  // Poll competition timer state
  useEffect(() => {
    let timerId: any;

    const fetchTimer = async () => {
      try {
        const data = await api.getCompetition();
        setRemainingSec(data.currentQuestionRemainingSeconds);
        setCurrentQIndex(data.competition.currentQuestionIndex || 0);
        setIsCompActive(data.competition.status === 'active');
      } catch (err) {
        // quiet error on unmount
      }
    };

    fetchTimer();
    timerId = setInterval(fetchTimer, 3000);
    return () => clearInterval(timerId);
  }, []);

  // Local second-by-second countdown ticker
  useEffect(() => {
    if (remainingSec === null || remainingSec <= 0 || !isCompActive) return;
    const interval = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev === null || prev <= 1) {
          if (onTimerChange) onTimerChange();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [remainingSec, isCompActive, onTimerChange]);

  const handleAdminAddTime = async (seconds: number) => {
    setAddingTime(true);
    try {
      const res = await api.addTimeToCurrentQuestion(seconds);
      setRemainingSec(res.currentQuestionRemainingSeconds);
      if (onTimerChange) onTimerChange();
    } catch (err: any) {
      alert(err.message || 'Failed to add time');
    } finally {
      setAddingTime(false);
    }
  };

  const handleAdminAdvance = async () => {
    if (!confirm('Are you sure you want to end this program and advance to the next challenge immediately?')) return;
    try {
      const res = await api.advanceToNextQuestion();
      setRemainingSec(res.currentQuestionRemainingSeconds);
      if (onTimerChange) onTimerChange();
    } catch (err: any) {
      alert(err.message || 'Failed to advance question');
    }
  };

  const navLinkClass = (route: string) =>
    `px-3 py-1.5 rounded-lg text-sm font-medium transition flex items-center space-x-1.5 ${
      currentRoute === route
        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
        : 'text-zinc-300 hover:text-white hover:bg-zinc-800/60'
    }`;

  const timerColor = () => {
    if (!isCompActive) return 'text-zinc-400 bg-zinc-800/80 border-zinc-700';
    if (remainingSec === null) return 'text-zinc-400 bg-zinc-800';
    if (remainingSec <= 60) return 'text-red-400 bg-red-950/80 border-red-500/40 animate-pulse';
    if (remainingSec <= 180) return 'text-amber-400 bg-amber-950/60 border-amber-500/40';
    return 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40';
  };

  return (
    <nav className="bg-zinc-950/95 border-b border-zinc-800/80 sticky top-0 z-40 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Platform Name */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/player/competition')}
              className="flex items-center space-x-2 text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center shadow-lg shadow-amber-500/20 group-hover:scale-105 transition">
                <Swords className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-lg font-black tracking-wider text-white flex items-center space-x-1">
                  <span>CODE</span>
                  <span className="text-amber-500">BATTLE</span>
                </span>
                <span className="block text-[10px] text-zinc-400 font-mono -mt-1 tracking-tight">
                  ONLINE ARENA
                </span>
              </div>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1 pl-4 border-l border-zinc-800">
              <button
                onClick={() => navigate('/player/competition')}
                className={navLinkClass('/player/competition')}
              >
                <Code2 className="w-4 h-4" />
                <span>Coding Arena</span>
              </button>
              <button
                onClick={() => navigate('/player/leaderboard')}
                className={navLinkClass('/player/leaderboard')}
              >
                <Trophy className="w-4 h-4" />
                <span>Live Leaderboard</span>
              </button>
              <button
                onClick={() => navigate('/player/submissions')}
                className={navLinkClass('/player/submissions')}
              >
                <FileText className="w-4 h-4" />
                <span>Submissions</span>
              </button>

              {isAdmin && (
                <div className="flex items-center space-x-1 pl-3 ml-2 border-l border-amber-500/30">
                  <button
                    onClick={() => navigate('/admin/dashboard')}
                    className={navLinkClass('/admin/dashboard')}
                  >
                    <Shield className="w-4 h-4 text-amber-400" />
                    <span className="text-amber-300 font-semibold">Admin Panel</span>
                  </button>
                  <button
                    onClick={() => navigate('/admin/questions')}
                    className={navLinkClass('/admin/questions')}
                  >
                    <span>Questions</span>
                  </button>
                  <button
                    onClick={() => navigate('/admin/players')}
                    className={navLinkClass('/admin/players')}
                  >
                    <span>Players</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right Section: Active Program Timer HUD & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Live Program Timer HUD */}
            <div
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-mono font-bold shadow-sm ${timerColor()}`}
              title="Per-program timer controlled by administrator"
            >
              <Clock className="w-3.5 h-3.5" />
              <div className="flex flex-col text-left">
                <span className="text-[10px] opacity-75 uppercase tracking-wide">
                  Prog #{currentQIndex + 1} Timer
                </span>
                <span className="text-sm font-extrabold tracking-wider">
                  {remainingSec !== null ? formatDuration(remainingSec) : '--:--'}
                </span>
              </div>

              {/* Admin Quick Time Actions (Only Admin Can Add Time) */}
              {isAdmin && (
                <div className="flex items-center space-x-1 pl-2 border-l border-zinc-700/60 ml-1">
                  <button
                    onClick={() => handleAdminAddTime(300)}
                    disabled={addingTime}
                    title="Add +5 Minutes to this program"
                    className="px-1.5 py-0.5 bg-amber-500/30 hover:bg-amber-500 text-amber-200 hover:text-black rounded text-[11px] font-sans font-semibold transition"
                  >
                    +5m
                  </button>
                  <button
                    onClick={handleAdminAdvance}
                    title="Advance to next program"
                    className="p-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-xs transition"
                  >
                    <FastForward className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* User Profile / Quick Login Dropdown */}
            {user ? (
              <div className="flex items-center space-x-1 sm:space-x-2 pl-1 sm:pl-2">
                <div className="flex items-center space-x-1.5 sm:space-x-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 sm:px-3 py-1.5 text-xs">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isAdmin ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'
                    }`}
                  />
                  <div className="flex flex-col text-left">
                    <span className="font-semibold text-zinc-200 flex items-center space-x-1">
                      <span className="truncate max-w-[70px] sm:max-w-none">{user.username}</span>
                      {isAdmin && (
                        <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[9px] px-1 py-0.2 rounded font-mono font-bold">
                          ADMIN
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] text-zinc-400 hidden sm:inline">{user.name}</span>
                  </div>
                </div>
                <button
                  onClick={logout}
                  title="Sign Out"
                  className="p-1.5 sm:p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                <button
                  onClick={() => navigate('/player/login')}
                  className="px-2.5 sm:px-3 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-lg border border-zinc-800 transition font-medium"
                >
                  Sign In
                </button>
                <button
                  onClick={() => quickLoginAdmin()}
                  className="px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-lg shadow-sm transition flex items-center space-x-1"
                  title="Sign in with admin credentials: BLACKDRAGON / BLACKDRAGON9025"
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Admin BLACKDRAGON</span>
                  <span className="sm:hidden">Admin</span>
                </button>
              </div>
            )}

            {/* Mobile Menu Toggle */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 text-zinc-400 hover:text-white"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-zinc-950 border-b border-zinc-800 px-4 pt-2 pb-4 space-y-2">
          <button
            onClick={() => {
              navigate('/player/competition');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg flex items-center space-x-2"
          >
            <Code2 className="w-4 h-4 text-amber-400" />
            <span>Coding Arena</span>
          </button>
          <button
            onClick={() => {
              navigate('/player/leaderboard');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg flex items-center space-x-2"
          >
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Live Leaderboard</span>
          </button>
          <button
            onClick={() => {
              navigate('/player/submissions');
              setMobileMenuOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg flex items-center space-x-2"
          >
            <FileText className="w-4 h-4 text-amber-400" />
            <span>Submissions</span>
          </button>

          {isAdmin && (
            <div className="pt-2 border-t border-zinc-800 space-y-1">
              <span className="text-[10px] text-amber-400 uppercase font-mono font-bold px-3">
                Admin Area (BLACKDRAGON)
              </span>
              <button
                onClick={() => {
                  navigate('/admin/dashboard');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-amber-300 hover:bg-zinc-900 rounded-lg flex items-center space-x-2"
              >
                <Shield className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/questions');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg flex items-center space-x-2"
              >
                <span>Manage Questions</span>
              </button>
              <button
                onClick={() => {
                  navigate('/admin/players');
                  setMobileMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-900 rounded-lg flex items-center space-x-2"
              >
                <span>Manage Players</span>
              </button>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};
