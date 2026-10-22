import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Users, UserX, UserCheck, Shield, Award, Calendar } from 'lucide-react';

export const AdminPlayersView: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchPlayers = async () => {
    try {
      const res = await api.getPlayers();
      setPlayers(res.players);
    } catch (err) {
      console.error('Failed to load players:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
  }, []);

  const handleToggle = async (id: string) => {
    try {
      await api.togglePlayer(id);
      fetchPlayers();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle player status');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center space-x-2">
            <Users className="w-7 h-7 text-amber-400" />
            <span>Tournament Contestants</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Monitor registered players, submissions count, and toggle participation access.
          </p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/80 text-xs font-mono text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Contestant
                </th>
                <th scope="col" className="px-6 py-3">
                  Email
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Submissions
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Accepted
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-xs">
              {players.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-white uppercase text-xs">
                        {p.username.slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{p.name}</div>
                        <span className="text-zinc-500 font-mono">@{p.username}</span>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 font-mono text-zinc-400">
                    {p.email}
                  </td>

                  <td className="px-4 py-4 text-center font-mono font-bold text-zinc-200">
                    {p.totalSubmissions || 0}
                  </td>

                  <td className="px-4 py-4 text-center font-mono font-bold text-emerald-400">
                    {p.acceptedSubmissions || 0}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                        p.disabled
                          ? 'bg-red-950 text-red-400 border border-red-500/30'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {p.disabled ? 'DISABLED' : 'ACTIVE'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleToggle(p.id)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                        p.disabled
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                          : 'bg-zinc-800 hover:bg-red-950 hover:text-red-300 text-zinc-300'
                      }`}
                    >
                      {p.disabled ? 'Enable Player' : 'Disable Player'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
