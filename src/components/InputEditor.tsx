import React, { useRef, useState } from 'react';
import { 
  AlertTriangle, 
  Wand2, 
  Copy, 
  Check, 
  Code, 
  FileText
} from 'lucide-react';
import type { JsonErrorDetail } from '../utils/jsonRepair';

interface InputEditorProps {
  value: string;
  onChange: (val: string) => void;
  error: JsonErrorDetail | null;
  onAutoFix: () => void;
  onFileUpload: (file: File) => void;
}

export const InputEditor: React.FC<InputEditorProps> = ({
  value,
  onChange,
  error,
  onAutoFix,
  onFileUpload,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Compute line count
  const lines = value ? value.split('\n') : [''];
  const lineCount = lines.length;

  // Sync scroll between textarea and line number gutter
  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  // Track cursor position
  const updateCursorPosition = () => {
    if (!textareaRef.current) return;
    const pos = textareaRef.current.selectionStart || 0;
    const textBefore = value.slice(0, pos);
    const splitLines = textBefore.split('\n');
    setCursorPos({
      line: splitLines.length,
      col: splitLines[splitLines.length - 1].length + 1,
    });
  };

  // Support Tab key (2 spaces) and Auto-closing quotes/braces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = '  ';

      const newValue = value.substring(0, start) + spaces + value.substring(end);
      onChange(newValue);

      // Restore cursor position after state update
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

  const handleCopyInput = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  return (
    <div 
      className={`relative flex-1 flex flex-col h-full bg-[#090D16] border-r border-[#1F2937] overflow-hidden ${
        isDragOver ? 'ring-2 ring-indigo-500 bg-indigo-950/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Pane Header */}
      <div className="h-8 bg-[#111827] border-b border-[#1F2937] px-3 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center space-x-2">
          <Code className="w-3.5 h-3.5 text-indigo-400" />
          <span className="font-semibold text-slate-200">Raw JSON Payload</span>
          <span className="text-[11px] text-slate-400 font-mono">
            ({lineCount} {lineCount === 1 ? 'line' : 'lines'})
          </span>
        </div>

        <div className="flex items-center space-x-3 text-[11px] text-slate-400">
          <span className="font-mono">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <button
            onClick={handleCopyInput}
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Copy raw JSON to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body: Line numbers + Textarea */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          className="editor-gutter w-12 py-3 bg-[#0c121e] border-r border-[#1a2333] text-right font-mono text-xs text-slate-400 select-none overflow-hidden shrink-0"
        >
          {lines.map((_, idx) => {
            const lineNum = idx + 1;
            const isErrorLine = error && error.line === lineNum;
            return (
              <div
                key={lineNum}
                className={`h-5 leading-5 px-2.5 transition-colors ${
                  isErrorLine
                    ? 'bg-rose-500/20 text-rose-400 font-bold border-r-2 border-rose-500'
                    : ''
                }`}
              >
                {lineNum}
              </div>
            );
          })}
        </div>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          onKeyUp={updateCursorPosition}
          onClick={updateCursorPosition}
          placeholder="Paste or type API response JSON here (or drag & drop a .json file)..."
          spellCheck={false}
          className="flex-1 h-full py-3 px-3.5 font-mono text-xs text-slate-100 bg-[#090D16] resize-none outline-none overflow-auto leading-5 whitespace-pre selection:bg-indigo-600/30 selection:text-indigo-200"
        />

        {/* Drag Overlay Notice */}
        {isDragOver && (
          <div className="absolute inset-0 bg-indigo-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 pointer-events-none z-30">
            <FileText className="w-12 h-12 text-indigo-400 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-white">Drop .json file here</p>
            <p className="text-xs text-indigo-300 mt-1">DevJSON Studio will instantly load and parse it locally</p>
          </div>
        )}
      </div>

      {/* Bottom Error Banner if JSON is invalid */}
      {error && (
        <div className="border-t border-rose-900/60 bg-[#160c14] p-3 text-xs shrink-0 shadow-lg">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5 min-w-0">
              <div className="p-1 rounded bg-rose-950 text-rose-400 border border-rose-800/60 shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-rose-300">
                    JSON Syntax Error
                  </span>
                  <span className="font-mono text-[11px] px-1.5 py-0.2 rounded bg-rose-950/80 text-rose-300 border border-rose-800/50">
                    Line {error.line}, Col {error.column}
                  </span>
                </div>
                <p className="text-slate-300 mt-0.5 text-xs truncate font-mono">
                  {error.message}
                </p>

                {/* Error Snippet if available */}
                {error.snippet && (
                  <pre className="mt-1.5 p-1.5 bg-[#0a0508] border border-rose-900/40 rounded text-[11px] font-mono text-rose-300 overflow-x-auto leading-4 max-h-16">
                    {error.snippet}
                  </pre>
                )}

                {error.fixSuggestion && (
                  <p className="text-[11px] text-amber-300/90 mt-1 flex items-center gap-1">
                    <span>💡 {error.fixSuggestion}</span>
                  </p>
                )}
              </div>
            </div>

            {/* 1-click Auto-Fix Button */}
            <button
              onClick={onAutoFix}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white shadow-md shadow-amber-500/20 transition-all focus:outline-none focus:ring-1 focus:ring-amber-300"
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Fix Error Now ✨</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
