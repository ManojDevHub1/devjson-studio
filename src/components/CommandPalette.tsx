import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

export interface CommandItem {
  id: string;
  title: string;
  category: 'Actions' | 'Engines' | 'Presets' | 'Export' | 'Views';
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
}) => {
  const [search, setSearch] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setSearch('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const filtered = commands.filter((cmd) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return cmd.title.toLowerCase().includes(q) || cmd.category.toLowerCase().includes(q);
  });

  useEffect(() => {
    setSelectedIndex(0);
  }, [search]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
        onClose();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 p-4 select-none">
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
      />

      <div 
        onKeyDown={handleKeyDown}
        className="relative bg-[#0F0F12] border border-zinc-800 rounded-xl shadow-2xl max-w-xl w-full overflow-hidden z-10 animate-command-palette flex flex-col max-h-[500px]"
      >
        {/* Search Input */}
        <div className="h-12 border-b border-zinc-800 px-3.5 flex items-center gap-2.5 bg-[#141418]">
          <Search className="w-4 h-4 text-zinc-400" />
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type a command or search action (e.g. Format, Repair, TypeScript)..."
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder-zinc-500 outline-none font-sans"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800 rounded border border-zinc-700">
            ESC
          </kbd>
        </div>

        {/* Command List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-xs text-zinc-500">
              No matching commands found.
            </div>
          ) : (
            filtered.map((cmd, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.run();
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full px-3 py-2 rounded-lg flex items-center justify-between text-left transition-colors ${
                    isSelected ? 'bg-indigo-600/20 text-white border border-indigo-500/30' : 'text-zinc-300 hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className={`${isSelected ? 'text-indigo-400' : 'text-zinc-400'}`}>
                      {cmd.icon}
                    </span>
                    <span className="text-xs font-medium">{cmd.title}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">
                      {cmd.category}
                    </span>
                    {cmd.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-zinc-400 bg-zinc-800/80 rounded border border-zinc-700">
                        {cmd.shortcut}
                      </kbd>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer tips */}
        <div className="h-8 border-t border-zinc-800/80 px-3 flex items-center justify-between text-[11px] text-zinc-500 bg-[#0A0A0D]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="font-mono text-zinc-400">DevJSON Studio v2.0</span>
        </div>
      </div>
    </div>
  );
};
