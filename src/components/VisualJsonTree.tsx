import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  X, 
  Copy, 
  Check, 
  Layers, 
  Maximize2, 
  Minimize2
} from 'lucide-react';

interface VisualJsonTreeProps {
  data: unknown;
  rawJson: string;
}

interface TreeNodeProps {
  name: string;
  value: unknown;
  path: string;
  depth: number;
  searchTerm: string;
  collapsedPaths: Set<string>;
  onToggleCollapse: (path: string) => void;
  onCopyPath: (path: string) => void;
  copiedPath: string | null;
}

export const VisualJsonTree: React.FC<VisualJsonTreeProps> = ({ data, rawJson }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const toggleCollapse = (path: string) => {
    setCollapsedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      setTimeout(() => setCopiedPath(null), 1500);
    } catch {
      // Fallback
    }
  };

  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  const collapseAll = () => {
    // Collect all object and array paths
    const paths = new Set<string>();
    function collect(node: unknown, currentPath: string) {
      if (typeof node === 'object' && node !== null) {
        paths.add(currentPath);
        if (Array.isArray(node)) {
          node.forEach((item, idx) => collect(item, `${currentPath}[${idx}]`));
        } else {
          Object.entries(node as Record<string, unknown>).forEach(([k, v]) => {
            const nextPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
              ? `${currentPath}.${k}`
              : `${currentPath}["${k}"]`;
            collect(v, nextPath);
          });
        }
      }
    }
    collect(data, 'root');
    setCollapsedPaths(paths);
  };

  const collapseToDepth = (maxDepth: number) => {
    const paths = new Set<string>();
    function collect(node: unknown, currentPath: string, currentDepth: number) {
      if (typeof node === 'object' && node !== null) {
        if (currentDepth >= maxDepth) {
          paths.add(currentPath);
        }
        if (Array.isArray(node)) {
          node.forEach((item, idx) => collect(item, `${currentPath}[${idx}]`, currentDepth + 1));
        } else {
          Object.entries(node as Record<string, unknown>).forEach(([k, v]) => {
            const nextPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k)
              ? `${currentPath}.${k}`
              : `${currentPath}["${k}"]`;
            collect(v, nextPath, currentDepth + 1);
          });
        }
      }
    }
    collect(data, 'root', 1);
    setCollapsedPaths(paths);
  };

  // Count search matches
  const matchCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    const lower = searchTerm.toLowerCase();
    let count = 0;
    function checkMatches(node: unknown) {
      if (node === null || node === undefined) return;
      if (typeof node === 'object') {
        if (Array.isArray(node)) {
          node.forEach(checkMatches);
        } else {
          Object.entries(node as Record<string, unknown>).forEach(([k, v]) => {
            if (k.toLowerCase().includes(lower)) count++;
            checkMatches(v);
          });
        }
      } else {
        if (String(node).toLowerCase().includes(lower)) count++;
      }
    }
    checkMatches(data);
    return count;
  }, [data, searchTerm]);

  if (data === null || data === undefined || (typeof data !== 'object' && !rawJson)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
        <Layers className="w-10 h-10 text-slate-600 mb-2" />
        <p className="text-sm font-medium text-slate-300">No Valid JSON to Display</p>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          Please input valid JSON in the left editor or click "Load Sample Data" to explore the interactive visual tree.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#090D16] overflow-hidden">
      {/* Tree Control Bar */}
      <div className="h-10 bg-[#111827] border-b border-[#1F2937] px-3 flex items-center justify-between text-xs gap-3 shrink-0">
        {/* Search input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keys and values..."
            className="w-full pl-8 pr-7 py-1 rounded bg-[#090D16] border border-[#2D3748] text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-indigo-500 font-mono"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Matches count badge */}
        {searchTerm && (
          <span className="text-[11px] px-2 py-0.5 rounded bg-indigo-950/70 text-indigo-300 border border-indigo-800/60 font-mono shrink-0">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        )}

        {/* Depth / Expand Controls */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1F2937] hover:bg-[#283548] text-slate-300 text-[11px] font-medium border border-[#374151] transition-colors"
            title="Expand All Nodes"
          >
            <Maximize2 className="w-3 h-3 text-emerald-400" />
            <span className="hidden sm:inline">Expand All</span>
          </button>

          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#1F2937] hover:bg-[#283548] text-slate-300 text-[11px] font-medium border border-[#374151] transition-colors"
            title="Collapse All Nodes"
          >
            <Minimize2 className="w-3 h-3 text-amber-400" />
            <span className="hidden sm:inline">Collapse</span>
          </button>

          <div className="hidden md:flex items-center border border-[#374151] rounded overflow-hidden text-[11px] bg-[#1F2937]">
            <span className="px-1.5 py-0.5 text-slate-400 border-r border-[#374151]">Depth</span>
            <button
              onClick={() => collapseToDepth(1)}
              className="px-1.5 py-0.5 hover:bg-[#283548] text-slate-300"
              title="Collapse beyond Level 1"
            >
              1
            </button>
            <button
              onClick={() => collapseToDepth(2)}
              className="px-1.5 py-0.5 hover:bg-[#283548] text-slate-300 border-l border-[#374151]"
              title="Collapse beyond Level 2"
            >
              2
            </button>
            <button
              onClick={() => collapseToDepth(3)}
              className="px-1.5 py-0.5 hover:bg-[#283548] text-slate-300 border-l border-[#374151]"
              title="Collapse beyond Level 3"
            >
              3
            </button>
          </div>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-xs select-text">
        <TreeNode
          name="root"
          value={data}
          path="root"
          depth={0}
          searchTerm={searchTerm.toLowerCase()}
          collapsedPaths={collapsedPaths}
          onToggleCollapse={toggleCollapse}
          onCopyPath={handleCopyPath}
          copiedPath={copiedPath}
        />
      </div>
    </div>
  );
};

