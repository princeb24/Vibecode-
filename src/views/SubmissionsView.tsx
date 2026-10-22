import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Code2,
  X,
  Copy,
  Check,
} from 'lucide-react';

export const SubmissionsView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedSub, setSelectedSub] = useState<any | null>(null);
  const [filterVerdict, setFilterVerdict] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  const fetchSubmissions = async () => {
    try {
      const res = await api.getSubmissions({ verdict: filterVerdict || undefined });
      setSubmissions(res.submissions);
    } catch (err) {
      console.error('Failed to fetch submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [filterVerdict]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'ACCEPTED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ACCEPTED</span>
          </span>
        );
      case 'WRONG_ANSWER':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-red-950/80 text-red-400 border border-red-500/30">
            <XCircle className="w-3.5 h-3.5" />
            <span>WRONG ANSWER</span>
          </span>
        );
      case 'TIME_LIMIT_EXCEEDED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-950/80 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5" />
            <span>TIME LIMIT EXCEEDED</span>
          </span>
        );
      case 'COMPILATION_ERROR':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-950/80 text-purple-400 border border-purple-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>COMPILATION ERROR</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-zinc-800 text-zinc-300">
            <span>{verdict}</span>
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-1">
            <FileText className="w-4 h-4" />
            <span>{isAdmin ? 'All Tournament Submissions' : 'Your Submissions'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">Submission History</h1>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-3">
          <select
            value={filterVerdict}
            onChange={(e) => setFilterVerdict(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 text-zinc-300 text-xs rounded-lg px-3 py-2 font-mono"
          >
            <option value="">All Verdicts</option>
            <option value="ACCEPTED">Accepted (AC)</option>
            <option value="WRONG_ANSWER">Wrong Answer (WA)</option>
            <option value="TIME_LIMIT_EXCEEDED">Time Limit (TLE)</option>
            <option value="COMPILATION_ERROR">Compilation Error (CE)</option>
          </select>
        </div>
      </div>

      {/* Submissions Table */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/80 text-xs font-mono text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Submission ID
                </th>
                {isAdmin && (
                  <th scope="col" className="px-6 py-3">
                    Contestant
                  </th>
                )}
                <th scope="col" className="px-6 py-3">
                  Problem
                </th>
                <th scope="col" className="px-4 py-3">
                  Language
                </th>
                <th scope="col" className="px-6 py-3">
                  Verdict
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Pass Rate
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Time (ms)
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Submitted At
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {submissions.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 8 : 7} className="px-6 py-12 text-center text-zinc-500 font-sans">
                    No submissions found. Solve problems in the Arena to create your first submission!
                  </td>
                </tr>
              ) : (
                submissions.map((sub) => (
                  <tr
                    key={sub.id}
                    onClick={() => setSelectedSub(sub)}
                    className="hover:bg-zinc-800/50 cursor-pointer transition"
                  >
                    <td className="px-6 py-4 font-semibold text-amber-400 underline decoration-dotted">
                      {sub.id}
                    </td>

                    {isAdmin && (
                      <td className="px-6 py-4 font-sans font-medium text-zinc-200">
                        {sub.userDisplayName} (@{sub.username})
                      </td>
                    )}

                    <td className="px-6 py-4 font-sans font-semibold text-zinc-100">
                      {sub.questionTitle}
                    </td>

                    <td className="px-4 py-4 uppercase text-zinc-400 font-bold">
                      {sub.language}
                    </td>

                    <td className="px-6 py-4">{getVerdictBadge(sub.verdict)}</td>

                    <td className="px-4 py-4 text-center">
                      <span className="px-2 py-0.5 bg-zinc-800 rounded font-bold text-zinc-300">
                        {sub.passedTestCases}/{sub.totalTestCases}
                      </span>
                    </td>

                    <td className="px-4 py-4 text-right text-zinc-400">
                      {sub.executionTimeMs}ms
                    </td>

                    <td className="px-6 py-4 text-right text-zinc-500 font-sans text-xs">
                      {new Date(sub.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Inspection Modal */}
      {selectedSub && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <div className="flex items-center space-x-3">
                <Code2 className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-base">
                    {selectedSub.questionTitle}
                  </h3>
                  <span className="text-xs text-zinc-400 font-mono">
                    ID: {selectedSub.id} • {selectedSub.language.toUpperCase()} • Passed {selectedSub.passedTestCases}/{selectedSub.totalTestCases}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleCopyCode(selectedSub.code)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                  title="Copy code"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setSelectedSub(null)}
                  className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Submitted Code */}
            <div className="flex-1 p-4 overflow-y-auto bg-[#0d1117] font-mono text-xs">
              <pre className="text-zinc-200 whitespace-pre-wrap select-all leading-relaxed">
                {selectedSub.code}
              </pre>
            </div>

            {/* Modal Footer with Verdict */}
            <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between">
              <div>{getVerdictBadge(selectedSub.verdict)}</div>
              <button
                onClick={() => setSelectedSub(null)}
                className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
