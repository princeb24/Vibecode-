import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { formatDuration } from '../utils/scoring';
import {
  Trophy,
  Medal,
  Clock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Lock,
  Minus,
  Sparkles,
  Download,
} from 'lucide-react';

export const LeaderboardView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [competition, setCompetition] = useState<any | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  const fetchLeaderboard = async () => {
    try {
      const res = await api.getLeaderboard();
      setLeaderboard(res.leaderboard);
      setCompetition(res.competition);

      const qRes = await api.getQuestions();
      setQuestions(qRes.questions);

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchLeaderboard, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-amber-500 text-black flex items-center justify-center font-black text-sm shadow-md shadow-amber-500/30">
          🥇
        </div>
      );
    }
    if (rank === 2) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-200 to-zinc-400 text-black flex items-center justify-center font-black text-sm shadow-md">
          🥈
        </div>
      );
    }
    if (rank === 3) {
      return (
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-600 to-orange-700 text-white flex items-center justify-center font-black text-sm shadow-md">
          🥉
        </div>
      );
    }
    return (
      <span className="w-8 text-center text-sm font-mono font-bold text-zinc-400">
        #{rank}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4" />
            <span>Official Live Standings</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Tournament Leaderboard
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Rankings updated in real-time. Ties broken by lower penalty time (minutes + 20m per wrong submission).
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              autoRefresh
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400'
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>{autoRefresh ? 'Live Auto-Sync (5s)' : 'Auto-Sync Paused'}</span>
          </button>

          {isAdmin && (
            <a
              href="/api/admin/export/leaderboard"
              download
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-lg text-xs font-bold transition shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          )}
        </div>
      </div>

      {/* Main Leaderboard Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/80 text-xs font-mono text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th scope="col" className="px-4 py-3 text-center w-16">
                  Rank
                </th>
                <th scope="col" className="px-6 py-3">
                  Contestant
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Score
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Solved
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Penalty
                </th>
                {/* Columns for each question */}
                {questions.map((q, idx) => (
                  <th key={q.id} scope="col" className="px-3 py-3 text-center text-[11px] whitespace-nowrap">
                    P{idx + 1} ({q.points})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {leaderboard.length === 0 ? (
                <tr>
                  <td colSpan={5 + questions.length} className="px-6 py-12 text-center text-zinc-500">
                    No contestants registered or submitted yet.
                  </td>
                </tr>
              ) : (
                leaderboard.map((row) => {
                  const isCurrent = user?.id === row.userId;

                  return (
                    <tr
                      key={row.userId}
                      className={`transition ${
                        isCurrent
                          ? 'bg-amber-500/10 hover:bg-amber-500/15 font-semibold text-white'
                          : 'hover:bg-zinc-800/40'
                      }`}
                    >
                      <td className="px-4 py-4 text-center">
                        <div className="flex justify-center">{getRankBadge(row.rank)}</div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-zinc-700 to-zinc-600 flex items-center justify-center font-bold text-xs text-white uppercase">
                            {row.username.slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-bold flex items-center space-x-1.5">
                              <span>{row.name}</span>
                              {isCurrent && (
                                <span className="bg-amber-400/20 text-amber-300 text-[10px] px-1.5 py-0.2 rounded border border-amber-400/30">
                                  YOU
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-zinc-500 font-mono">@{row.username}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-4 text-right font-mono font-bold text-amber-400 text-base">
                        {row.totalScore}
                      </td>

                      <td className="px-4 py-4 text-center font-mono">
                        <span className="px-2 py-0.5 bg-zinc-800 rounded text-xs font-semibold text-zinc-200">
                          {row.problemsSolved}/{questions.length}
                        </span>
                      </td>

                      <td className="px-4 py-4 text-right font-mono text-xs text-zinc-400">
                        {row.totalPenaltyMinutes}m
                      </td>

                      {/* Per-problem solve pills */}
                      {questions.map((q) => {
                        const stat = row.problemStats[q.id];
                        if (!stat) {
                          return (
                            <td key={q.id} className="px-3 py-4 text-center">
                              <span className="text-zinc-600">-</span>
                            </td>
                          );
                        }

                        if (stat.solved) {
                          return (
                            <td key={q.id} className="px-3 py-4 text-center">
                              <div
                                className="inline-flex flex-col items-center bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 rounded px-2 py-0.5 text-[11px] font-mono shadow-sm"
                                title={`Solved in ${stat.attempts} attempt(s) at ${stat.solvedAtMinutes}m`}
                              >
                                <span className="font-bold">+{stat.points}</span>
                                <span className="text-[9px] opacity-75">{stat.attempts} try</span>
                              </div>
                            </td>
                          );
                        }

                        if (stat.attempts > 0) {
                          return (
                            <td key={q.id} className="px-3 py-4 text-center">
                              <div
                                className="inline-flex flex-col items-center bg-red-950/40 border border-red-500/30 text-red-400 rounded px-2 py-0.5 text-[11px] font-mono"
                                title={`${stat.attempts} wrong attempt(s)`}
                              >
                                <span>-{stat.attempts}</span>
                              </div>
                            </td>
                          );
                        }

                        if (stat.status === 'expired') {
                          return (
                            <td key={q.id} className="px-3 py-4 text-center text-zinc-600">
                              <span title="Time expired without submission">
                                <Lock className="w-3.5 h-3.5 mx-auto text-zinc-600" />
                              </span>
                            </td>
                          );
                        }

                        return (
                          <td key={q.id} className="px-3 py-4 text-center text-zinc-600">
                            <Minus className="w-3.5 h-3.5 mx-auto text-zinc-700" />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
