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

      <div className="relative bg-[#121417] border border-[#2C323B] rounded-lg shadow-2xl max-w-md w-full p-5 text-[#E6EDF3] z-10 animate-command-palette">
        <div className="flex items-center justify-between pb-3 border-b border-[#20242A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[#161B22] border border-[#30363D] flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">100% Client-Side Architecture</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Zero Network Requests • Complete Data Isolation</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-2.5 text-xs text-zinc-300">
          <div className="p-3 rounded bg-[#16191E] border border-[#20242A] flex items-start gap-3">
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Local V8 AST Processing</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                All JSON validation, TypeScript AST interface generation, and Zod compilation execute solely inside your browser. No data ever leaves your device.
              </p>
            </div>
          </div>

          <div className="p-3 rounded bg-[#16191E] border border-[#20242A] flex items-start gap-3">
            <HardDrive className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Browser-Sandboxed IndexedDB</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                Workspace scratchpads and history snapshots are stored directly in your browser's private IndexedDB origin storage. No remote database exists.
              </p>
            </div>
          </div>

          <div className="p-3 rounded bg-[#16191E] border border-[#20242A] flex items-start gap-3">
            <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-zinc-200">Client-Side URL Hash Encryption</span>
              <p className="text-zinc-400 text-[11px] mt-0.5 leading-relaxed">
                Shareable links compress state into the browser URL fragment (`#state=...`). URL fragments are never transmitted to web servers over HTTP.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-3 border-t border-[#20242A] flex justify-end">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded text-xs font-medium bg-[#1C2026] hover:bg-[#232830] text-zinc-200 border border-[#2C323B] transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
