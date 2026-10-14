import React, { useState, useRef, useEffect } from 'react';
import { 
  Braces, 
  Command, 
  History, 
  Share2, 
  Zap,
  GitCompare,
  ShieldCheck,
  Plus,
  X,
  ChevronDown,
  Check,
  Edit2
} from 'lucide-react';
import type { WorkspaceTab } from '../utils/storage';

export type WorkspaceMode = 'studio' | 'diff';

interface GlobalHeaderProps {
  mode: WorkspaceMode;
  onSetMode: (mode: WorkspaceMode) => void;
  tabs: WorkspaceTab[];
  activeTabId: string;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onCloseTab: (id: string) => void;
  onRenameTab: (id: string, newName: string) => void;
  onOpenPrivacy: () => void;
  onOpenCommandPalette: () => void;
  onOpenHistory: () => void;
  onOpenShare: () => void;
  historyCount: number;
}

export const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  mode,
  onSetMode,
  tabs,
  activeTabId,
  onSelectTab,
  onAddTab,
  onCloseTab,
  onRenameTab,
  onOpenPrivacy,
  onOpenCommandPalette,
  onOpenHistory,
  onOpenShare,
  historyCount,
}) => {
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0];

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsWorkspaceOpen(false);
        setEditingTabId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartRename = (tab: WorkspaceTab, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTabId(tab.id);
    setEditingName(tab.name);
  };

  const handleSaveRename = (tabId: string) => {
    if (editingName.trim()) {
      onRenameTab(tabId, editingName.trim());
    }
    setEditingTabId(null);
  };

  return (
    <header className="h-11 px-3 border-b border-zinc-800/80 flex items-center justify-between bg-[#09090B] select-none z-30 shrink-0 gap-2">
      {/* Left: Brand + Workspace Dropdown + Workspace Mode Switcher */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Brand */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center shadow-md shadow-indigo-500/20 ring-1 ring-white/10">
            <Braces className="w-3.5 h-3.5 text-white stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm tracking-tight text-white hidden sm:inline">
              DevJSON
            </span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700/80 font-mono tracking-wide">
              v5.1
            </span>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block shrink-0" />

        {/* COMPACT WORKSPACE SWITCHER DROPDOWN PILL (v5.1 Linear-Style) */}
        {mode === 'studio' && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-[#141418] hover:bg-zinc-800 text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors"
              title="Switch scratchpad workspace (IndexedDB persisted)"
            >
              <span>🗂️</span>
              <span className="text-zinc-500 hidden sm:inline">Workspace:</span>
              <span className="text-indigo-300 font-semibold truncate max-w-[110px]">
                {activeTab ? activeTab.name : 'Payload 1'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {isWorkspaceOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-64 bg-[#0F0F14] border border-zinc-800 rounded-xl shadow-2xl p-2 z-50 animate-command-palette text-xs font-sans">
                <div className="flex items-center justify-between pb-1.5 mb-1 px-1.5 border-b border-zinc-800/80 text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                  <span>Workspaces ({tabs.length}/6)</span>
                  <span className="text-zinc-600">IndexedDB</span>
                </div>

                <div className="space-y-0.5 max-h-56 overflow-y-auto">
                  {tabs.map((tab) => {
                    const isActive = tab.id === activeTabId;
                    const isEditing = tab.id === editingTabId;

                    return (
                      <div
                        key={tab.id}
                        onClick={() => {
                          onSelectTab(tab.id);
                          setIsWorkspaceOpen(false);
                        }}
                        className={`group flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-indigo-950/70 text-indigo-200 font-medium border border-indigo-800/50'
                            : 'hover:bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-zinc-700 shrink-0" />
                          )}

                          {isEditing ? (
                            <input
                              type="text"
                              autoFocus
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={() => handleSaveRename(tab.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(tab.id);
                                if (e.key === 'Escape') setEditingTabId(null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="bg-zinc-900 border border-indigo-500 text-white font-mono text-xs px-1 py-0.2 rounded outline-none w-28"
                            />
                          ) : (
                            <span className="font-mono text-xs truncate">
                              {tab.name}
                            </span>
                          )}
                        </div>

                        {/* Action buttons on hover */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {!isEditing && (
                            <button
                              onClick={(e) => handleStartRename(tab, e)}
                              className="p-1 hover:bg-zinc-700 rounded text-zinc-400 hover:text-zinc-200"
                              title="Rename workspace"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                          )}

                          {tabs.length > 1 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onCloseTab(tab.id);
                              }}
                              className="p-1 hover:bg-rose-950 rounded text-zinc-400 hover:text-rose-400"
                              title="Delete workspace"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Create new scratchpad */}
                {tabs.length < 6 && (
                  <button
                    onClick={() => {
                      onAddTab();
                      setIsWorkspaceOpen(false);
                    }}
                    className="w-full mt-2 pt-1.5 border-t border-zinc-800 flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-950/40 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Scratchpad</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Center-Left Workspace Mode Switcher */}
        <div className="flex items-center p-0.5 rounded-lg bg-[#141418] border border-zinc-800/80 text-xs shrink-0">
          <button
            onClick={() => onSetMode('studio')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              mode === 'studio'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden md:inline">⚡ Studio</span>
            <span className="md:hidden">Studio</span>
          </button>
          <button
            onClick={() => onSetMode('diff')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-all ${
              mode === 'diff'
                ? 'bg-zinc-800 text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">⚖️ Semantic Diff</span>
            <span className="md:hidden">Diff</span>
          </button>
        </div>
      </div>

      {/* Center-Right: Interactive Trust Pill */}
      <div className="hidden lg:flex items-center shrink-0">
        <button
          onClick={onOpenPrivacy}
          className="group flex items-center gap-2 px-3 py-1 rounded-full bg-[#141418] hover:bg-zinc-800/90 border border-zinc-800/80 hover:border-emerald-700/60 text-xs text-zinc-300 transition-all shadow-inner"
          title="Click to view client-side architecture verification"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 group-hover:animate-ping" />
          <span className="font-medium text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Local-Only (0 Network)
          </span>
        </button>
      </div>

      {/* Right Controls: History, Share, ⌘K */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* History Drawer Trigger */}
        <button
          onClick={onOpenHistory}
          className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#141418] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          title="Open IndexedDB History Snapshots"
        >
          <History className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
              {historyCount}
            </span>
          )}
        </button>

        {/* Share Snapshot */}
        <button
          onClick={onOpenShare}
          className="flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm shadow-indigo-600/25 transition-all"
          title="Share compressed zero-DB URL snapshot"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-[#141418] hover:bg-zinc-800 text-zinc-300 border border-zinc-800 transition-colors"
          title="Open Command Palette (⌘K / Ctrl+K)"
        >
          <Command className="w-3.5 h-3.5 text-zinc-400" />
          <kbd className="px-1.5 py-0.2 text-[10px] font-mono text-zinc-400 bg-zinc-800/80 rounded border border-zinc-700">
            ⌘K
          </kbd>
        </button>
      </div>
    </header>
  );
};
