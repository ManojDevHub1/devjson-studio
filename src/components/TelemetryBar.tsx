import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  Compass, 
  AlertTriangle, 
  Loader2, 
  RotateCcw, 
  RotateCw, 
  Database 
} from 'lucide-react';
import type { PayloadFormat, DiagnosticDetail } from '../utils/jsonRepairEngine';
import type { JsonMetrics } from '../utils/jsonMetrics';

interface TelemetryBarProps {
  format: PayloadFormat;
  diagnostic: DiagnosticDetail | null;
  metrics: JsonMetrics;
  isSavedToIdb: boolean;
  canUndo: boolean;
  onUndo: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  onErrorClick?: () => void;
  onOpenCommandPalette: () => void;
  unsafe64Count?: number;
  isProcessing?: boolean;
  currentPath?: string;
  onCopyPath?: (path: string) => void;
}

export const TelemetryBar: React.FC<TelemetryBarProps> = ({
  format,
  diagnostic,
  metrics,
  isSavedToIdb,
  canUndo,
  onUndo,
  canRedo = false,
  onRedo,
  onErrorClick,
  onOpenCommandPalette,
  unsafe64Count = 0,
  isProcessing = false,
  currentPath = 'root',
  onCopyPath,
}) => {
  const [copiedBreadcrumb, setCopiedBreadcrumb] = useState(false);

  // Format breadcrumb path: root.data.users[0].id -> root › data › users[0] › id
  const formattedBreadcrumb = (currentPath || 'root')
    .replace(/^\$\.?/, '')
    .replace(/\.([a-zA-Z0-9_$]+)/g, ' › $1')
    .replace(/\[(\d+)\]/g, ' › [$1]');

  const handleCopyBreadcrumb = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const normalized = currentPath.startsWith('$') ? currentPath : `$.${currentPath.replace(/^root\.?/, '')}`;
      await navigator.clipboard.writeText(normalized);
      if (onCopyPath) onCopyPath(normalized);
      setCopiedBreadcrumb(true);
      setTimeout(() => setCopiedBreadcrumb(false), 1600);
    } catch {
      // Fallback
    }
  };

  return (
    <footer className="h-6 px-3 bg-[#0C0D0F] border-t border-[#20242A] text-[11px] font-mono text-zinc-400 flex items-center justify-between select-none shrink-0 z-20 gap-2">
      {/* Left: Validation Status & Interactive Breadcrumb HUD */}
      <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
        {format === 'valid_json' && (
          <div className="flex items-center gap-1.5 text-zinc-300 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-emerald-400 font-medium">Valid JSON</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-300 tabular-nums">{metrics.formattedSize}</span>
          </div>
        )}

        {format === 'repairable_js_object' && (
          <div className="flex items-center gap-1.5 text-amber-400 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="font-medium">Repairable Syntax</span>
            <span className="text-zinc-700">·</span>
            <span className="text-zinc-300 tabular-nums">{metrics.formattedSize}</span>
          </div>
        )}

        {format === 'syntax_error' && (
          <button
            onClick={onErrorClick}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors text-left cursor-pointer shrink-0"
            title="Click to jump directly to error line"
            aria-label={`Jump to syntax error at line ${diagnostic?.line || 1}`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span className="font-medium underline underline-offset-2 decoration-rose-700">
              Error: Line {diagnostic?.line || 1}, Col {diagnostic?.column || 1}
            </span>
          </button>
        )}

        {format === 'empty' && (
          <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-600" />
            <span>Ready</span>
          </div>
        )}

        {/* ACTIVE JSONPATH BREADCRUMB HUD */}
        <span className="text-[#20242A] hidden sm:inline shrink-0">|</span>
        <div className="hidden sm:flex items-center gap-1.5 text-zinc-400 font-mono text-[11px] min-w-0 truncate">
          <Compass className="w-3 h-3 text-zinc-500 shrink-0" />
          <span 
            className="truncate text-zinc-300 hover:text-white cursor-pointer transition-colors"
            onClick={handleCopyBreadcrumb}
            title="Click to copy JSONPath"
          >
            {formattedBreadcrumb}
          </span>
          <button
            onClick={handleCopyBreadcrumb}
            className="p-0.5 rounded hover:bg-[#1E2228] text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            title="Copy JSONPath to clipboard"
            aria-label="Copy JSONPath"
          >
            {copiedBreadcrumb ? (
              <Check className="w-2.5 h-2.5 text-emerald-400" />
            ) : (
              <Copy className="w-2.5 h-2.5" />
            )}
          </button>
        </div>

        {/* 64-Bit Integer Warning Pill */}
        {unsafe64Count > 0 && (
          <>
            <span className="text-[#20242A] hidden md:inline shrink-0">|</span>
            <span 
              className="hidden md:inline-flex items-center gap-1 text-amber-300 bg-[#261B0E] border border-amber-800/50 px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0"
              title="64-bit integer exceeds Number.MAX_SAFE_INTEGER. Safe precision preservation active."
            >
              <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
              <span>{unsafe64Count} 64-bit Ints</span>
            </span>
          </>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <span className="flex items-center gap-1 text-sky-400 animate-pulse text-[10px] shrink-0">
            <Loader2 className="w-2.5 h-2.5 animate-spin" />
            <span>Processing...</span>
          </span>
        )}
      </div>

      {/* Right: Tactile Keyboard Controls & IndexedDB Sentinel */}
      <div className="flex items-center space-x-2 text-zinc-500 shrink-0">
        {canUndo && (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 text-sky-300 hover:text-sky-200 transition-colors cursor-pointer"
            title="Undo last mutation (⌘Z)"
            aria-label="Undo last mutation"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span className="hidden lg:inline text-[10px]">Undo</span>
            <kbd>⌘Z</kbd>
          </button>
        )}

        {canRedo && onRedo && (
          <button
            onClick={onRedo}
            className="flex items-center gap-1 text-zinc-300 hover:text-zinc-100 transition-colors cursor-pointer"
            title="Redo undone mutation (⌘Y)"
            aria-label="Redo undone mutation"
          >
            <RotateCw className="w-2.5 h-2.5" />
            <span className="hidden lg:inline text-[10px]">Redo</span>
            <kbd>⌘Y</kbd>
          </button>
        )}

        <span className="text-[#20242A] hidden sm:inline">•</span>

        <span className="hidden md:inline-flex items-center gap-1 text-zinc-400">
          <Database className={`w-2.5 h-2.5 ${isSavedToIdb ? 'text-emerald-400' : 'text-zinc-500'}`} />
          <span>{isSavedToIdb ? 'Local Synced' : 'Offline Ready'}</span>
        </span>

        <span className="text-[#20242A] hidden md:inline">•</span>

        <button
          onClick={onOpenCommandPalette}
          className="hover:text-zinc-300 transition-colors flex items-center gap-1"
          title="Command Palette (⌘K)"
          aria-label="Open Command Palette"
        >
          <kbd>⌘K</kbd>
        </button>
      </div>
    </footer>
  );
};
