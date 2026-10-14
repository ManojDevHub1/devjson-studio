import React, { useState, useMemo } from 'react';
import { 
  Copy, 
  Check, 
  Download, 
  FileCode, 
  Send, 
  ShieldAlert, 
  Globe
} from 'lucide-react';
import type { HttpLibrary, HttpMethod } from '../utils/apiFetchGen';

interface OutputViewerProps {
  activeTab: 'ts' | 'zod' | 'fetch';
  codeContent: string;
  onDownload: (filename: string, content: string) => void;
  // Fetch Code Tab Specific Props
  fetchOptions?: {
    library: HttpLibrary;
    method: HttpMethod;
    endpointUrl: string;
    includeAuthHeader: boolean;
    includeTryCatch: boolean;
  };
  onUpdateFetchOptions?: (updater: (prev: any) => any) => void;
}

export const OutputViewer: React.FC<OutputViewerProps> = ({
  activeTab,
  codeContent,
  onDownload,
  fetchOptions,
  onUpdateFetchOptions,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(codeContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getDownloadFilename = () => {
    if (activeTab === 'ts') return 'types.ts';
    if (activeTab === 'zod') return 'schema.zod.ts';
    if (activeTab === 'fetch') return fetchOptions?.library === 'axios' ? 'api-axios.ts' : 'api-fetch.ts';
    return 'output.ts';
  };

  const tabMeta = {
    ts: {
      badge: 'TypeScript 5.x',
      badgeColor: 'text-blue-400 bg-blue-950/60 border-blue-800/50',
      title: 'Auto-Generated TypeScript Interfaces',
      icon: <FileCode className="w-3.5 h-3.5 text-blue-400" />,
    },
    zod: {
      badge: 'Zod v3',
      badgeColor: 'text-amber-400 bg-amber-950/60 border-amber-800/50',
      title: 'Runtime Zod Validation Schema',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />,
    },
    fetch: {
      badge: fetchOptions?.library === 'axios' ? 'Axios Client' : 'Fetch API',
      badgeColor: 'text-indigo-400 bg-indigo-950/60 border-indigo-800/50',
      title: 'Ready-to-Use API Client Code',
      icon: <Send className="w-3.5 h-3.5 text-indigo-400" />,
    },
  }[activeTab];

  // Simple, fast syntax highlighter for TS / Zod code
  const highlightedHtml = useMemo(() => {
    if (!codeContent) return '';
    
    // Escape HTML first
    let escaped = codeContent
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Highlight comments
    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="text-slate-500 italic">$1</span>');

    // Highlight string literals
    escaped = escaped.replace(/(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;|`[^`]*`|'[^']*'|"[^"]*")/g, '<span class="text-emerald-400">$1</span>');

    // Highlight TS / JS keywords
    const keywords = ['import', 'export', 'interface', 'type', 'const', 'async', 'await', 'function', 'return', 'try', 'catch', 'throw', 'new', 'if', 'else', 'from', 'default'];
    const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g');
    escaped = escaped.replace(keywordRegex, '<span class="text-purple-400 font-semibold">$1</span>');

    // Highlight Zod primitives & types
    const zodTypes = ['z\\.object', 'z\\.array', 'z\\.string', 'z\\.number', 'z\\.boolean', 'z\\.null', 'z\\.undefined', 'z\\.union', 'z\\.infer', 'z\\.record', 'z\\.unknown', 'z\\.optional', 'z\\.nullable'];
    const zodRegex = new RegExp(`(${zodTypes.join('|')})`, 'g');
    escaped = escaped.replace(zodRegex, '<span class="text-amber-300 font-medium">$1</span>');

    // Highlight types (string, number, boolean, Promise, Record, unknown)
    const baseTypes = ['string', 'number', 'boolean', 'Promise', 'Record', 'AxiosResponse', 'Response', 'Error'];
    const baseTypesRegex = new RegExp(`\\b(${baseTypes.join('|')})\\b`, 'g');
    escaped = escaped.replace(baseTypesRegex, '<span class="text-cyan-400">$1</span>');

    return escaped;
  }, [codeContent]);

  const lines = codeContent ? codeContent.split('\n') : [''];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090D16] overflow-hidden">
      {/* Pane Header */}
      <div className="h-8 bg-[#111827] border-b border-[#1F2937] px-3 flex items-center justify-between text-xs text-slate-300 shrink-0">
        <div className="flex items-center space-x-2">
          {tabMeta.icon}
          <span className="font-semibold text-slate-200">{tabMeta.title}</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-mono ${tabMeta.badgeColor}`}>
            {tabMeta.badge}
          </span>
        </div>

        {/* Floating actions: Copy + Download */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F2937] hover:bg-[#283548] text-slate-200 border border-[#374151] transition-colors text-xs font-medium"
            title="Copy code to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-indigo-400" />
                <span>Copy Code</span>
              </>
            )}
          </button>

          <button
            onClick={() => onDownload(getDownloadFilename(), codeContent)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#1F2937] hover:bg-[#283548] text-slate-200 border border-[#374151] transition-colors text-xs font-medium"
            title={`Download ${getDownloadFilename()}`}
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Download</span>
            <span className="text-[10px] text-slate-400 font-mono">({getDownloadFilename()})</span>
          </button>
        </div>
      </div>

      {/* API Fetch Settings Bar (Active only when Tab 4 is active) */}
      {activeTab === 'fetch' && fetchOptions && onUpdateFetchOptions && (
        <div className="bg-[#0f172a] border-b border-[#1F2937] px-3 py-2 flex flex-wrap items-center gap-3 text-xs shrink-0">
          {/* Library selector: Fetch vs Axios */}
          <div className="flex items-center rounded border border-[#2D3748] bg-[#090D16] p-0.5">
            <button
              onClick={() => onUpdateFetchOptions(prev => ({ ...prev, library: 'fetch' }))}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                fetchOptions.library === 'fetch'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Native fetch()
            </button>
            <button
              onClick={() => onUpdateFetchOptions(prev => ({ ...prev, library: 'axios' }))}
              className={`px-2 py-0.5 rounded font-medium transition-all ${
                fetchOptions.library === 'axios'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Axios
            </button>
          </div>

          {/* HTTP Method */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Method:</span>
            <select
              value={fetchOptions.method}
              onChange={(e) => onUpdateFetchOptions(prev => ({ ...prev, method: e.target.value as HttpMethod }))}
              className="bg-[#090D16] border border-[#2D3748] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            >
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Endpoint URL */}
          <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
            <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={fetchOptions.endpointUrl}
              onChange={(e) => onUpdateFetchOptions(prev => ({ ...prev, endpointUrl: e.target.value }))}
              placeholder="https://api.example.com/v1/..."
              className="w-full bg-[#090D16] border border-[#2D3748] rounded px-2 py-1 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Checkboxes */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={fetchOptions.includeAuthHeader}
                onChange={(e) => onUpdateFetchOptions(prev => ({ ...prev, includeAuthHeader: e.target.checked }))}
                className="rounded border-[#2D3748] bg-[#090D16] text-indigo-600 focus:ring-0"
              />
              <span>Auth Header</span>
            </label>

            <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={fetchOptions.includeTryCatch}
                onChange={(e) => onUpdateFetchOptions(prev => ({ ...prev, includeTryCatch: e.target.checked }))}
                className="rounded border-[#2D3748] bg-[#090D16] text-indigo-600 focus:ring-0"
              />
              <span>try / catch</span>
            </label>
          </div>
        </div>
      )}

      {/* Code Viewer Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Line Numbers */}
        <div className="w-10 py-3 bg-[#0c121e] border-r border-[#1a2333] text-right font-mono text-xs text-slate-400 select-none overflow-hidden shrink-0">
          {lines.map((_, idx) => (
            <div key={idx + 1} className="h-5 leading-5 px-2">
              {idx + 1}
            </div>
          ))}
        </div>

        {/* Code Content */}
        <div className="flex-1 p-3 overflow-auto bg-[#090D16]">
          <pre
            className="font-mono text-xs text-slate-200 leading-5 whitespace-pre selection:bg-indigo-600/30 selection:text-indigo-200"
            dangerouslySetInnerHTML={{ __html: highlightedHtml }}
          />
        </div>
      </div>
    </div>
  );
};
