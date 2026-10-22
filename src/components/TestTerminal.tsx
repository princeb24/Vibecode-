import React, { useState } from 'react';
import { Play, Send, CheckCircle2, XCircle, AlertTriangle, Clock, Terminal, ChevronRight, Sparkles } from 'lucide-react';

interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  explanation?: string;
}

interface TestTerminalProps {
  testCases: TestCase[];
  onRun: (input: string) => void;
  onSubmit: () => void;
  isRunning: boolean;
  isSubmitting: boolean;
  runResult: any | null;
  submitResult: any | null;
  isLocked?: boolean;
}

export const TestTerminal: React.FC<TestTerminalProps> = ({
  testCases,
  onRun,
  onSubmit,
  isRunning,
  isSubmitting,
  runResult,
  submitResult,
  isLocked = false,
}) => {
  const [activeTab, setActiveTab] = useState<'sample' | 'custom' | 'submission'>('sample');
  const [selectedSampleIndex, setSelectedSampleIndex] = useState<number>(0);
  const [customInput, setCustomInput] = useState<string>('');

  const activeTestCase = testCases[selectedSampleIndex] || testCases[0];

  const handleRunClick = () => {
    if (activeTab === 'custom') {
      onRun(customInput);
    } else {
      onRun(activeTestCase?.input || '');
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case 'ACCEPTED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 rounded-md text-xs font-mono font-bold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>ACCEPTED (AC)</span>
          </span>
        );
      case 'WRONG_ANSWER':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-red-950/80 text-red-400 border border-red-500/40 rounded-md text-xs font-mono font-bold">
            <XCircle className="w-3.5 h-3.5" />
            <span>WRONG ANSWER (WA)</span>
          </span>
        );
      case 'TIME_LIMIT_EXCEEDED':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-amber-950/80 text-amber-400 border border-amber-500/40 rounded-md text-xs font-mono font-bold">
            <Clock className="w-3.5 h-3.5" />
            <span>TIME LIMIT EXCEEDED (TLE)</span>
          </span>
        );
      case 'COMPILATION_ERROR':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-purple-950/80 text-purple-400 border border-purple-500/40 rounded-md text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>COMPILATION ERROR (CE)</span>
          </span>
        );
      case 'RUNTIME_ERROR':
        return (
          <span className="flex items-center space-x-1 px-2.5 py-1 bg-orange-950/80 text-orange-400 border border-orange-500/40 rounded-md text-xs font-mono font-bold">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>RUNTIME ERROR (RTE)</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 bg-zinc-800 text-zinc-300 rounded-md text-xs font-mono font-bold">
            {verdict}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-xl h-full">
      {/* Tab Navigation Header */}
      <div className="bg-zinc-900/90 px-4 py-2 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setActiveTab('sample')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'sample'
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Example Cases ({testCases.length})
          </button>
          <button
            onClick={() => setActiveTab('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              activeTab === 'custom'
                ? 'bg-zinc-800 text-amber-400 border border-zinc-700 font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Custom Test Input
          </button>
          {submitResult && (
            <button
              onClick={() => setActiveTab('submission')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition flex items-center space-x-1 ${
                activeTab === 'submission'
                  ? 'bg-zinc-800 text-amber-400 border border-zinc-700 font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Submission Verdict</span>
            </button>
          )}
        </div>

        {/* Action Buttons: Run Code and Submit */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleRunClick}
            disabled={isRunning || isSubmitting || isLocked}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg text-xs font-semibold border border-zinc-700 transition disabled:opacity-40"
            title="Compile and run code against selected test case"
          >
            <Play className={`w-3.5 h-3.5 text-amber-400 ${isRunning ? 'animate-spin' : ''}`} />
            <span>{isRunning ? 'Running...' : 'Run Code'}</span>
          </button>

          <button
            onClick={onSubmit}
            disabled={isSubmitting || isRunning || isLocked}
            className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-bold text-black transition shadow-md disabled:opacity-40 ${
              isLocked
                ? 'bg-zinc-700 text-zinc-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-400 to-emerald-500 hover:from-emerald-300 hover:to-emerald-400 shadow-emerald-500/20'
            }`}
            title={isLocked ? 'This program is locked' : 'Submit solution to tournament evaluation'}
          >
            <Send className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-pulse' : ''}`} />
            <span>{isSubmitting ? 'Evaluating...' : isLocked ? 'Program Locked' : 'Submit Solution'}</span>
          </button>
        </div>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {/* TAB 1: Sample Test Cases */}
        {activeTab === 'sample' && (
          <div className="space-y-3">
            {/* Case selector pills */}
            <div className="flex items-center space-x-2">
              {testCases.map((tc, idx) => (
                <button
                  key={tc.id || idx}
                  onClick={() => setSelectedSampleIndex(idx)}
                  className={`px-3 py-1 rounded-md text-xs font-mono font-medium transition ${
                    selectedSampleIndex === idx
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                      : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800'
                  }`}
                >
                  Case {idx + 1}
                </button>
              ))}
            </div>

            {activeTestCase && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div>
                  <span className="text-zinc-400 block mb-1 font-sans font-medium">Input:</span>
                  <pre className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-200 whitespace-pre-wrap select-all">
                    {activeTestCase.input}
                  </pre>
                </div>
                <div>
                  <span className="text-zinc-400 block mb-1 font-sans font-medium">Expected Output:</span>
                  <pre className="p-2.5 bg-zinc-900/90 border border-zinc-800 rounded-lg text-zinc-200 whitespace-pre-wrap select-all">
                    {activeTestCase.expectedOutput}
                  </pre>
                </div>
              </div>
            )}

            {activeTestCase?.explanation && (
              <p className="text-xs text-zinc-400 font-sans italic bg-zinc-900/40 p-2 rounded border border-zinc-800/60">
                <span className="font-semibold text-zinc-300">Explanation:</span> {activeTestCase.explanation}
              </p>
            )}
          </div>
        )}

        {/* TAB 2: Custom Input */}
        {activeTab === 'custom' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-zinc-300">Custom Stdin Input:</label>
            <textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              disabled={isLocked}
              placeholder="Enter stdin input to pass into your code..."
              rows={4}
              className="w-full p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500 leading-relaxed"
            />
          </div>
        )}

        {/* TAB 3: Full Submission Verdict */}
        {activeTab === 'submission' && submitResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-zinc-900/90 p-3 rounded-lg border border-zinc-800">
              <div className="flex items-center space-x-3">
                {getVerdictBadge(submitResult.submission?.verdict || submitResult.verdict)}
                <span className="text-sm font-semibold text-zinc-200">
                  Passed {submitResult.submission?.passedTestCases}/{submitResult.submission?.totalTestCases} Test Cases
                </span>
              </div>
              <div className="text-xs font-mono text-amber-400 font-bold">
                Score: +{submitResult.submission?.score || 0} pts
              </div>
            </div>

            {/* Test Case breakdown list */}
            {submitResult.submission?.results && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400">Detailed Test Results:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {submitResult.submission.results.map((r: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between ${
                        r.status === 'ACCEPTED'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                          : 'bg-red-950/40 border-red-500/30 text-red-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        {r.status === 'ACCEPTED' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-red-400" />
                        )}
                        <span>{r.isPrivate ? `Private #${idx + 1}` : `Sample #${idx + 1}`}</span>
                      </div>
                      <span className="text-[10px] opacity-80">{r.executionTimeMs}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Execution Output Panel (from Run Code) */}
        {runResult && (
          <div className="mt-4 pt-3 border-t border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center space-x-1.5">
                <Terminal className="w-3.5 h-3.5 text-amber-400" />
                <span>Execution Output</span>
              </span>
              <div className="flex items-center space-x-2">
                {getVerdictBadge(runResult.verdict)}
                {runResult.executionTimeMs !== undefined && (
                  <span className="text-[11px] font-mono text-zinc-400">
                    {runResult.executionTimeMs} ms
                  </span>
                )}
              </div>
            </div>

            {runResult.stdout && (
              <div>
                <span className="text-[11px] text-zinc-400 block mb-1">Standard Output:</span>
                <pre className="p-2.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-mono text-emerald-300 whitespace-pre-wrap select-all max-h-36 overflow-y-auto">
                  {runResult.stdout}
                </pre>
              </div>
            )}

            {runResult.stderr && (
              <div>
                <span className="text-[11px] text-red-400 block mb-1">Standard Error / Logs:</span>
                <pre className="p-2.5 bg-red-950/40 border border-red-800/50 rounded-lg text-xs font-mono text-red-300 whitespace-pre-wrap select-all max-h-36 overflow-y-auto">
                  {runResult.stderr}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
