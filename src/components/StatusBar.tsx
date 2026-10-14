import React from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  HardDrive
} from 'lucide-react';
import type { JsonMetrics } from '../utils/jsonMetrics';
import type { JsonErrorDetail } from '../utils/jsonRepair';

interface StatusBarProps {
  isValid: boolean;
  error: JsonErrorDetail | null;
  metrics: JsonMetrics;
  isAutoSaved: boolean;
  lastSavedAt: number | null;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  isValid,
  error,
  metrics,
  isAutoSaved,
}) => {
  return (
    <footer className="h-7 border-t border-[#1F2937] bg-[#111827] px-3 flex items-center justify-between text-xs font-mono text-slate-400 select-none shrink-0 z-10">
      {/* Left: Validation Status */}
      <div className="flex items-center space-x-2 truncate min-w-0">
        {isValid ? (
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Valid JSON</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-rose-400 font-medium truncate">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">
              Syntax Error {error ? `(Ln ${error.line}, Col ${error.column})` : ''}
            </span>
          </div>
        )}
      </div>

      {/* Center: Realtime Metrics */}
      <div className="hidden md:flex items-center space-x-4 text-[11px] text-slate-300">
        <div className="flex items-center gap-1" title="Payload Size in memory">
          <span className="text-slate-400">Size:</span>
          <span className="text-cyan-400 font-semibold">{metrics.formattedSize}</span>
        </div>

        <span className="text-slate-700">•</span>

        <div className="flex items-center gap-1" title="Total Keys Count">
          <span className="text-slate-400">Keys:</span>
          <span className="text-slate-200">{metrics.totalKeys}</span>
        </div>

        <span className="text-slate-700">•</span>

        <div className="flex items-center gap-1" title="Max Object/Array Nesting Depth">
          <span className="text-slate-400">Max Depth:</span>
          <span className="text-indigo-300">{metrics.maxDepth}</span>
        </div>

        <span className="text-slate-700">•</span>

        <div className="hidden lg:flex items-center gap-1" title="Arrays Count">
          <span className="text-slate-400">Arrays:</span>
          <span className="text-slate-200">{metrics.arraysCount}</span>
        </div>

        <span className="text-slate-700 hidden lg:inline">•</span>

        <div className="flex items-center gap-1" title="Total Lines">
          <span className="text-slate-400">Lines:</span>
          <span className="text-slate-200">{metrics.linesCount}</span>
        </div>
      </div>

      {/* Right: Storage & Offline Status */}
      <div className="flex items-center space-x-3 text-[11px] shrink-0">
        <div className="flex items-center gap-1.5 text-slate-400">
          <HardDrive className="w-3 h-3 text-emerald-400" />
          {isAutoSaved ? (
            <span className="text-emerald-400/90 flex items-center gap-1">
              Auto-saved to IndexedDB
            </span>
          ) : (
            <span className="text-slate-400">IndexedDB Ready</span>
          )}
        </div>
      </div>
    </footer>
  );
};
