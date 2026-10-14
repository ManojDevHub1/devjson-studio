import React, { useState } from 'react';
import { 
  X, 
  Trash2, 
  RotateCcw, 
  History, 
  Search, 
  Download, 
  Clock
} from 'lucide-react';
import type { JsonSession } from '../utils/storage';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: JsonSession[];
  onRestoreSession: (session: JsonSession) => void;
  onDeleteSession: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  onRestoreSession,
  onDeleteSession,
  onClearAll,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [showConfirmClear, setShowConfirmClear] = useState(false);

  if (!isOpen) return null;

  const filteredSessions = sessions.filter((s) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return s.title.toLowerCase().includes(q) || s.rawJson.toLowerCase().includes(q);
  });

  const formatRelativeTime = (timestamp: number): string => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Just now';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHrs = Math.floor(diffMin / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    return `${diffDays}d ago`;
  };

  const handleExportAll = () => {
    const exportData = JSON.stringify(sessions, null, 2);
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `devjson-history-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#121417] border-l border-[#20242A] flex flex-col shadow-2xl animate-command-palette">
          {/* Header */}
          <div className="h-12 border-b border-[#20242A] px-4 flex items-center justify-between shrink-0 bg-[#0C0D0F]">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded bg-[#161B22] border border-[#30363D] flex items-center justify-center text-sky-400">
                <History className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-xs font-semibold text-zinc-100 flex items-center gap-2">
                  Session Snapshots
                  <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-[#1C2026] text-zinc-300 border border-[#2C323B]">
                    {sessions.length}/15
                  </span>
                </h2>
                <p className="text-[10px] text-zinc-500 font-mono">100% Local in IndexedDB</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Close history drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-3 border-b border-[#20242A] bg-[#0C0D0F]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                placeholder="Search history by title or content..."
                className="w-full pl-8 pr-3 py-1.5 rounded bg-[#16191E] border border-[#20242A] text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-sky-500 font-sans"
              />
            </div>
          </div>

          {/* Sessions List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredSessions.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-center p-4 text-zinc-500">
                <Clock className="w-7 h-7 text-zinc-700 mb-2" />
                <p className="text-xs font-medium text-zinc-300">
                  {filterQuery ? 'No matching snapshots' : 'No saved sessions yet'}
                </p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs">
                  Your valid JSON edits are automatically snapshotted locally to IndexedDB as you work.
                </p>
              </div>
            ) : (
              filteredSessions.map((session, idx) => (
                <div
                  key={session.id}
                  className="p-3 rounded bg-[#16191E] border border-[#20242A] hover:border-[#2C323B] transition-all group flex flex-col gap-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-mono px-1 rounded bg-[#121417] text-zinc-400 border border-[#20242A]">
                          #{idx + 1}
                        </span>
                        <h3 className="text-xs font-semibold text-zinc-200 truncate group-hover:text-sky-300 font-sans">
                          {session.title}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-zinc-400 font-mono">
                        <span>{formatRelativeTime(session.timestamp)}</span>
                        <span>•</span>
                        <span className="text-emerald-400">{session.formattedSize}</span>
                        {session.keysCount > 0 && (
                          <>
                            <span>•</span>
                            <span>{session.keysCount} keys</span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => {
                          onRestoreSession(session);
                          onClose();
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-[#0284C7] hover:bg-[#0369A1] text-white text-[11px] font-medium transition-colors shadow-sm"
                        title="Restore this payload to editor"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>

                      <button
                        onClick={() => onDeleteSession(session.id)}
                        className="p-1 rounded text-zinc-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                        title="Delete snapshot"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-1.5 rounded bg-[#0C0D0F] border border-[#20242A] font-mono text-[11px] text-zinc-400 truncate">
                    {session.preview || session.rawJson}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 border-t border-[#20242A] bg-[#0C0D0F] flex items-center justify-between text-xs shrink-0">
            <button
              onClick={handleExportAll}
              disabled={sessions.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-[#16191E] hover:bg-[#1E2228] disabled:opacity-40 text-zinc-300 border border-[#20242A] transition-colors"
              title="Backup all history sessions to JSON file"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>Export All</span>
            </button>

            {showConfirmClear ? (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-rose-300">Clear all?</span>
                <button
                  onClick={() => {
                    onClearAll();
                    setShowConfirmClear(false);
                  }}
                  className="px-2 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowConfirmClear(false)}
                  className="px-1.5 py-1 rounded bg-zinc-800 text-zinc-300 text-[11px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowConfirmClear(true)}
                disabled={sessions.length === 0}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded text-rose-400 hover:bg-rose-950/50 hover:text-rose-300 disabled:opacity-40 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
