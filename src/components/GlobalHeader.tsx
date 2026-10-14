import React, { useState, useRef, useEffect } from 'react';
import { 
  Braces, 
  Command, 
  History, 
  Share2, 
  Code2,
  GitCompare,
  ShieldCheck,
  Plus,
  X,
  ChevronDown,
  Check,
  Edit2,
  FolderGit2
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
    <header className="h-11 px-3 border-b border-[#20242A] flex items-center justify-between bg-[#0C0D0F] select-none z-30 shrink-0 gap-2">
      {/* Left: Brand + Workspace Switcher + Mode Switcher */}
      <div className="flex items-center space-x-3 min-w-0">
        {/* Brand Identity */}
        <div className="flex items-center space-x-2 shrink-0">
          <div className="w-6 h-6 rounded bg-[#161B22] border border-[#30363D] flex items-center justify-center text-sky-400 shadow-sm">
            <Braces className="w-3.5 h-3.5 stroke-[2.25]" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[13px] tracking-tight text-[#E6EDF3] hidden sm:inline">
              DevJSON
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-[#16191E] text-zinc-400 border border-[#2C323B]">
              Studio
            </span>
          </div>
        </div>

        {/* Hairline Divider */}
        <div className="h-4 w-[1px] bg-[#20242A] hidden sm:block shrink-0" />

        {/* WORKSPACE SWITCHER DROPDOWN */}
        {mode === 'studio' && (
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono font-medium bg-[#121417] hover:bg-[#181B1F] text-[#E6EDF3] border border-[#20242A] hover:border-[#2E343D] transition-colors"
              title="Switch scratchpad workspace (Stored locally in IndexedDB)"
              aria-expanded={isWorkspaceOpen}
              aria-haspopup="listbox"
            >
              <FolderGit2 className="w-3.5 h-3.5 text-zinc-400" />
              <span className="text-zinc-500 hidden sm:inline">Workspace:</span>
              <span className="text-sky-300 font-semibold truncate max-w-[120px]">
                {activeTab ? activeTab.name : 'Payload 1'}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {isWorkspaceOpen && (
              <div 
                className="absolute left-0 top-full mt-1.5 w-64 bg-[#121417] border border-[#2C323B] rounded-lg shadow-2xl p-2 z-50 animate-command-palette text-xs"
                role="listbox"
              >
                <div className="flex items-center justify-between pb-1.5 mb-1 px-1.5 border-b border-[#20242A] text-[10px] font-semibold text-zinc-400 uppercase tracking-wider font-mono">
                  <span>Workspaces ({tabs.length}/6)</span>
                  <span className="text-zinc-500">IndexedDB</span>
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
                        className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                          isActive
                            ? 'bg-[#182635] text-sky-200 font-medium border border-sky-800/40'
                            : 'hover:bg-[#181B1F] text-zinc-300'
                        }`}
                        role="option"
                        aria-selected={isActive}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />
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
                              className="bg-[#0C0D0F] border border-sky-500 text-white font-mono text-xs px-1 py-0.5 rounded outline-none w-28"
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
                              aria-label={`Rename workspace ${tab.name}`}
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
                              aria-label={`Delete workspace ${tab.name}`}
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
                    className="w-full mt-2 pt-1.5 border-t border-[#20242A] flex items-center justify-center gap-1.5 py-1 text-xs font-medium text-sky-400 hover:text-sky-300 hover:bg-[#161B22] rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Workspace</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Mode Switcher (Studio vs Semantic Diff) */}
        <div className="flex items-center p-0.5 rounded bg-[#121417] border border-[#20242A] text-xs shrink-0" role="tablist">
          <button
            onClick={() => onSetMode('studio')}
            role="tab"
            aria-selected={mode === 'studio'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-all ${
              mode === 'studio'
                ? 'bg-[#1C2026] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden md:inline">Studio</span>
            <span className="md:hidden">Studio</span>
          </button>
          <button
            onClick={() => onSetMode('diff')}
            role="tab"
            aria-selected={mode === 'diff'}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded font-medium transition-all ${
              mode === 'diff'
                ? 'bg-[#1C2026] text-white shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <GitCompare className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Semantic Diff</span>
            <span className="md:hidden">Diff</span>
          </button>
        </div>
      </div>

      {/* Center-Right: Interactive Trust Pill */}
      <div className="hidden lg:flex items-center shrink-0">
        <button
          onClick={onOpenPrivacy}
          className="group flex items-center gap-2 px-3 py-1 rounded bg-[#121417] hover:bg-[#181B1F] border border-[#20242A] hover:border-emerald-700/50 text-xs text-zinc-300 transition-all"
          title="Click to view local privacy architecture"
          aria-label="View security and privacy verification"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-medium text-emerald-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            100% Client-Side
          </span>
          <span className="text-[10px] text-zinc-500 font-mono hidden xl:inline">
            (Zero Outbound)
          </span>
        </button>
      </div>

      {/* Right Controls: History, Share, Command Palette */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* History Drawer Trigger */}
        <button
          onClick={onOpenHistory}
          className="relative flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#121417] hover:bg-[#181B1F] text-zinc-300 border border-[#20242A] transition-colors"
          title="Open IndexedDB History Snapshots"
          aria-label="Open History Snapshots"
        >
          <History className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline">History</span>
          {historyCount > 0 && (
            <span className="ml-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-[#1A2633] text-sky-300 border border-sky-800/40 font-mono">
              {historyCount}
            </span>
          )}
        </button>

        {/* Share Snapshot */}
        <button
          onClick={onOpenShare}
          className="flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium bg-[#0284C7] hover:bg-[#0369A1] text-white border border-[#38BDF8]/40 shadow-sm transition-all"
          title="Generate compressed URL state snapshot"
          aria-label="Share URL snapshot"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>Share</span>
        </button>

        {/* Command Palette Trigger */}
        <button
          onClick={onOpenCommandPalette}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium bg-[#121417] hover:bg-[#181B1F] text-zinc-300 border border-[#20242A] transition-colors"
          title="Open Command Palette (⌘K / Ctrl+K)"
          aria-label="Open Command Palette"
        >
          <Command className="w-3.5 h-3.5 text-zinc-400" />
          <kbd>⌘K</kbd>
        </button>
      </div>
    </header>
  );
};
