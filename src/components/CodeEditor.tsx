import React, { useState, useRef, useEffect } from 'react';
import {
  Code,
  RotateCcw,
  Copy,
  Check,
  Lock,
  Sparkles,
  Terminal,
  Type,
  Maximize2,
  Minimize2,
} from 'lucide-react';

interface CodeEditorProps {
  language: string;
  onLanguageChange: (lang: string) => void;
  code: string;
  onChange: (newCode: string) => void;
  onResetStarter: () => void;
  isLocked?: boolean;
  onRun?: () => void;
  onSubmit?: () => void;
  isRunning?: boolean;
  isSubmitting?: boolean;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  language,
  onLanguageChange,
  code,
  onChange,
  onResetStarter,
  isLocked = false,
  onRun,
  onSubmit,
  isRunning = false,
  isSubmitting = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [fontSize, setFontSize] = useState<number>(14);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Line count for line numbers gutter
  const lines = code.split('\n');
  const lineCount = Math.max(lines.length, 18);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard support: Tab for 4 spaces, Ctrl+Enter to Run, Ctrl+Shift+Enter to Submit
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isLocked) return;

    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        if (onSubmit && !isSubmitting) onSubmit();
      } else {
        if (onRun && !isRunning) onRun();
      }
      return;
    }

    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;

      const newCode = code.substring(0, start) + '    ' + code.substring(end);
      onChange(newCode);

      // Reset cursor position
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  return (
    <div
      className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden shadow-2xl relative ${
        isFullscreen ? 'fixed inset-4 z-50' : 'h-full'
      }`}
    >
      {/* Editor Header Toolbar */}
      <div className="bg-zinc-900/90 px-4 py-2.5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-3">
          {/* Language Selector */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-zinc-400 font-mono">LANG:</span>
            <select
              value={language}
              onChange={(e) => onLanguageChange(e.target.value)}
              disabled={isLocked}
              className="bg-zinc-800 text-zinc-200 border border-zinc-700 rounded-lg px-2.5 py-1 text-xs font-mono font-semibold focus:outline-none focus:border-amber-500 cursor-pointer disabled:opacity-50"
            >
              <option value="python">Python 3 (3.10)</option>
              <option value="cpp">C++ (g++ 12 / C++17)</option>
              <option value="c">C (gcc 12 / C99)</option>
              <option value="java">Java (OpenJDK 17)</option>
            </select>
          </div>

          {/* Reset starter template */}
          <button
            onClick={onResetStarter}
            disabled={isLocked}
            title="Reset code to original starter template"
            className="flex items-center space-x-1 text-xs text-zinc-400 hover:text-amber-400 px-2 py-1 rounded hover:bg-zinc-800 transition disabled:opacity-40"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>

        {/* Right Tools: Font Size, Copy, Fullscreen */}
        <div className="flex items-center space-x-2">
          {/* Font size */}
          <div className="flex items-center space-x-1 bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/60">
            <button
              onClick={() => setFontSize(Math.max(12, fontSize - 1))}
              className="px-1.5 py-0.5 text-xs text-zinc-400 hover:text-white rounded"
              title="Decrease font size"
            >
              A-
            </button>
            <span className="text-[11px] text-zinc-300 font-mono px-1">{fontSize}px</span>
            <button
              onClick={() => setFontSize(Math.min(18, fontSize + 1))}
              className="px-1.5 py-0.5 text-xs text-zinc-400 hover:text-white rounded"
              title="Increase font size"
            >
              A+
            </button>
          </div>

          {/* Copy code */}
          <button
            onClick={handleCopy}
            title="Copy code to clipboard"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {/* Fullscreen toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            title="Toggle fullscreen"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded hover:bg-zinc-800 transition"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Editor Body with Line Numbers */}
      <div className="relative flex-1 flex overflow-hidden bg-[#0d1117]">
        {/* Line Numbers Gutter */}
        <div
          className="select-none py-3 px-2 text-right text-zinc-600 bg-zinc-950/60 border-r border-zinc-800/60 font-mono text-xs w-12 flex-shrink-0"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
        >
          {Array.from({ length: lineCount }).map((_, i) => (
            <div key={i} className="leading-relaxed">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={code}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLocked}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          className="flex-1 w-full h-full p-3 bg-transparent text-zinc-100 font-mono resize-none focus:outline-none leading-relaxed disabled:opacity-40 disabled:cursor-not-allowed selection:bg-amber-500/30"
          style={{ fontSize: `${fontSize}px`, lineHeight: '1.6' }}
          placeholder="Write your solution or fix the bug here..."
        />

        {/* TIME OVER / LOCKED OVERLAY */}
        {isLocked && (
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-[2px] flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-red-950/80 border border-red-500/40 flex items-center justify-center mb-3 shadow-lg shadow-red-950/50">
              <Lock className="w-7 h-7 text-red-400 animate-bounce" />
            </div>
            <h3 className="text-lg font-bold text-red-200 uppercase tracking-wide">
              Time Over - Program Locked
            </h3>
            <p className="text-sm text-zinc-400 max-w-md mt-1 mb-4">
              The time allotted by Administrator <strong className="text-amber-400">BLACKDRAGON</strong> has expired.
              As per tournament rules, previous programs cannot be modified or submitted.
            </p>
            <div className="px-4 py-2 bg-red-950/50 border border-red-800/60 rounded-lg text-xs text-red-300 font-mono">
              STATUS: PREVIOUS PROGRAM EXPIRED & LOCKED
            </div>
          </div>
        )}
      </div>

      {/* Editor Status Footer */}
      <div className="bg-zinc-900/90 px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-400 font-mono flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <span>{lines.length} lines</span>
          <span>{code.length} chars</span>
          <span className="hidden sm:inline text-zinc-500">
            Shortcuts: <kbd className="px-1 bg-zinc-800 rounded">Ctrl+Enter</kbd> Run,{' '}
            <kbd className="px-1 bg-zinc-800 rounded">Ctrl+Shift+Enter</kbd> Submit
          </span>
        </div>
        {isLocked ? (
          <span className="text-red-400 font-bold flex items-center space-x-1">
            <Lock className="w-3 h-3" />
            <span>LOCKED</span>
          </span>
        ) : (
          <span className="text-emerald-400 flex items-center space-x-1 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>READY TO COMPILE</span>
          </span>
        )}
      </div>
    </div>
  );
};
