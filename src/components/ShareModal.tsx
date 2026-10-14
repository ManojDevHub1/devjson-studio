import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  ShieldCheck
} from 'lucide-react';
import { type ShareResult, downloadFile } from '../utils/urlSharing';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareData: ShareResult;
  rawJson: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareData,
  rawJson,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownloadDevJson = () => {
    downloadFile(rawJson, 'snapshot.devjson', 'application/json');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 select-none">
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
      />

      <div className="relative bg-[#0F0F12] border border-zinc-800 rounded-xl shadow-2xl max-w-lg w-full p-5 text-zinc-100 z-10 animate-command-palette">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center text-indigo-400">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">Share Zero-DB Snapshot</h3>
              <p className="text-[11px] text-zinc-400 font-mono">Compressed into URL Hash (#state=...)</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Compression Metrics Banner */}
        <div className="my-4 grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-[#141418] border border-zinc-800 text-center text-xs">
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-mono">Raw</span>
            <span className="font-semibold text-zinc-200 font-mono">{shareData.originalLength.toLocaleString()} B</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-mono">Compressed</span>
            <span className="font-semibold text-indigo-400 font-mono">{shareData.compressedLength.toLocaleString()} B</span>
          </div>
          <div>
            <span className="text-[10px] text-zinc-500 block uppercase font-mono">Saved</span>
            <span className="font-semibold text-emerald-400 font-mono">-{shareData.compressionRatio}</span>
          </div>
        </div>

        {/* Warning if over 4,000 characters */}
        {shareData.isOverLimit ? (
          <div className="mb-4 p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-amber-300">
                Payload Exceeds 4,000 Characters ({shareData.charCount.toLocaleString()} chars)
              </span>
              <p className="text-zinc-300 mt-0.5 text-[11px] leading-relaxed">
                Some browsers and messaging platforms (Slack, Teams, Discord) truncate URLs longer than ~4,000 characters.
              </p>
              <div className="mt-2">
                <button
                  onClick={handleDownloadDevJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-semibold shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .devjson file instead</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-4 p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs flex items-center gap-2 text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Optimal URL length ({shareData.charCount} chars). Safe to share across all apps.</span>
          </div>
        )}

        {/* URL Box */}
        <div className="mb-4">
          <label className="text-[11px] text-zinc-400 font-medium block mb-1.5">
            Shareable URL Hash:
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-2 rounded bg-[#09090B] border border-zinc-800 font-mono text-xs text-zinc-300 truncate">
              {shareData.url}
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-all shrink-0 shadow-sm"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-zinc-800 text-xs">
          <button
            onClick={handleDownloadDevJson}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Export .devjson file</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
