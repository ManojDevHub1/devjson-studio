import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';
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
    <footer className="h-6 px-3 bg-[#09090B] border-t border-zinc-800/80 text-[11px] font-mono text-zinc-400 flex items-center justify-between select-none shrink-0 z-20 gap-2">
      {/* Left: Status Dot & Merged JSONPath Breadcrumb Bar */}
      <div className="flex items-center space-x-2 min-w-0 flex-1 overflow-hidden">
        {format === 'valid_json' && (
          <div className="flex items-center gap-1.5 text-zinc-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
            <span className="text-emerald-400 font-medium">Valid JSON</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300">{metrics.formattedSize}</span>
          </div>
        )}

        {format === 'repairable_js_object' && (
          <div className="flex items-center gap-1.5 text-amber-400 shrink-0">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
            <span className="font-medium">Repairable JS Object</span>
            <span className="text-zinc-600">·</span>
            <span className="text-zinc-300">{metrics.formattedSize}</span>
          </div>
        )}

        {format === 'syntax_error' && (
          <button
            onClick={onErrorClick}
            className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors text-left cursor-pointer shrink-0"
            title="Click to jump directly to error in editor"
          >
            <span className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-400/50" />
            <span className="font-semibold underline underline-offset-2 decoration-rose-700">
              Error at Line {diagnostic?.line || 1}, Col {diagnostic?.column || 1}
            </span>
          </button>
        )}

        {format === 'empty' && (
          <div className="flex items-center gap-1.5 text-zinc-500 shrink-0">
            <span className="w-2 h-2 rounded-full bg-zinc-600" />
            <span>Ready for input</span>
          </div>
        )}

        {/* MERGED ACTIVE JSONPATH BREADCRUMB (v5.1 Zero-Chrome) */}
        <span className="text-zinc-800 hidden sm:inline shrink-0">|</span>
        <div className="hidden sm:flex items-center gap-1 text-zinc-400 font-mono text-[11px] min-w-0 truncate">
          <span className="text-zinc-600">📍</span>
          <span 
            className="truncate text-zinc-300 hover:text-white cursor-pointer transition-colors"
            onClick={handleCopyBreadcrumb}
            title="Click to copy full JSONPath"
          >
            {formattedBreadcrumb}
          </span>
          <button
            onClick={handleCopyBreadcrumb}
            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 ml-0.5"
            title="Copy JSONPath"
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
            <span className="text-zinc-800 hidden md:inline shrink-0">|</span>
            <span 
              className="hidden md:inline-flex items-center gap-1 text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.2 rounded text-[10px] font-mono shrink-0"
              title="Raw integers exceed Number.MAX_SAFE_INTEGER. Safe BigInt preservation is active."
            >
              ⚠️ {unsafe64Count} BigInts
            </span>
          </>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <span className="flex items-center gap-1 text-indigo-400 animate-pulse text-[10px] shrink-0">
            ⚡ Parsing...
          </span>
        )}
      </div>

      {/* Right: ↩ Undo (Ctrl+Z) • ↪ Redo (Ctrl+Y) • 💾 IndexedDB • ⌘K */}
      <div className="flex items-center space-x-2 text-zinc-500 shrink-0">
        {canUndo ? (
          <button
            onClick={onUndo}
            className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
            title="Undo last mutation (⌘Z / Ctrl+Z)"
          >
            <span>↩ Undo (Ctrl+Z)</span>
          </button>
        ) : (
          <span className="hidden md:inline">Ctrl+Z</span>
        )}

        {canRedo && onRedo && (
          <>
            <span className="text-zinc-800">•</span>
            <button
              onClick={onRedo}
              className="flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors cursor-pointer"
              title="Redo undone mutation (⌘Y / Ctrl+Y)"
            >
              <span>↪ Redo (Ctrl+Y)</span>
            </button>
          </>
        )}

        <span className="text-zinc-800">•</span>

        <span className="hidden md:inline text-zinc-400">
          💾 {isSavedToIdb ? 'IndexedDB Synced' : 'IndexedDB Ready'}
        </span>

        <span className="text-zinc-800 hidden md:inline">•</span>

        <button
          onClick={onOpenCommandPalette}
          className="hover:text-zinc-300 transition-colors flex items-center gap-1"
        >
          <span>⌘K</span>
        </button>
      </div>
    </footer>
  );
};
