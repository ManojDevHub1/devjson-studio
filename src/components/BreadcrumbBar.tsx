import React, { useState } from 'react';
import { Copy, Check, ChevronRight, Compass } from 'lucide-react';

interface BreadcrumbBarProps {
  currentPath: string;
  onCopyPath?: (path: string) => void;
}

export const BreadcrumbBar: React.FC<BreadcrumbBarProps> = ({ currentPath, onCopyPath }) => {
  const [copied, setCopied] = useState(false);

  // Normalize path segments: root.data.users[0].id -> ["root", "data", "users", "[0]", "id"]
  const rawSegments = currentPath
    ? currentPath
        .replace(/\[(\d+)\]/g, '.$1')
        .replace(/^\$\.?/, '')
        .split('.')
        .filter(Boolean)
    : [];

  const segments = rawSegments.length > 0 ? rawSegments : ['root'];

  const handleCopy = async () => {
    try {
      const pathToCopy = currentPath.startsWith('$') ? currentPath : `$.${currentPath.replace(/^root\.?/, '')}`;
      await navigator.clipboard.writeText(pathToCopy);
      if (onCopyPath) onCopyPath(pathToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="h-6 px-3 bg-[#0C0C0F] border-b border-zinc-800/60 text-[11px] font-mono text-zinc-400 flex items-center justify-between select-none shrink-0 z-10">
      {/* Breadcrumb segments */}
      <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar min-w-0 pr-2">
        <Compass className="w-3 h-3 text-indigo-400 shrink-0" />
        <span className="text-zinc-600">📍</span>

        {segments.map((seg, idx) => {
          const isLast = idx === segments.length - 1;
          const isIndex = /^\d+$/.test(seg);
          return (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-2.5 h-2.5 text-zinc-600 shrink-0" />}
              <span
                className={`truncate max-w-[140px] ${
                  isLast
                    ? 'text-zinc-200 font-semibold'
                    : isIndex
                    ? 'text-cyan-400 font-medium'
                    : 'text-zinc-400 hover:text-zinc-300'
                }`}
                title={seg}
              >
                {isIndex ? `[${seg}]` : seg}
              </span>
            </React.Fragment>
          );
        })}
      </div>

      {/* 1-Click Copy Path */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 transition-colors shrink-0"
        title="Copy active JSONPath expression"
      >
        {copied ? (
          <>
            <Check className="w-2.5 h-2.5 text-emerald-400" />
            <span className="text-emerald-400">Copied</span>
          </>
        ) : (
          <>
            <Copy className="w-2.5 h-2.5 text-zinc-500" />
            <span>Copy Path</span>
          </>
        )}
      </button>
    </div>
  );
};