const TreeNode: React.FC<TreeNodeProps> = ({
  name,
  value,
  path,
  depth,
  searchTerm,
  collapsedPaths,
  onToggleCollapse,
  onCopyPath,
  copiedPath,
}) => {
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isCollapsed = collapsedPaths.has(path);

  // Check if this node or key matches search
  const isKeyMatch = searchTerm && name.toLowerCase().includes(searchTerm);
  const isValueMatch =
    searchTerm &&
    !isObject &&
    String(value).toLowerCase().includes(searchTerm);

  const isCopied = copiedPath === path;

  // Render Primitive values
  if (!isObject) {
    let formattedVal = String(value);
    let colorClass = 'text-slate-300';

    if (value === null) {
      formattedVal = 'null';
      colorClass = 'text-rose-400 italic';
    } else if (typeof value === 'string') {
      formattedVal = JSON.stringify(value);
      colorClass = 'text-emerald-400';
    } else if (typeof value === 'number') {
      formattedVal = String(value);
      colorClass = 'text-cyan-400 font-semibold';
    } else if (typeof value === 'boolean') {
      formattedVal = String(value);
      colorClass = value ? 'text-amber-400 font-semibold' : 'text-purple-400 font-semibold';
    }

    return (
      <div className="group relative flex items-center h-6 hover:bg-[#111827]/80 rounded px-1 -mx-1 transition-colors">
        <span style={{ paddingLeft: `${depth * 18}px` }} />
        <span className="w-4 shrink-0 text-transparent select-none">•</span>

        {/* Key name */}
        <span className={`font-semibold mr-1.5 ${isKeyMatch ? 'bg-amber-500/30 text-amber-200 px-0.5 rounded' : 'text-indigo-300'}`}>
          {name}:
        </span>

        {/* Value */}
        <span className={`${colorClass} ${isValueMatch ? 'bg-amber-500/30 text-amber-200 px-0.5 rounded' : ''}`}>
          {formattedVal}
        </span>

        {/* Hover Action: Copy JSON Path */}
        <button
          onClick={() => onCopyPath(path)}
          className="opacity-0 group-hover:opacity-100 ml-2.5 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#1F2937] hover:bg-[#283548] text-slate-300 border border-[#374151] transition-opacity shrink-0"
          title={`Copy path: ${path}`}
        >
          {isCopied ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5 text-slate-400" />
              <span className="font-sans text-slate-400">Copy Path</span>
            </>
          )}
        </button>
      </div>
    );
  }

  // Render Array or Object node
  const entries = isArray
    ? (value as unknown[]).map((item, idx) => [String(idx), item] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);

  const itemsCount = entries.length;

  return (
    <div className="select-text">
      <div className="group relative flex items-center h-6 hover:bg-[#111827]/80 rounded px-1 -mx-1 transition-colors">
        <span style={{ paddingLeft: `${depth * 18}px` }} />

        {/* Toggle Collapse Caret */}
        <button
          onClick={() => onToggleCollapse(path)}
          className="w-4 h-4 flex items-center justify-center text-slate-400 hover:text-slate-200 mr-1 shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </button>

        {/* Node Key name */}
        <span 
          onClick={() => onToggleCollapse(path)}
          className={`font-semibold mr-1.5 cursor-pointer ${
            isKeyMatch ? 'bg-amber-500/30 text-amber-200 px-0.5 rounded' : 'text-indigo-300'
          }`}
        >
          {name}:
        </span>

        {/* Badge: Array or Object */}
        <span
          onClick={() => onToggleCollapse(path)}
          className="cursor-pointer text-[10px] px-1.5 py-0.2 rounded font-sans bg-[#162032] border border-[#2D3748] text-slate-400 hover:text-slate-200 mr-1"
        >
          {isArray ? `Array(${itemsCount})` : `{ ${itemsCount} keys }`}
        </span>

        {/* Copy Path Button */}
        <button
          onClick={() => onCopyPath(path)}
          className="opacity-0 group-hover:opacity-100 ml-2 flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-[#1F2937] hover:bg-[#283548] text-slate-300 border border-[#374151] transition-opacity shrink-0"
          title={`Copy path: ${path}`}
        >
          {isCopied ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-400 font-sans">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5 text-slate-400" />
              <span className="font-sans text-slate-400">Copy Path</span>
            </>
          )}
        </button>
      </div>

      {/* Children */}
      {!isCollapsed && (
        <div className="relative">
          {/* Subtle guide line */}
          <div
            className="absolute left-[7px] top-0 bottom-0 w-[1px] bg-[#1a2333]"
            style={{ left: `${depth * 18 + 7}px` }}
          />
          {entries.map(([childKey, childVal]) => {
            const childPath = isArray
              ? `${path}[${childKey}]`
              : /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(childKey)
              ? `${path}.${childKey}`
              : `${path}["${childKey}"]`;

            return (
              <TreeNode
                key={childKey}
                name={childKey}
                value={childVal}
                path={childPath}
                depth={depth + 1}
                searchTerm={searchTerm}
                collapsedPaths={collapsedPaths}
                onToggleCollapse={onToggleCollapse}
                onCopyPath={onCopyPath}
                copiedPath={copiedPath}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
