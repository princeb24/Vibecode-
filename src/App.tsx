import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ConnectionBanner } from './components/ConnectionBanner';
import { ArenaView } from './views/ArenaView';
import { LeaderboardView } from './views/LeaderboardView';
import { SubmissionsView } from './views/SubmissionsView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminQuestionsView } from './views/AdminQuestionsView';
import { AdminPlayersView } from './views/AdminPlayersView';
import { LoginView } from './views/LoginView';
import { ShieldAlert } from 'lucide-react';

function AppContent() {
  const { user, isAdmin, loading } = useAuth();
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname === '/' ? '/player/competition' : window.location.pathname;
  });

  // Browser popstate handling
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname || '/player/competition');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    window.scrollTo(0, 0);
  };

  // Guard for admin routes
  const isAdminRoute = currentRoute.startsWith('/admin') && currentRoute !== '/admin/login';
  const isUnauthorizedAdmin = isAdminRoute && !isAdmin;

  const renderView = () => {
    if (loading) {
      return (
        <div className="flex-1 flex items-center justify-center p-12 text-zinc-400">
          <div className="flex flex-col items-center space-y-3">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Initializing Code Battle Arena...</span>
          </div>
        </div>
      );
    }

    if (isUnauthorizedAdmin) {
      return (
        <div className="max-w-md mx-auto my-16 p-8 bg-zinc-900 border border-red-500/40 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-red-950 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Administrator Access Required</h2>
          <p className="text-xs text-zinc-400">
            This route is reserved exclusively for tournament administrator <strong className="text-amber-400">BLACKDRAGON</strong>.
            Please sign in with administrator credentials to continue.
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/admin/login')}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-xs shadow-md transition"
            >
              Go to Admin Login
            </button>
          </div>
        </div>
      );
    }

    switch (currentRoute) {
      case '/admin/login':
        return (
          <LoginView
            isAdminLogin={true}
            onSuccess={() => navigate('/admin/dashboard')}
          />
        );
      case '/player/login':
        return (
          <LoginView
            isAdminLogin={false}
            onSuccess={(admin) => navigate(admin ? '/admin/dashboard' : '/player/competition')}
          />
        );
      case '/admin/dashboard':
      case '/admin/competition':
        return <AdminDashboardView />;
      case '/admin/questions':
        return <AdminQuestionsView />;
      case '/admin/players':
        return <AdminPlayersView />;
      case '/admin/results':
      case '/player/leaderboard':
        return <LeaderboardView />;
      case '/admin/submissions':
      case '/player/submissions':
        return <SubmissionsView />;
      case '/player/dashboard':
      case '/player/competition':
      default:
        return <ArenaView />;
    }
  };

  return (
    <div className="min-h-screen bg-black text-zinc-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-white">
      <ConnectionBanner />
      <Navbar currentRoute={currentRoute} navigate={navigate} />
      <main className="flex-1 flex flex-col">{renderView()}</main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
