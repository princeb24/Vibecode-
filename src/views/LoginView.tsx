import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Key, Mail, Swords, Sparkles, ArrowRight } from 'lucide-react';

interface LoginViewProps {
  initialMode?: 'login' | 'register';
  isAdminLogin?: boolean;
  onSuccess: (isAdmin: boolean) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  initialMode = 'login',
  isAdminLogin = false,
  onSuccess,
}) => {
  const { login, register, quickLoginAdmin, quickLoginPlayer } = useAuth();
  const [isRegister, setIsRegister] = useState<boolean>(initialMode === 'register');
  const [username, setUsername] = useState<string>(isAdminLogin ? 'BLACKDRAGON' : '');
  const [password, setPassword] = useState<string>(isAdminLogin ? 'BLACKDRAGON9025' : '');
  const [email, setEmail] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const u = await register(username, email, name, password);
        onSuccess(u.role === 'admin');
      } else {
        const u = await login(username, password);
        onSuccess(u.role === 'admin');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await quickLoginAdmin();
      onSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as BLACKDRAGON');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPlayer = async () => {
    setError('');
    setLoading(true);
    try {
      const u = await quickLoginPlayer();
      onSuccess(false);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in as Player Alex');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full space-y-6">
        {/* Logo Card */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-red-600 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/20">
            <Swords className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white">
            {isRegister ? 'Join the Arena' : isAdminLogin ? 'Administrator Access' : 'Sign In to Arena'}
          </h2>
          <p className="text-xs text-zinc-400">
            {isAdminLogin
              ? 'Enter administrator credentials (BLACKDRAGON) to control the tournament.'
              : 'Competitive programming and algorithmic debugging tournament.'}
          </p>
        </div>

        {/* 1-Click Instant Demo Login Buttons */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-2 shadow-xl">
          <span className="text-[10px] font-mono font-bold uppercase text-zinc-400 tracking-wider block text-center">
            ⚡ 1-Click Instant Demo Sign-In
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={handleQuickAdmin}
              disabled={loading}
              className="px-3 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-amber-500/20 transition disabled:opacity-50"
            >
              <Shield className="w-4 h-4" />
              <span>Admin BLACKDRAGON</span>
            </button>
            <button
              onClick={handleQuickPlayer}
              disabled={loading}
              className="px-3 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
            >
              <User className="w-4 h-4 text-emerald-400" />
              <span>Player Alex Chen</span>
            </button>
          </div>
        </div>

        {/* Credentials Form */}
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
          {error && (
            <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Alex Chen"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex@example.com"
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-zinc-300 font-semibold mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-white focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-black rounded-xl text-sm shadow-lg shadow-amber-500/20 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
            >
              <span>{loading ? 'Authenticating...' : isRegister ? 'Complete Registration' : 'Sign In'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Toggle between login and register */}
          <div className="pt-2 text-center">
            <button
              onClick={() => {
                setIsRegister(!isRegister);
                setError('');
              }}
              className="text-xs text-amber-400 hover:underline"
            >
              {isRegister
                ? 'Already have an account? Sign In'
                : "Don't have an account? Register as Contestant"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
