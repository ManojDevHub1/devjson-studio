import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Network, 
  FileCode, 
  ShieldAlert, 
  Search, 
  Send, 
  Copy, 
  Check, 
  Settings2,
  Sliders,
  Download,
  Package
} from 'lucide-react';
import { TreeExplorer } from './TreeExplorer';
import { executeJsonQuery, type QueryResult } from '../utils/queryEngine';
import type { MockEngineType, HttpMethod } from '../utils/mockGenerator';
import type { TypeGeneratorOptions } from '../utils/typeGenerator';
import type { ZodGeneratorOptions } from '../utils/zodGenerator';

export type OutputEngineTab = 'tree' | 'ts' | 'zod' | 'query' | 'mock';

interface MultiEngineInspectorProps {
  activeTab: OutputEngineTab;
  onTabChange: (tab: OutputEngineTab) => void;
  parsedData: unknown;
  rawJson: string;
  tsCode: string;
  zodCode: string;
  mockCode: string;
  tsOptions: TypeGeneratorOptions;
  onUpdateTsOptions: (updater: (prev: TypeGeneratorOptions) => TypeGeneratorOptions) => void;
  zodOptions: ZodGeneratorOptions;
  onUpdateZodOptions: (updater: (prev: ZodGeneratorOptions) => ZodGeneratorOptions) => void;
  mockEngine: MockEngineType;
  onSetMockEngine: (engine: MockEngineType) => void;
  mockMethod: HttpMethod;
  onSetMockMethod: (method: HttpMethod) => void;
  mockEndpoint: string;
  onSetMockEndpoint: (url: string) => void;
  mockAuthHeader: boolean;
  onSetMockAuthHeader: (include: boolean) => void;
  mockTryCatch: boolean;
  onSetMockTryCatch: (include: boolean) => void;
  onDownload: (filename: string, content: string) => void;
  onUpdateTreeValue?: (path: string, newVal: string) => void;
  onSelectNode?: (path: string, keyName: string) => void;
  onToast?: (msg: string) => void;
  hasCurlExtracted?: boolean;
}

