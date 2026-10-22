import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export const ConnectionBanner: React.FC = () => {
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    api.setConnectionErrorListener((err, msg) => {
      setHasError(err);
      if (msg) setErrorMessage(msg);
    });

    // Initial check
    checkStatus();
  }, []);

  const checkStatus = async () => {
    setChecking(true);
    try {
      await api.checkHealth();
      setHasError(false);
    } catch (err: any) {
      setHasError(true);
      setErrorMessage(err.message || 'Server connection unreachable');
    } finally {
      setChecking(false);
    }
  };

  if (!hasError) return null;

  return (
    <div className="bg-red-950/90 border-b border-red-500/50 text-red-200 px-4 py-2 text-sm flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
      <div className="flex items-center space-x-2">
        <WifiOff className="w-4 h-4 text-red-400 animate-pulse" />
        <span className="font-semibold text-red-100">Server Connection Error:</span>
        <span>{errorMessage || 'Unable to connect to the online Code Battle backend.'}</span>
      </div>
      <button
        onClick={checkStatus}
        disabled={checking}
        className="flex items-center space-x-1.5 px-3 py-1 bg-red-800/60 hover:bg-red-700 text-white rounded text-xs transition border border-red-500/30 font-medium"
      >
        <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
        <span>{checking ? 'Reconnecting...' : 'Retry Connection'}</span>
      </button>
    </div>
  );
};
