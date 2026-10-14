import React, { useRef, useState, useEffect } from 'react';
import { 
  Code2, 
  AlignLeft, 
  ChevronDown, 
  MoreHorizontal, 
  RotateCcw, 
  Sparkles, 
  ShieldAlert, 
  X, 
  FileText, 
  ArrowUpDown, 
  Minimize2, 
  Download, 
  Trash2, 
  Layers,
  Wand2,
  CheckSquare,
  Square
} from 'lucide-react';
import type { PayloadFormat, DiagnosticDetail } from '../utils/jsonRepairEngine';
import type { UnwrapperCandidate } from '../utils/inputUnwrapper';
import type { SensitiveDetection } from '../utils/piiSanitizer';
import { PRESET_DATASETS, type PresetDataset } from '../data/sampleData';

interface SmartEditorProps {
  value: string;
  onChange: (val: string) => void;
  format: PayloadFormat;
  diagnostic: DiagnosticDetail | null;
  sensitiveKeysCount: number;
  sensitiveDetections?: SensitiveDetection[];
  unsafe64Count?: number;
  unwrapperCandidate?: UnwrapperCandidate | null;
  onApplyUnwrapper?: (candidate: UnwrapperCandidate) => void;
  canUndo: boolean;
  onUndo: () => void;
  onAutoRepair: () => void;
  onPrettify: () => void;
  onMinify: () => void;
  onSortKeys: () => void;
  onMaskSecrets: () => void;
  onApplySelectiveMask?: (paths: string[]) => void;
  onClear: () => void;
  onFileUpload: (file: File) => void;
  onLoadPreset: (preset: PresetDataset) => void;
  onDownload: () => void;
  targetScrollLine?: number | null;
}