export const MultiEngineInspector: React.FC<MultiEngineInspectorProps> = ({
  activeTab,
  onTabChange,
  parsedData,
  rawJson,
  tsCode,
  zodCode,
  mockCode,
  tsOptions,
  onUpdateTsOptions,
  zodOptions,
  onUpdateZodOptions,
  mockEngine,
  onSetMockEngine,
  mockMethod,
  onSetMockMethod,
  mockEndpoint,
  onSetMockEndpoint,
  mockAuthHeader,
  onSetMockAuthHeader,
  mockTryCatch,
  onSetMockTryCatch,
  onDownload,
  onUpdateTreeValue,
  onSelectNode,
  onToast,
  hasCurlExtracted = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // JSONPath Query state
  const [queryString, setQueryString] = useState('$.organization.members[*].name');
  const queryResult: QueryResult = useMemo(() => {
    return executeJsonQuery(parsedData, queryString);
  }, [parsedData, queryString]);

  // Close settings popover on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setIsSettingsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getCodeContentForTab = (tab: OutputEngineTab) => {
    if (tab === 'ts') return tsCode;
    if (tab === 'zod') return zodCode;
    if (tab === 'mock') return mockCode;
    if (tab === 'query') return JSON.stringify(queryResult.data, null, 2);
    return rawJson;
  };

  const handleCopy = async () => {
    try {
      const content = getCodeContentForTab(activeTab);
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback
    }
  };

  const handleCopyAllBundle = async () => {
    try {
      const bundle = [
        '// ==========================================',
        '// 1. TypeScript AST Definitions',
        '// ==========================================',
        tsCode,
        '',
        '// ==========================================',
        '// 2. Zod Runtime Validation Schemas',
        '// ==========================================',
        zodCode,
        '',
        '// ==========================================',
        '// 3. API Client & Service Boilerplate',
        '// ==========================================',
        mockCode,
      ].join('\n');

      await navigator.clipboard.writeText(bundle);
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
      if (onToast) onToast('Copied full API bundle (TS + Zod + Client)');
    } catch {
      // Fallback
    }
  };

  // Syntax highlighter
  const renderHighlightedCode = (code: string) => {
    let escaped = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    escaped = escaped.replace(/(\/\/[^\n]*)/g, '<span class="text-zinc-500 italic">$1</span>');
    escaped = escaped.replace(/(&#39;[^&#39;]*&#39;|&quot;[^&quot;]*&quot;|`[^`]*`|'[^']*'|"[^"]*")/g, '<span class="text-emerald-400">$1</span>');

    const keywords = ['import', 'export', 'interface', 'type', 'const', 'async', 'await', 'function', 'return', 'try', 'catch', 'throw', 'new', 'if', 'else', 'from', 'default', 'readonly'];
    escaped = escaped.replace(new RegExp(`\\b(${keywords.join('|')})\\b`, 'g'), '<span class="text-indigo-400 font-semibold">$1</span>');

    const zodMethods = ['z\\.object', 'z\\.array', 'z\\.string', 'z\\.number', 'z\\.boolean', 'z\\.null', 'z\\.undefined', 'z\\.union', 'z\\.infer', 'z\\.record', 'z\\.unknown', 'z\\.optional', 'z\\.nullable', 'z\\.email', 'z\\.url', 'z\\.datetime', 'z\\.uuid', 'z\\.strict'];
    escaped = escaped.replace(new RegExp(`(${zodMethods.join('|')})`, 'g'), '<span class="text-amber-400 font-medium">$1</span>');

    const types = ['string', 'number', 'boolean', 'Promise', 'Record', 'AxiosResponse', 'Response', 'HttpResponse', 'http'];
    escaped = escaped.replace(new RegExp(`\\b(${types.join('|')})\\b`, 'g'), '<span class="text-cyan-400 font-medium">$1</span>');

    return escaped;
  };

  const tabs: { id: OutputEngineTab; label: string; icon: React.ReactNode; badge?: boolean }[] = [
    { id: 'tree', label: 'Tree', icon: <Network className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'ts', label: 'TypeScript', icon: <FileCode className="w-3.5 h-3.5 text-sky-400" /> },
    { id: 'zod', label: 'Zod Schema', icon: <ShieldAlert className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'mock', label: 'HTTP Client', icon: <Send className="w-3.5 h-3.5 text-cyan-400" />, badge: hasCurlExtracted },
    { id: 'query', label: 'JSONPath', icon: <Search className="w-3.5 h-3.5 text-zinc-400" /> },
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0C0D0F] overflow-hidden select-none">
      {/* Slim Pane Header (h-9 px-3 bg-[#121417] border-b border-[#20242A]) */}
      <div className="h-9 px-3 bg-[#121417] border-b border-[#20242A] flex items-center justify-between text-xs shrink-0">
        {/* Left: IDE File Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[#1C2026] text-white font-semibold shadow-sm border border-[#2E343D]'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#16191E]'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse ml-0.5" title="cURL extracted client code ready" />
              )}
            </button>
          ))}
        </div>

        {/* Right Controls: Root Name Input, Generator Settings Popover & Copy */}
        <div className="flex items-center space-x-1.5 shrink-0">
          {/* Inline Root Name Input Pill (Visible on TS & Zod tabs) */}
          {(activeTab === 'ts' || activeTab === 'zod') && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#0C0D0F] border border-[#20242A] text-[11px] font-mono shrink-0">
              <span className="text-[10px] text-zinc-500 select-none">Root:</span>
              <input
                type="text"
                value={tsOptions.rootName || 'ApiResponse'}
                onChange={(e) => {
                  const val = e.target.value;
                  onUpdateTsOptions(p => ({ ...p, rootName: val }));
                  onUpdateZodOptions(p => ({ ...p, rootName: val }));
                }}
                placeholder="ApiResponse"
                className="bg-transparent text-sky-300 w-24 outline-none font-semibold text-[11px] selection:bg-sky-700"
                title="Rename root interface/schema"
              />
            </div>
          )}

          {/* ⚙️ Popover for Generator Flags */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className={`p-1 px-1.5 rounded text-[11px] font-medium transition-colors border ${
                isSettingsOpen
                  ? 'bg-zinc-700 text-white border-zinc-600'
                  : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border-zinc-700/60'
              }`}
              title="Generator Settings (interface vs type, strict Zod, optional props, etc.)"
            >
              <Settings2 className="w-3.5 h-3.5 text-zinc-400" />
            </button>

            {isSettingsOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-72 bg-[#0F0F12] border border-zinc-800 rounded-xl shadow-2xl p-3 z-50 animate-command-palette text-xs font-sans">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800 text-[11px] font-semibold text-zinc-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-indigo-400" />
                    Generator Options
                  </span>
                  <span className="text-[10px] text-zinc-500 font-mono">AST Config</span>
                </div>

                {/* TypeScript Flags */}
                <div className="space-y-2 mb-3">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                    TypeScript
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Declaration:</span>
                    <div className="flex items-center rounded border border-zinc-800 bg-[#09090B] p-0.5 text-[10px]">
                      <button
                        onClick={() => onUpdateTsOptions(p => ({ ...p, exportKind: 'interface' }))}
                        className={`px-2 py-0.5 rounded transition-all ${
                          tsOptions.exportKind === 'interface' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400'
                        }`}
                      >
                        interface
                      </button>
                      <button
                        onClick={() => onUpdateTsOptions(p => ({ ...p, exportKind: 'type' }))}
                        className={`px-2 py-0.5 rounded transition-all ${
                          tsOptions.exportKind === 'type' ? 'bg-indigo-600 text-white font-medium' : 'text-zinc-400'
                        }`}
                      >
                        type
                      </button>
                    </div>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Export Keyword</span>
                    <input
                      type="checkbox"
                      checked={tsOptions.exportKeyword}
                      onChange={(e) => onUpdateTsOptions(p => ({ ...p, exportKeyword: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Readonly Properties</span>
                    <input
                      type="checkbox"
                      checked={tsOptions.readonlyProps}
                      onChange={(e) => onUpdateTsOptions(p => ({ ...p, readonlyProps: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>All Optional (?)</span>
                    <input
                      type="checkbox"
                      checked={tsOptions.allOptional}
                      onChange={(e) => onUpdateTsOptions(p => ({ ...p, allOptional: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>ISO Date & UUID Docs</span>
                    <input
                      type="checkbox"
                      checked={tsOptions.includeComments}
                      onChange={(e) => onUpdateTsOptions(p => ({ ...p, includeComments: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>
                </div>

                {/* Zod Flags */}
                <div className="space-y-2 mb-3 pt-2 border-t border-zinc-800/80">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                    Zod Schema
                  </span>
                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Strict Schema (.strict())</span>
                    <input
                      type="checkbox"
                      checked={zodOptions.isStrict}
                      onChange={(e) => onUpdateZodOptions(p => ({ ...p, isStrict: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Smart Patterns (.email, .url)</span>
                    <input
                      type="checkbox"
                      checked={zodOptions.inferPatterns}
                      onChange={(e) => onUpdateZodOptions(p => ({ ...p, inferPatterns: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Export Inferred Type (z.infer)</span>
                    <input
                      type="checkbox"
                      checked={zodOptions.exportInferredType}
                      onChange={(e) => onUpdateZodOptions(p => ({ ...p, exportInferredType: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>
                </div>

                {/* API Client Flags */}
                <div className="space-y-2 pt-2 border-t border-zinc-800/80">
                  <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider font-mono">
                    API Client Library
                  </span>
                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Client:</span>
                    <select
                      value={mockEngine}
                      onChange={(e) => onSetMockEngine(e.target.value as MockEngineType)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-200 outline-none"
                    >
                      <option value="fetch">Fetch API</option>
                      <option value="axios">Axios Client</option>
                      <option value="msw">MSW v2 Handler</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-zinc-300 text-[11px]">Method:</span>
                    <select
                      value={mockMethod}
                      onChange={(e) => onSetMockMethod(e.target.value as HttpMethod)}
                      className="bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[10px] text-zinc-200 outline-none"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Include Auth Header</span>
                    <input
                      type="checkbox"
                      checked={mockAuthHeader}
                      onChange={(e) => onSetMockAuthHeader(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>

                  <label className="flex items-center justify-between cursor-pointer text-[11px] text-zinc-300">
                    <span>Include Try/Catch Block</span>
                    <input
                      type="checkbox"
                      checked={mockTryCatch}
                      onChange={(e) => onSetMockTryCatch(e.target.checked)}
                      className="rounded border-zinc-700 bg-zinc-900 text-indigo-600"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Copy Button with Feedback */}
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-colors"
            title="Copy output to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-zinc-400" />
                <span>Copy</span>
              </>
            )}
          </button>

          {/* Copy All (TS + Zod + Client) Bundle Button */}
          <button
            onClick={handleCopyAllBundle}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium bg-[#1C2026] hover:bg-[#232830] text-sky-200 border border-[#2E343D] transition-colors shadow-sm"
            title="Copy All: Full typed module bundle (TypeScript + Zod + Client)"
          >
            {copiedAll ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Bundle Copied</span>
              </>
            ) : (
              <>
                <Package className="w-3 h-3 text-sky-400" />
                <span>Copy Bundle</span>
              </>
            )}
          </button>

          {/* Download Button */}
          <button
            onClick={() => {
              const filename = activeTab === 'ts' ? `${tsOptions.rootName || 'types'}.ts`
                : activeTab === 'zod' ? `${zodOptions.rootName || 'schema'}.zod.ts`
                : activeTab === 'mock' ? 'client.ts'
                : activeTab === 'query' ? 'query-result.json'
                : 'payload.json';
              onDownload(filename, getCodeContentForTab(activeTab));
            }}
            className="p-1 px-1.5 rounded text-[11px] font-medium bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 border border-zinc-700/60 transition-colors"
            title="Download file"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Pane Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Tree Explorer Tab */}
        {activeTab === 'tree' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <TreeExplorer
              data={parsedData}
              onUpdateValue={onUpdateTreeValue}
              onSelectNode={onSelectNode}
            />
          </div>
        )}

        {/* TypeScript Tab */}
        {activeTab === 'ts' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-zinc-100 select-text">
              <pre
                className="whitespace-pre"
                dangerouslySetInnerHTML={{ __html: renderHighlightedCode(tsCode) }}
              />
            </div>
          </div>
        )}

        {/* Zod Tab */}
        {activeTab === 'zod' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-zinc-100 select-text">
              <pre
                className="whitespace-pre"
                dangerouslySetInnerHTML={{ __html: renderHighlightedCode(zodCode) }}
              />
            </div>
          </div>
        )}

        {/* Client Tab */}
        {activeTab === 'mock' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Slim Header for Endpoint Bar */}
            <div className="h-8 px-3 bg-[#0E0E12] border-b border-zinc-800/60 flex items-center justify-between text-[11px] font-mono shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                <span className="px-1.5 py-0.2 rounded bg-indigo-950 text-indigo-300 font-bold border border-indigo-800">
                  {mockMethod}
                </span>
                <input
                  type="text"
                  value={mockEndpoint}
                  onChange={(e) => onSetMockEndpoint(e.target.value)}
                  className="bg-transparent text-zinc-200 outline-none flex-1 truncate"
                  placeholder="https://api.domain.com/v1/..."
                />
              </div>
              <span className="text-zinc-500 text-[10px] shrink-0 font-sans">
                {mockEngine.toUpperCase()} Boilerplate
              </span>
            </div>

            <div className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-zinc-100 select-text">
              <pre
                className="whitespace-pre"
                dangerouslySetInnerHTML={{ __html: renderHighlightedCode(mockCode) }}
              />
            </div>
          </div>
        )}

        {/* Query (JSONPath) Tab */}
        {activeTab === 'query' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Slim JSONPath Input Bar */}
            <div className="h-8 px-3 bg-[#0E0E12] border-b border-zinc-800/60 flex items-center gap-2 text-xs font-mono shrink-0">
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <input
                type="text"
                value={queryString}
                onChange={(e) => setQueryString(e.target.value)}
                placeholder="$.organization.members[*].name or $.status"
                className="bg-transparent text-white outline-none flex-1 font-mono text-xs"
              />
              <span className="text-[10px] text-zinc-500 shrink-0">
                {queryResult.matchCount} match{queryResult.matchCount !== 1 ? 'es' : ''} ({queryResult.executionTimeMs}ms)
              </span>
            </div>

            <div className="flex-1 overflow-auto p-3 font-mono text-[13px] leading-relaxed text-zinc-100 select-text">
              <pre className="whitespace-pre text-cyan-300">
                {JSON.stringify(queryResult.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
