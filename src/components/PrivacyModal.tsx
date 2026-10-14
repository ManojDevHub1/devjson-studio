import React from 'react';
import { X, ShieldCheck, HardDrive, Cpu, Lock } from 'lucide-react';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none">
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
      />

      <div className="relative bg-[#0F0F12] border border-zinc-800 rounded-xl shadow-2xl max-w-md w-full p-6 text-zinc-100 z-10 animate-command-palette">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">100% Local Processing</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Zero Network Calls • Privacy By Design</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-3 text-xs text-zinc-300">
          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Client-Side AST Parsing</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                All JSON validation, TypeScript AST interface generation, and Zod compilation execute solely inside your browser’s V8 JavaScript engine.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Local IndexedDB Storage</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                History snapshots are persisted directly in your browser's local IndexedDB sandbox. No external servers or cloud databases are ever contacted.
              </p>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Zero-DB URL Compression</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                Sharing links use client-side LZ-String URL hash compression (`#state=...`). The server never sees the hash fragment.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-md text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
