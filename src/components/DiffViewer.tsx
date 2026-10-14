import React, { useState, useMemo } from 'react';
import { 
  GitCompare, 
  PlusCircle, 
  MinusCircle, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  Copy, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { computeJsonDiff, type DiffReport, type DiffChangeType } from '../utils/diffEngine';

interface DiffViewerProps {
  v1Json: string;
  onUpdateV1?: (val: string) => void;
  onClose: () => void;
}

const SAMPLE_BREAKING_DIFF_V2 = {
  "status": 200, // Breaking type change: was string "success"
  "statusCode": "OK", // Added field
  "data": {
    "organization": {
      "id": "org_9921448",
      "name": "Acme Global Enterprise",
      // "slug" removed!
      "tier": "enterprise_plus", // Value modified
      "members": [
        {
          "id": 101, // Breaking type change: was string "usr_01"
          "name": "Sarah Connor",
          "role": "super_admin",
          "email": "sarah.c@acme.io"
        }
      ]
    }
  }
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ v1Json, onUpdateV1, onClose }) => {
  const [internalV1, setInternalV1] = useState(v1Json || '{\n  "status": "success",\n  "data": {\n    "id": "item_123",\n    "price": 49.99\n  }\n}');
  const [v2Json, setV2Json] = useState<string>(() => {
    try {
      const parsed = JSON.parse(v1Json);
      if (typeof parsed === 'object' && parsed !== null) {
        const cloned = JSON.parse(JSON.stringify(parsed));
        cloned.__v2_beta_feature = true;
        if (cloned.status) cloned.status = 200; // Breaking type change
        return JSON.stringify(cloned, null, 2);
      }
    } catch {
      // Fallback
    }
    return JSON.stringify(SAMPLE_BREAKING_DIFF_V2, null, 2);
  });

  const [activeFilter, setActiveFilter] = useState<'all' | DiffChangeType>('all');
  const [copied, setCopied] = useState(false);

  // Compute AST Diff
  const diffReport: DiffReport = useMemo(() => {
    let parsed1: unknown = null;
    let parsed2: unknown = null;
    try {
      parsed1 = JSON.parse(internalV1);
    } catch {
      parsed1 = null;
    }
    try {
      parsed2 = JSON.parse(v2Json);
    } catch {
      parsed2 = null;
    }

    return computeJsonDiff(parsed1, parsed2);
  }, [internalV1, v2Json]);

  const filteredEntries = useMemo(() => {
    if (activeFilter === 'all') return diffReport.entries;
    return diffReport.entries.filter(e => e.type === activeFilter);
  }, [diffReport.entries, activeFilter]);

  const handleLoadSampleBreakingDiff = () => {
    const v1Baseline = {
      status: "success",
      organization: {
        id: "org_9921448",
        name: "Acme Global Enterprise",
        slug: "acme-global",
        tier: "enterprise",
        members: [
          {
            id: "usr_01",
            name: "Sarah Connor",
            role: "owner",
            email: "sarah.c@acme.io"
          }
        ]
      }
    };
    const v2Updated = {
      status: 200, // BREAKING: string -> number
      organization: {
        id: "org_9921448",
        name: "Acme Global Enterprise",
        // slug removed -> BREAKING
        tier: "enterprise_v2", // MODIFIED
        members: [
          {
            id: 101, // BREAKING: string -> number
            name: "Sarah Connor",
            role: "super_admin", // MODIFIED
            email: "sarah.c@acme.io",
            verified: true // ADDED
          }
        ]
      },
      apiVersion: "2026-10-01" // ADDED
    };

    const str1 = JSON.stringify(v1Baseline, null, 2);
    const str2 = JSON.stringify(v2Updated, null, 2);
    setInternalV1(str1);
    if (onUpdateV1) onUpdateV1(str1);
    setV2Json(str2);
  };

  const handleCopyReport = async () => {
    try {
      const summaryLines = [
        `# API Schema & Structural Diff Report`,
        `Generated: ${new Date().toISOString()}`,
        `Breaking Type Changes: ${diffReport.stats.typeChanges}`,
        `Removed Fields: ${diffReport.stats.removed}`,
        `Added Fields: ${diffReport.stats.added}`,
        `Modified Values: ${diffReport.stats.modified}`,
        ``,
        `## Detailed Changes:`,
        ...diffReport.entries.map(e => `- [${e.type.toUpperCase()}] ${e.path}: ${e.description}`)
      ];
      await navigator.clipboard.writeText(summaryLines.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D0F] overflow-hidden select-none">
      {/* Top Diff Header (h-10) */}
      <div className="h-10 px-4 bg-[#121417] border-b border-[#20242A] flex items-center justify-between text-xs shrink-0">
        <div className="flex items-center space-x-3">
          <div className="flex items-center gap-2">
            <GitCompare className="w-4 h-4 text-emerald-400" />
            <span className="font-semibold text-white tracking-tight">
              Schema & Structural Diff (Payload A vs Payload B)
            </span>
          </div>

          {diffReport.hasBreakingChanges && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-[#2A1015] text-rose-300 border border-rose-800/50 font-mono">
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              {diffReport.stats.typeChanges} BREAKING TYPE CHANGES
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {/* Load Sample Breaking Diff */}
          <button
            onClick={handleLoadSampleBreakingDiff}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C2026] hover:bg-[#232830] text-zinc-200 border border-[#2C323B] transition-colors text-xs font-medium"
            title="Load sample API response breaking change scenario"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Load Breaking Scenario</span>
          </button>

          {/* Copy Report */}
          <button
            onClick={handleCopyReport}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1C2026] hover:bg-[#232830] text-zinc-200 border border-[#2C323B] transition-colors text-xs font-medium"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied Diff</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-zinc-400" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          {/* Exit / Close */}
          <button
            onClick={onClose}
            className="flex items-center gap-1 px-3 py-1 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white transition-colors text-xs font-medium shadow-sm"
          >
            <span>Back to Studio</span>
          </button>
        </div>
      </div>

      {/* TOP HALF: Side-by-side editors for Payload A and Payload B (50% height) */}
      <div className="h-[48%] flex border-b border-[#20242A] overflow-hidden">
        {/* Left: Payload A (Baseline v1) */}
        <div className="w-1/2 border-r border-[#20242A] flex flex-col bg-[#0C0D0F]">
          <div className="h-8 px-3 bg-[#121417] border-b border-[#20242A] text-[11px] font-semibold text-zinc-300 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              PAYLOAD A (Baseline)
            </span>
            <span className="font-mono text-zinc-500 text-[10px]">
              {new Blob([internalV1]).size} B
            </span>
          </div>
          <textarea
            value={internalV1}
            onChange={(e) => {
              setInternalV1(e.target.value);
              if (onUpdateV1) onUpdateV1(e.target.value);
            }}
            placeholder="Paste baseline API v1 JSON here..."
            className="flex-1 p-3 bg-transparent text-zinc-300 font-mono text-[12px] leading-5 resize-none outline-none overflow-auto select-text selection:bg-indigo-600/30"
            spellCheck={false}
          />
        </div>

        {/* Right: Payload B (Updated v2) */}
        <div className="w-1/2 flex flex-col bg-[#09090B]">
          <div className="h-8 px-3 bg-[#111114] border-b border-zinc-800/80 text-[11px] font-semibold text-indigo-400 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              PAYLOAD B (Updated v2)
            </span>
            <span className="font-mono text-zinc-500 text-[10px]">
              {new Blob([v2Json]).size} B
            </span>
          </div>
          <textarea
            value={v2Json}
            onChange={(e) => setV2Json(e.target.value)}
            placeholder="Paste or edit updated API v2 JSON here..."
            className="flex-1 p-3 bg-transparent text-zinc-100 font-mono text-[12px] leading-5 resize-none outline-none overflow-auto select-text selection:bg-indigo-600/30"
            spellCheck={false}
          />
        </div>
      </div>

      {/* BOTTOM HALF: Structured Breaking Change & Delta Inspector (52% height) */}
      <div className="flex-1 flex flex-col bg-[#0C0C0E] overflow-hidden">
        {/* Category Filter Tabs Header */}
        <div className="h-9 px-4 bg-[#111114] border-b border-zinc-800/80 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center space-x-2 font-mono text-[11px]">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-2.5 py-1 rounded transition-colors ${
                activeFilter === 'all'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              All Differences ({diffReport.stats.total})
            </button>

            <button
              onClick={() => setActiveFilter('type_change')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                activeFilter === 'type_change'
                  ? 'bg-[#2A1015] text-rose-300 font-semibold border border-rose-800/60'
                  : 'text-rose-400/80 hover:text-rose-300'
              }`}
            >
              <AlertTriangle className="w-3 h-3 text-rose-400" />
              <span>Breaking Types</span>
              <span className="font-mono text-[10px]">({diffReport.stats.typeChanges})</span>
            </button>

            <button
              onClick={() => setActiveFilter('removed')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                activeFilter === 'removed'
                  ? 'bg-[#261B0E] text-amber-300 font-semibold border border-amber-800/60'
                  : 'text-amber-400/80 hover:text-amber-300'
              }`}
            >
              <MinusCircle className="w-3 h-3 text-amber-400" />
              <span>Removed</span>
              <span className="font-mono text-[10px]">({diffReport.stats.removed})</span>
            </button>

            <button
              onClick={() => setActiveFilter('added')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                activeFilter === 'added'
                  ? 'bg-[#0E2018] text-emerald-300 font-semibold border border-emerald-800/60'
                  : 'text-emerald-400/80 hover:text-emerald-300'
              }`}
            >
              <PlusCircle className="w-3 h-3 text-emerald-400" />
              <span>Added</span>
              <span className="font-mono text-[10px]">({diffReport.stats.added})</span>
            </button>

            <button
              onClick={() => setActiveFilter('modified')}
              className={`px-2.5 py-1 rounded flex items-center gap-1.5 transition-colors ${
                activeFilter === 'modified'
                  ? 'bg-[#12222E] text-sky-300 font-semibold border border-sky-800/60'
                  : 'text-sky-400/80 hover:text-sky-300'
              }`}
            >
              <RefreshCw className="w-3 h-3 text-sky-400" />
              <span>Modified</span>
              <span className="font-mono text-[10px]">({diffReport.stats.modified})</span>
            </button>
          </div>

          <span className="text-[11px] text-zinc-500 font-mono">
            {filteredEntries.length} changes detected
          </span>
        </div>

        {/* Change Feed List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text font-mono text-xs">
          {filteredEntries.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 text-zinc-500">
              <Check className="w-8 h-8 text-emerald-500 mb-2" />
              <p className="text-sm font-semibold text-zinc-300">No Differences Found</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                Payload A and Payload B match perfectly under this filter.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry, idx) => {
              const badgeInfo = {
                type_change: {
                  badge: 'BREAKING: TYPE CHANGE',
                  className: 'bg-rose-950/80 text-rose-300 border-rose-800/70 ring-1 ring-rose-500/30',
                  icon: <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />,
                },
                removed: {
                  badge: 'REMOVED FIELD',
                  className: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
                  icon: <MinusCircle className="w-4 h-4 text-amber-400 shrink-0" />,
                },
                added: {
                  badge: 'ADDED FIELD',
                  className: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60',
                  icon: <PlusCircle className="w-4 h-4 text-emerald-400 shrink-0" />,
                },
                modified: {
                  badge: 'VALUE MODIFIED',
                  className: 'bg-cyan-950/80 text-cyan-400 border-cyan-800/60',
                  icon: <RefreshCw className="w-4 h-4 text-cyan-400 shrink-0" />,
                },
              }[entry.type];

              return (
                <div
                  key={idx}
                  className="p-3 rounded-lg bg-[#141418] border border-zinc-800/90 flex flex-col gap-2 hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {badgeInfo.icon}
                      <span className="font-bold text-zinc-100 text-[13px]">{entry.path}</span>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono font-semibold ${badgeInfo.className}`}>
                      {badgeInfo.badge}
                    </span>
                  </div>

                  <div className="pl-6 text-[12px]">
                    {entry.type === 'type_change' && (
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-700 text-zinc-400 font-mono">
                          {entry.oldType}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-rose-400" />
                        <span className="px-2 py-0.5 rounded bg-rose-950 border border-rose-800 text-rose-300 font-mono font-bold">
                          {entry.newType}
                        </span>
                        <span className="text-zinc-500 text-[11px] ml-2">
                          (Old value: {JSON.stringify(entry.oldValue)} → New value: {JSON.stringify(entry.newValue)})
                        </span>
                      </div>
                    )}

                    {entry.type === 'removed' && (
                      <div className="text-amber-400">
                        <span className="text-zinc-500">Deleted value: </span>
                        <span className="line-through">{JSON.stringify(entry.oldValue)}</span>
                      </div>
                    )}

                    {entry.type === 'added' && (
                      <div className="text-emerald-400">
                        <span className="text-zinc-500">New value: </span>
                        <span>{JSON.stringify(entry.newValue)}</span>
                      </div>
                    )}

                    {entry.type === 'modified' && (
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-500 line-through">{JSON.stringify(entry.oldValue)}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-300 font-bold">{JSON.stringify(entry.newValue)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
