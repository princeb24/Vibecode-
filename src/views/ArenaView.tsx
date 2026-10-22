import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { CodeEditor } from '../components/CodeEditor';
import { TestTerminal } from '../components/TestTerminal';
import { formatDuration } from '../utils/scoring';
import {
  Lock,
  Clock,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  Flame,
  Award,
  Sparkles,
  ArrowRight,
  RotateCw,
  FastForward,
} from 'lucide-react';

export const ArenaView: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionId, setCurrentQuestionId] = useState<string>('');
  const [activeQuestion, setActiveQuestion] = useState<any | null>(null);
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  // Execution states
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [runResult, setRunResult] = useState<any | null>(null);
  const [submitResult, setSubmitResult] = useState<any | null>(null);
  const [timeExpiredModal, setTimeExpiredModal] = useState<boolean>(false);

  // Responsive layout tab for mobile & tablet (problem | editor | output)
  const [mobileTab, setMobileTab] = useState<'problem' | 'editor' | 'output'>('editor');

  // Competition & Per-Program Timer
  const [remainingSeconds, setRemainingSeconds] = useState<number>(600);
  const [compStatus, setCompStatus] = useState<string>('active');

  // Fetch competition & question list
  const loadArenaData = async (targetQId?: string) => {
    try {
      const compRes = await api.getCompetition();
      setCompStatus(compRes.competition.status);
      setRemainingSeconds(compRes.currentQuestionRemainingSeconds);

      const qListRes = await api.getQuestions();
      setQuestions(qListRes.questions);

      const activeQId = targetQId || qListRes.currentQuestionId || qListRes.questions[0]?.id;
      setCurrentQuestionId(qListRes.currentQuestionId);

      if (activeQId) {
        const fullQ = await api.getQuestion(activeQId);
        setActiveQuestion(fullQ);
        // Default to question's starter code for selected language
        if (fullQ.starterCode && fullQ.starterCode[language]) {
          setCode(fullQ.starterCode[language]);
        }
      }
    } catch (err) {
      console.error('Failed to load arena data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadArenaData();

    // Poll timer & question progression every 4 seconds
    const interval = setInterval(async () => {
      try {
        const compRes = await api.getCompetition();
        setCompStatus(compRes.competition.status);
        setRemainingSeconds(compRes.currentQuestionRemainingSeconds);

        if (compRes.competition.currentQuestionId !== currentQuestionId) {
          // Question has advanced!
          setCurrentQuestionId(compRes.competition.currentQuestionId);
          loadArenaData(compRes.competition.currentQuestionId);
          setTimeExpiredModal(true);
        }
      } catch (err) {}
    }, 4000);

    return () => clearInterval(interval);
  }, [currentQuestionId]);

  // Local second-by-second countdown
  useEffect(() => {
    if (remainingSeconds <= 0 || compStatus !== 'active') return;
    const ticker = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          // Time expired! Refresh arena state
          loadArenaData();
          setTimeExpiredModal(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(ticker);
  }, [remainingSeconds, compStatus]);

  // Handle language change
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (activeQuestion?.starterCode && activeQuestion.starterCode[newLang]) {
      setCode(activeQuestion.starterCode[newLang]);
    }
  };

  // Reset to starter template
  const handleResetStarter = () => {
    if (!activeQuestion) return;
    if (confirm('Reset code back to the original starter template? All unsaved modifications will be replaced.')) {
      if (activeQuestion.starterCode && activeQuestion.starterCode[language]) {
        setCode(activeQuestion.starterCode[language]);
      }
    }
  };

  // Select a question to view from the list
  const handleSelectQuestion = async (qId: string) => {
    try {
      setLoading(true);
      const fullQ = await api.getQuestion(qId);
      setActiveQuestion(fullQ);
      if (fullQ.starterCode && fullQ.starterCode[language]) {
        setCode(fullQ.starterCode[language]);
      }
      setRunResult(null);
      setSubmitResult(null);
    } catch (err) {
      console.error('Failed to select question:', err);
    } finally {
      setLoading(false);
    }
  };

  // Run Code against selected input
  const handleRun = async (input: string) => {
    if (!activeQuestion) return;
    setIsRunning(true);
    setRunResult(null);
    try {
      const res = await api.runCode(language, code, input);
      setRunResult(res);
      setMobileTab('output');
    } catch (err: any) {
      setRunResult({
        verdict: 'RUNTIME_ERROR',
        stderr: err.message || 'Execution failed',
      });
      setMobileTab('output');
    } finally {
      setIsRunning(false);
    }
  };

  // Submit Code for tournament evaluation
  const handleSubmit = async () => {
    if (!activeQuestion) return;
    setIsSubmitting(true);
    setSubmitResult(null);
    try {
      const res = await api.submitCode(activeQuestion.id, language, code);
      setSubmitResult(res);
      setMobileTab('output');

      if (res.submission?.verdict === 'ACCEPTED') {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#10B981', '#F59E0B', '#3B82F6', '#EC4899'],
        });
      }
    } catch (err: any) {
      if (err.isTimeExpiredLocked) {
        alert(err.message || 'Time is over for this program! Previous program is locked.');
        loadArenaData();
      } else {
        alert(err.message || 'Submission failed');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if current viewed question is locked (time expired)
  const isQuestionLocked = activeQuestion?.isTimeExpiredLocked || remainingSeconds <= 0 && activeQuestion?.id === currentQuestionId;

  return (
    <div className="max-w-[1700px] mx-auto px-2 sm:px-6 py-3 sm:py-4 flex flex-col min-h-[calc(100vh-5rem)] lg:h-[calc(100vh-5rem)]">
      {/* Top Banner: Sequential Question Stepper & Per-Program Timer HUD */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-3 mb-3 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        {/* Stepper of questions */}
        <div className="flex items-center space-x-2 overflow-x-auto py-1 max-w-full">
          <span className="text-xs font-mono font-bold text-zinc-400 uppercase tracking-wider hidden sm:inline mr-1">
            Program Queue:
          </span>
          {questions.map((q, idx) => {
            const isActive = q.id === currentQuestionId;
            const isViewing = q.id === activeQuestion?.id;
            const isLocked = q.isTimeExpiredLocked;

            return (
              <button
                key={q.id}
                onClick={() => handleSelectQuestion(q.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition whitespace-nowrap ${
                  isViewing
                    ? 'ring-2 ring-amber-400 bg-zinc-800 text-white font-bold'
                    : isActive
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    : isLocked
                    ? 'bg-red-950/30 text-red-400 border border-red-900/40 opacity-70'
                    : 'bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200'
                }`}
                title={
                  isActive
                    ? 'CURRENT ACTIVE PROGRAM'
                    : isLocked
                    ? 'TIME OVER - LOCKED'
                    : 'Upcoming program'
                }
              >
                {isLocked ? (
                  <Lock className="w-3.5 h-3.5 text-red-400" />
                ) : isActive ? (
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-zinc-600" />
                )}
                <span>
                  #{idx + 1} {q.title.split(':')[0]}
                </span>
                <span className="text-[10px] opacity-60">({q.points}pts)</span>
              </button>
            );
          })}
        </div>

        {/* Prominent Per-Program Countdown HUD */}
        <div className="flex items-center space-x-3 bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-1.5">
          <Clock className={`w-4 h-4 ${remainingSeconds <= 120 ? 'text-red-400 animate-spin' : 'text-amber-400'}`} />
          <div className="flex flex-col text-left">
            <span className="text-[10px] text-zinc-400 font-mono tracking-tight uppercase">
              Time Allotted by <span className="text-amber-400 font-bold">BLACKDRAGON</span>
            </span>
            <span
              className={`text-base font-mono font-black tracking-wider ${
                remainingSeconds <= 60
                  ? 'text-red-400 animate-pulse'
                  : remainingSeconds <= 180
                  ? 'text-amber-400'
                  : 'text-emerald-400'
              }`}
            >
              {remainingSeconds > 0 ? formatDuration(remainingSeconds) : '00:00 - TIME OVER'}
            </span>
          </div>

          {/* If Admin, show Quick Time Add (+5m) */}
          {isAdmin && (
            <button
              onClick={async () => {
                await api.addTimeToCurrentQuestion(300);
                loadArenaData();
              }}
              className="px-2 py-1 bg-amber-500 hover:bg-amber-400 text-black rounded text-[11px] font-bold transition shadow-sm ml-2"
              title="Add 5 minutes (Admin BLACKDRAGON only)"
            >
              +5 Min
            </button>
          )}
        </div>
      </div>

      {/* Mobile / Tablet Tab Switcher */}
      <div className="lg:hidden flex items-center justify-around bg-zinc-900 border border-zinc-800 rounded-lg p-1 mb-2 text-xs font-semibold">
        <button
          onClick={() => setMobileTab('problem')}
          className={`flex-1 py-1.5 rounded-md transition ${
            mobileTab === 'problem' ? 'bg-amber-500 text-black' : 'text-zinc-400'
          }`}
        >
          Problem Brief
        </button>
        <button
          onClick={() => setMobileTab('editor')}
          className={`flex-1 py-1.5 rounded-md transition ${
            mobileTab === 'editor' ? 'bg-amber-500 text-black' : 'text-zinc-400'
          }`}
        >
          Code Editor
        </button>
        <button
          onClick={() => setMobileTab('output')}
          className={`flex-1 py-1.5 rounded-md transition ${
            mobileTab === 'output' ? 'bg-amber-500 text-black' : 'text-zinc-400'
          }`}
        >
          Test & Terminal
        </button>
      </div>

      {/* Main Multi-Pane Arena Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 overflow-hidden">
        {/* LEFT COLUMN: Problem Brief & Instructions */}
        <div
          className={`lg:col-span-5 h-full flex flex-col bg-zinc-900/80 border border-zinc-800 rounded-xl overflow-hidden shadow-xl ${
            mobileTab !== 'problem' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {activeQuestion ? (
            <div className="flex-1 p-5 overflow-y-auto space-y-5 text-sm text-zinc-300">
              {/* Question Header */}
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] font-semibold font-mono ${
                      activeQuestion.difficulty === 'Easy'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                        : activeQuestion.difficulty === 'Medium'
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                        : 'bg-red-950 text-red-400 border border-red-500/30'
                    }`}
                  >
                    {activeQuestion.difficulty}
                  </span>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                    {activeQuestion.category}
                  </span>
                  <span className="text-xs font-mono text-amber-400 font-bold bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded">
                    +{activeQuestion.points} pts
                  </span>
                  <span className="text-xs font-mono text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">
                    Limit: {activeQuestion.allocatedTimeMinutes || 10}m
                  </span>
                </div>

                <h1 className="text-xl font-black text-white">{activeQuestion.title}</h1>
              </div>

              {/* Status Warning if locked */}
              {isQuestionLocked && (
                <div className="bg-red-950/60 border border-red-500/40 rounded-xl p-3 flex items-start space-x-2.5 text-red-200 text-xs">
                  <Lock className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold uppercase tracking-wider text-red-300">
                      Time Over: Program Locked
                    </strong>
                    The time limit for this problem has concluded. Submissions are strictly prohibited.
                    Please advance to the active challenge in the queue.
                  </div>
                </div>
              )}

              {/* Problem Description */}
              <div className="prose prose-invert prose-sm max-w-none text-zinc-300 leading-relaxed whitespace-pre-wrap">
                {activeQuestion.description}
              </div>

              {/* Input & Output Format */}
              {(activeQuestion.inputFormat || activeQuestion.outputFormat) && (
                <div className="space-y-3 bg-zinc-950/60 p-3 rounded-lg border border-zinc-800">
                  {activeQuestion.inputFormat && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1 font-mono">
                        Input Format:
                      </h4>
                      <p className="text-xs font-mono text-zinc-200 whitespace-pre-wrap">
                        {activeQuestion.inputFormat}
                      </p>
                    </div>
                  )}
                  {activeQuestion.outputFormat && (
                    <div>
                      <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-1 font-mono">
                        Output Format:
                      </h4>
                      <p className="text-xs font-mono text-zinc-200 whitespace-pre-wrap">
                        {activeQuestion.outputFormat}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Constraints */}
              {activeQuestion.constraints && activeQuestion.constraints.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 font-mono">
                    Constraints:
                  </h4>
                  <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300 font-mono bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/80">
                    {activeQuestion.constraints.map((c: string, idx: number) => (
                      <li key={idx}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Example Test Cases */}
              {activeQuestion.testCases && activeQuestion.testCases.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wide mb-2 font-mono">
                    Sample Test Cases:
                  </h4>
                  <div className="space-y-3">
                    {activeQuestion.testCases.map((tc: any, idx: number) => (
                      <div key={idx} className="bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs font-mono">
                        <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                          Example {idx + 1}
                        </span>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Input:</span>
                            <pre className="p-1.5 bg-zinc-900 rounded text-zinc-200 overflow-x-auto">
                              {tc.input}
                            </pre>
                          </div>
                          <div>
                            <span className="text-zinc-500 text-[10px] block">Output:</span>
                            <pre className="p-1.5 bg-zinc-900 rounded text-zinc-200 overflow-x-auto">
                              {tc.expectedOutput}
                            </pre>
                          </div>
                        </div>
                        {tc.explanation && (
                          <p className="mt-2 text-[11px] text-zinc-400 font-sans italic">
                            {tc.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-6 text-zinc-500">
              Select a question to view
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Code Editor (top) & Test Terminal (bottom) */}
        <div
          className={`lg:col-span-7 h-full flex flex-col gap-3 min-h-0 ${
            mobileTab === 'problem' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Top Half: Code Editor */}
          <div className={`flex-1 min-h-[300px] ${mobileTab === 'output' ? 'hidden lg:flex' : 'flex'}`}>
            <CodeEditor
              language={language}
              onLanguageChange={handleLanguageChange}
              code={code}
              onChange={setCode}
              onResetStarter={handleResetStarter}
              isLocked={isQuestionLocked}
              onRun={() => handleRun(activeQuestion?.testCases[0]?.input || '')}
              onSubmit={handleSubmit}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
            />
          </div>

          {/* Bottom Half: Test Terminal & Execution Panel */}
          <div className={`h-[280px] lg:h-[300px] ${mobileTab === 'editor' ? 'hidden lg:flex' : 'flex'}`}>
            <TestTerminal
              testCases={activeQuestion?.testCases || []}
              onRun={handleRun}
              onSubmit={handleSubmit}
              isRunning={isRunning}
              isSubmitting={isSubmitting}
              runResult={runResult}
              submitResult={submitResult}
              isLocked={isQuestionLocked}
            />
          </div>
        </div>
      </div>

      {/* TIME EXPIRED AUTO-ADVANCE MODAL */}
      {timeExpiredModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
              <FastForward className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-black text-white">Time Expired: Next Challenge Active!</h2>
            <p className="text-sm text-zinc-300">
              The time limit set by Administrator <strong className="text-amber-400">BLACKDRAGON</strong> has finished.
              The previous program has been automatically locked, and the arena has advanced to the next challenge!
            </p>
            <button
              onClick={() => setTimeExpiredModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold rounded-xl shadow-lg transition"
            >
              Continue to Active Challenge
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