export const SmartEditor: React.FC<SmartEditorProps> = ({
  value,
  onChange,
  format,
  diagnostic,
  sensitiveKeysCount,
  sensitiveDetections = [],
  unsafe64Count = 0,
  unwrapperCandidate = null,
  onApplyUnwrapper,
  canUndo,
  onUndo,
  onAutoRepair,
  onPrettify,
  onMinify,
  onSortKeys,
  onMaskSecrets,
  onApplySelectiveMask,
  onClear,
  onFileUpload,
  onLoadPreset,
  onDownload,
  targetScrollLine = null,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);
  const presetsRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);
  const maskPopoverRef = useRef<HTMLDivElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isMaskPopoverOpen, setIsMaskPopoverOpen] = useState(false);
  const [selectedMaskPaths, setSelectedMaskPaths] = useState<string[]>([]);
  const [isWarningDismissed, setIsWarningDismissed] = useState(false);
  const prevCountsRef = useRef({ secrets: sensitiveKeysCount, bigInts: unsafe64Count });
  const [highlightedLine, setHighlightedLine] = useState<number | null>(null);

  // Reset dismissal when counts change
  useEffect(() => {
    if (prevCountsRef.current.secrets !== sensitiveKeysCount || prevCountsRef.current.bigInts !== unsafe64Count) {
      setIsWarningDismissed(false);
      prevCountsRef.current = { secrets: sensitiveKeysCount, bigInts: unsafe64Count };
    }
  }, [sensitiveKeysCount, unsafe64Count]);

  // Initialize selected mask paths when detections change
  useEffect(() => {
    setSelectedMaskPaths(sensitiveDetections.map(d => d.path));
  }, [sensitiveDetections]);

  // Smooth line scrolling and pulse highlight
  useEffect(() => {
    if (targetScrollLine && textareaRef.current && gutterRef.current) {
      const lineH = 24; // leading-6 height is 24px
      const scrollPos = Math.max(0, (targetScrollLine - 3) * lineH);
      textareaRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
      gutterRef.current.scrollTo({ top: scrollPos, behavior: 'smooth' });
      setHighlightedLine(targetScrollLine);
      const timer = setTimeout(() => setHighlightedLine(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [targetScrollLine]);

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (presetsRef.current && !presetsRef.current.contains(e.target as Node)) {
        setIsPresetsOpen(false);
      }
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setIsMoreOpen(false);
      }
      if (maskPopoverRef.current && !maskPopoverRef.current.contains(e.target as Node)) {
        setIsMaskPopoverOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Global window paste listener when input is empty
  useEffect(() => {
    if (value && value.trim() !== '') return;
    const handleWindowPaste = (e: ClipboardEvent) => {
      const text = e.clipboardData?.getData('text');
      if (text) {
        onChange(text);
      }
    };
    window.addEventListener('paste', handleWindowPaste);
    return () => window.removeEventListener('paste', handleWindowPaste);
  }, [value, onChange]);

  const isEmpty = !value || value.trim() === '';
  const lines = value ? value.split('\n') : [''];

  const handleScroll = () => {
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

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

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + spaces.length;
      }, 0);
    }
  };

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

  const toggleSelectMaskPath = (path: string) => {
    setSelectedMaskPaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    );
  };

  // Format badge rendering
  const formatBadge = {
    valid_json: {
      label: 'Strict JSON',
      className: 'bg-[#0E2018] text-emerald-400 border-emerald-800/50',
      dotClass: 'bg-emerald-400',
    },
    repairable_js_object: {
      label: 'Repairable JS Object',
      className: 'bg-[#261B0E] text-amber-300 border-amber-800/50',
      dotClass: 'bg-amber-400',
    },
    syntax_error: {
      label: 'Invalid Syntax',
      className: 'bg-[#261014] text-rose-300 border-rose-800/50',
      dotClass: 'bg-rose-400',
    },
    empty: {
      label: 'Empty',
      className: 'bg-[#16191E] text-zinc-400 border-[#2C323B]',
      dotClass: 'bg-zinc-500',
    },
  }[format];

  // Warnings pill condition (valid or non-error JSON with secrets or unsafe 64-bit BigInts)
  const hasWarnings = (sensitiveKeysCount > 0 || unsafe64Count > 0);
  const showWarningsPill = hasWarnings && !isWarningDismissed;

  return (
    <div 
      className={`relative flex-1 flex flex-col h-full bg-[#0C0D0F] overflow-hidden select-none ${
        isDragOver ? 'ring-2 ring-sky-500 bg-sky-950/20' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Slim Pane Header (h-9 px-3 bg-[#121417] border-b border-[#20242A]) */}
      <div className="h-9 px-3 bg-[#121417] border-b border-[#20242A] flex items-center justify-between text-xs shrink-0">
        {/* Left: RAW INPUT + format badge */}
        <div className="flex items-center space-x-2">
          <Code2 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="font-semibold text-zinc-200 tracking-tight text-[11px]">INPUT</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono border ${formatBadge.className}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${formatBadge.dotClass}`} />
            <span>{formatBadge.label}</span>
          </div>
        </div>

        {/* Right (Minimal Controls — Hick's Law Compliant) */}
        <div className="flex items-center space-x-1">
          {/* Undo button */}
          {canUndo && (
            <button
              onClick={onUndo}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-[#1C2026] hover:bg-[#232830] text-sky-300 border border-[#2C323B] transition-colors"
              title="Undo last change (⌘Z / Ctrl+Z)"
            >
              <RotateCcw className="w-3 h-3 text-indigo-400" />
              <span>Undo</span>
            </button>
          )}

          {/* Format button */}
          <button
            onClick={onPrettify}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
            title="Prettify JSON with 2 spaces (Alt+Shift+F)"
          >
            <AlignLeft className="w-3 h-3 text-indigo-400" />
            <span>Format</span>
          </button>

          {/* Presets ▾ dropdown */}
          <div className="relative" ref={presetsRef}>
            <button
              onClick={() => setIsPresetsOpen(!isPresetsOpen)}
              className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
            >
              <Layers className="w-3 h-3 text-zinc-400" />
              <span>Presets</span>
              <ChevronDown className="w-2.5 h-2.5 text-zinc-500" />
            </button>

            {isPresetsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-64 bg-[#0F0F12] border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 animate-command-palette">
                <div className="px-3 py-1 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                  Sample Datasets
                </div>
                {PRESET_DATASETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      onLoadPreset(preset);
                      setIsPresetsOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800/80 transition-colors flex flex-col gap-0.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-zinc-200 group-hover:text-indigo-300">
                        {preset.name}
                      </span>
                      {preset.badge && (
                        <span className="text-[9px] px-1 rounded bg-zinc-800 text-zinc-400 font-mono">
                          {preset.badge}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-500 truncate">
                      {preset.description}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ⋯ More dropdown menu */}
          <div className="relative" ref={moreRef}>
            <button
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className="p-1 px-1.5 rounded text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
              title="More actions"
            >
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>

            {isMoreOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-48 bg-[#0F0F12] border border-zinc-800 rounded-xl shadow-2xl py-1 z-50 animate-command-palette text-xs">
                <button
                  onClick={() => {
                    onMinify();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2"
                >
                  <Minimize2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Minify Payload</span>
                </button>

                <button
                  onClick={() => {
                    onSortKeys();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2"
                >
                  <ArrowUpDown className="w-3.5 h-3.5 text-amber-400" />
                  <span>Sort Keys (A-Z)</span>
                </button>

                <button
                  onClick={() => {
                    onDownload();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-white flex items-center gap-2"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Download .json</span>
                </button>

                <div className="h-[1px] bg-zinc-800 my-1" />

                <button
                  onClick={() => {
                    onClear();
                    setIsMoreOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-rose-950/60 text-zinc-400 hover:text-rose-300 flex items-center gap-2"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear Canvas</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Editor Body or Zero-State Interactive Dropzone */}
      <div className="flex-1 flex overflow-hidden relative">
        {isEmpty ? (
          /* Zero-State Interactive Dropzone Card */
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none bg-[#09090B]">
            <div className="max-w-md w-full p-8 rounded-2xl bg-[#0F0F12] border border-zinc-800/80 shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-indigo-400" />
              </div>

              <h3 className="text-base font-semibold text-zinc-100 mb-1">
                Zero-Chrome Input Canvas
              </h3>
              <p className="text-xs text-zinc-400 mb-5 leading-relaxed">
                Paste raw API response, dirty JS objects, JWT tokens, cURL commands, or drop files directly.
              </p>

              {/* Keyboard shortcut badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141418] border border-zinc-800 text-xs text-zinc-300 font-mono mb-4 shadow-inner">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-white font-bold border border-zinc-700 text-[11px]">
                  ⌘V / Ctrl+V
                </kbd>
                <span>anywhere to paste JSON</span>
              </div>

              {/* Drag & Drop zone note */}
              <label className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer mb-6 underline underline-offset-4 decoration-zinc-700">
                <span>Or click to browse or drop a .json / .txt file here</span>
                <input
                  type="file"
                  accept=".json,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) onFileUpload(file);
                  }}
                />
              </label>

              {/* 3 Quick-Start Pills */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-zinc-800/70 w-full">
                <button
                  onClick={() => onLoadPreset(PRESET_DATASETS[0])}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141418] hover:bg-zinc-800 text-zinc-300 hover:text-indigo-300 border border-zinc-800 hover:border-indigo-500/40 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3 h-3 text-indigo-400" />
                  <span>Load Sample API</span>
                </button>

                <button
                  onClick={() => onLoadPreset(PRESET_DATASETS[1])}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141418] hover:bg-zinc-800 text-zinc-300 hover:text-amber-300 border border-zinc-800 hover:border-amber-500/40 transition-all flex items-center gap-1.5"
                >
                  <Wand2 className="w-3 h-3 text-amber-400" />
                  <span>Test Broken JSON</span>
                </button>

                <button
                  onClick={() => onLoadPreset(PRESET_DATASETS[2])}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-[#141418] hover:bg-zinc-800 text-zinc-300 hover:text-emerald-300 border border-zinc-800 hover:border-emerald-500/40 transition-all flex items-center gap-1.5"
                >
                  <Layers className="w-3 h-3 text-emerald-400" />
                  <span>Stripe Webhook</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Line Numbers Gutter */}
            <div
              ref={gutterRef}
              className="w-12 py-3 bg-[#0C0C0E] border-r border-zinc-800/70 text-right font-mono text-[13px] text-zinc-600 select-none overflow-hidden shrink-0"
            >
              {lines.map((_, idx) => {
                const lineNum = idx + 1;
                const isErrorLine = diagnostic && diagnostic.line === lineNum;
                const isCurrentLine = cursorPos.line === lineNum;
                const isHighlighted = highlightedLine === lineNum;

                return (
                  <div
                    key={lineNum}
                    className={`h-6 leading-6 px-2 transition-colors ${
                      isErrorLine
                        ? 'bg-rose-500/20 text-rose-400 font-bold border-r-2 border-rose-500'
                        : isHighlighted
                        ? 'bg-indigo-500/30 text-indigo-200 font-bold border-r-2 border-indigo-400 animate-pulse'
                        : isCurrentLine
                        ? 'text-zinc-300 font-medium'
                        : ''
                    }`}
                  >
                    {lineNum}
                  </div>
                );
              })}
            </div>

            {/* Main Textarea */}
            <textarea
              ref={textareaRef}
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onScroll={handleScroll}
              onKeyDown={handleKeyDown}
              onKeyUp={updateCursorPosition}
              onClick={updateCursorPosition}
              placeholder="Paste or edit JSON..."
              spellCheck={false}
              className="flex-1 h-full py-3 px-3.5 font-mono text-[13px] text-zinc-100 bg-[#09090B] resize-none outline-none overflow-auto leading-6 whitespace-pre select-text selection:bg-indigo-600/30 selection:text-indigo-200"
            />
          </>
        )}

        {/* Drag Overlay Notice */}
        {isDragOver && (
          <div className="absolute inset-0 bg-zinc-950/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 pointer-events-none z-30">
            <FileText className="w-12 h-12 text-indigo-400 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-white">Drop .json / .txt file here</p>
            <p className="text-xs text-zinc-400 mt-1">DevJSON Studio will process it 100% locally</p>
          </div>
        )}

        {/* Floating Contextual Action Dock - Strict Single Pill Priority Queue */}
        {!isEmpty && (unwrapperCandidate || (diagnostic && format !== 'valid_json') || showWarningsPill) && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 max-w-[92%] select-none">
            {/* Priority 1 (Highest Priority - Unwrap Needed): cURL, JWT, Escaped JSON, URL Query */}
            {unwrapperCandidate && onApplyUnwrapper ? (
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#12151A] border border-[#252B35] shadow-xl text-xs animate-command-palette">
                <Wand2 className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                <span className="text-zinc-200 text-[11px] font-mono">
                  {unwrapperCandidate.title}
                </span>
                <button
                  onClick={() => onApplyUnwrapper(unwrapperCandidate)}
                  className="ml-1 px-3 py-1 rounded-full bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium text-[11px] transition-colors shadow-sm"
                >
                  {unwrapperCandidate.actionLabel}
                </button>
              </div>
            ) : diagnostic && format !== 'valid_json' ? (
              /* Priority 2 (Medium): Syntax Error Auto-Repair */
              <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1A140E] border border-[#3A2814] shadow-xl text-xs animate-command-palette">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="text-zinc-200 text-[11px] font-mono">
                  Syntax error at Ln {diagnostic.line} ({diagnostic.message.slice(0, 36)}...)
                </span>
                <button
                  onClick={onAutoRepair}
                  className="ml-1 px-3 py-1 rounded-full bg-[#D97706] hover:bg-[#B45309] text-white font-medium text-[11px] transition-colors shadow-sm"
                >
                  Auto-Repair Syntax
                </button>
              </div>
            ) : showWarningsPill ? (
              /* Priority 3 (Low): Valid JSON Warnings (Secrets & Unsafe 64-Bit BigInts) */
              <div className="relative" ref={maskPopoverRef}>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#171A1E] border border-[#2C323B] shadow-xl text-xs animate-command-palette">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="text-zinc-200 text-[11px]">
                    {sensitiveKeysCount > 0 && unsafe64Count > 0 ? (
                      <>{sensitiveKeysCount} Sensitive Fields • {unsafe64Count} 64-bit Integers</>
                    ) : sensitiveKeysCount > 0 ? (
                      <>{sensitiveKeysCount} Sensitive Fields Detected</>
                    ) : (
                      <>{unsafe64Count} 64-bit Integers (&gt;15 digits)</>
                    )}
                  </span>

                  {sensitiveKeysCount > 0 && (
                    <>
                      {/* 1-Click Mask All */}
                      <button
                        onClick={onMaskSecrets}
                        className="ml-1 px-2.5 py-1 rounded-l-full bg-[#202630] hover:bg-[#28303C] text-zinc-100 font-medium text-[11px] border border-[#2E3744] transition-colors"
                        title="Redact all detected sensitive fields"
                      >
                        Redact All
                      </button>

                      {/* Caret for Selective Masking Popover */}
                      <button
                        onClick={() => setIsMaskPopoverOpen(!isMaskPopoverOpen)}
                        className="px-1.5 py-1 rounded-r-full bg-[#242A35] hover:bg-[#2D3442] text-zinc-300 text-[11px] border-y border-r border-[#2E3744]"
                        title="Selectively choose which secrets to redact"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </>
                  )}

                  {/* Dismiss warning pill */}
                  <button
                    onClick={() => setIsWarningDismissed(true)}
                    className="p-0.5 text-zinc-400 hover:text-zinc-200 rounded-full hover:bg-zinc-800 ml-0.5"
                    title="Dismiss warning"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Selective Secret Masking Checklist Popover */}
                {isMaskPopoverOpen && sensitiveDetections.length > 0 && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-80 bg-[#0F0F14] border border-zinc-800 rounded-xl shadow-2xl p-3 z-50 animate-command-palette text-xs font-sans">
                    <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-200">
                      <span>Select Secrets to Redact</span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {selectedMaskPaths.length}/{sensitiveDetections.length}
                      </span>
                    </div>

                    <div className="max-h-48 overflow-y-auto space-y-1 py-1">
                      {sensitiveDetections.map((item, idx) => {
                        const isChecked = selectedMaskPaths.includes(item.path);
                        return (
                          <div
                            key={idx}
                            onClick={() => toggleSelectMaskPath(item.path)}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-zinc-800/60 cursor-pointer"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {isChecked ? (
                                <CheckSquare className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              ) : (
                                <Square className="w-3.5 h-3.5 text-zinc-600 shrink-0" />
                              )}
                              <span className="font-mono text-amber-300 truncate text-[11px]">
                                {item.key}
                              </span>
                            </div>
                            <span className="text-[10px] text-zinc-500 shrink-0">
                              {item.category}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="pt-2 mt-2 border-t border-zinc-800 flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (selectedMaskPaths.length === sensitiveDetections.length) {
                            setSelectedMaskPaths([]);
                          } else {
                            setSelectedMaskPaths(sensitiveDetections.map(d => d.path));
                          }
                        }}
                        className="text-[10px] text-zinc-400 hover:text-zinc-200"
                      >
                        {selectedMaskPaths.length === sensitiveDetections.length ? 'Deselect All' : 'Select All'}
                      </button>

                      <button
                        onClick={() => {
                          if (onApplySelectiveMask) {
                            onApplySelectiveMask(selectedMaskPaths);
                          } else {
                            onMaskSecrets();
                          }
                          setIsMaskPopoverOpen(false);
                        }}
                        className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-[11px]"
                      >
                        Apply Mask ({selectedMaskPaths.length})
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
