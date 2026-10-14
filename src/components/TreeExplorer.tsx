import React, { useState, useMemo } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Search, 
  X, 
  Copy, 
  Check, 
  Maximize2, 
  Minimize2, 
  FileCode2, 
  Edit2
} from 'lucide-react';

interface TreeExplorerProps {
  data: unknown;
  rawJson?: string;
  onUpdateValue?: (path: string, newVal: string) => void;
  chunkLargeArrays?: boolean;
  onSelectNode?: (path: string, keyName: string) => void;
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
  onCopyValue: (val: unknown, nodePath: string) => void;
  copiedKey: string | null;
  onUpdateValue?: (path: string, newVal: string) => void;
  chunkLargeArrays: boolean;
  onSelectNode?: (path: string, keyName: string) => void;
}

export const TreeExplorer: React.FC<TreeExplorerProps> = ({ 
  data, 
  rawJson,
  onUpdateValue,
  chunkLargeArrays = true,
  onSelectNode,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(new Set());
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      setCopiedKey(`path_${path}`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Fallback
    }
  };

  const handleCopyValue = async (val: unknown, nodePath: string) => {
    try {
      const textToCopy = typeof val === 'object' && val !== null
        ? JSON.stringify(val, null, 2)
        : String(val);
      await navigator.clipboard.writeText(textToCopy);
      setCopiedKey(`val_${nodePath}`);
      setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      // Fallback
    }
  };

  const expandAll = () => {
    setCollapsedPaths(new Set());
  };

  const collapseAll = () => {
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

  const matchCount = useMemo(() => {
    if (!searchTerm.trim()) return 0;
    const lower = searchTerm.toLowerCase();
    let count = 0;
    function check(node: unknown) {
      if (node === null || node === undefined) return;
      if (typeof node === 'object') {
        if (Array.isArray(node)) {
          node.forEach(check);
        } else {
          Object.entries(node as Record<string, unknown>).forEach(([k, v]) => {
            if (k.toLowerCase().includes(lower)) count++;
            check(v);
          });
        }
      } else {
        if (String(node).toLowerCase().includes(lower)) count++;
      }
    }
    check(data);
    return count;
  }, [data, searchTerm]);

  if (data === null || data === undefined || (typeof data !== 'object' && !rawJson)) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
        <FileCode2 className="w-10 h-10 text-zinc-700 mb-2" />
        <p className="text-sm font-medium text-zinc-300">No Valid Payload to Render</p>
        <p className="text-xs text-zinc-500 mt-1 max-w-sm">
          Provide valid JSON or run Auto-Repair in the left pane to explore the interactive tree.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-[#09090B] overflow-hidden">
      {/* Search & Actions Bar */}
      <div className="h-9 bg-[#111115] border-b border-zinc-800/80 px-3 flex items-center justify-between text-xs gap-3 shrink-0 select-none">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search keys and values..."
            className="w-full pl-8 pr-6 py-1 rounded bg-[#09090B] border border-zinc-800 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-700 font-sans"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {searchTerm && (
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
            {matchCount} {matchCount === 1 ? 'match' : 'matches'}
          </span>
        )}

        <div className="flex items-center space-x-1.5 shrink-0">
          <span className="text-[11px] text-zinc-500 mr-1 hidden lg:inline">
            💡 Double-click value to edit
          </span>

          <button
            onClick={expandAll}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium border border-zinc-700/60 transition-colors"
            title="Expand All Nodes"
          >
            <Maximize2 className="w-3 h-3 text-emerald-400" />
            <span>Expand</span>
          </button>

          <button
            onClick={collapseAll}
            className="flex items-center gap-1 px-2 py-1 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-[11px] font-medium border border-zinc-700/60 transition-colors"
            title="Collapse All Nodes"
          >
            <Minimize2 className="w-3 h-3 text-amber-400" />
            <span>Collapse</span>
          </button>
        </div>
      </div>

      {/* Tree Content */}
      <div className="flex-1 overflow-auto p-4 font-mono text-[13px] select-text">
        <TreeNode
          name="root"
          value={data}
          path="root"
          depth={0}
          searchTerm={searchTerm.toLowerCase()}
          collapsedPaths={collapsedPaths}
          onToggleCollapse={toggleCollapse}
          onCopyPath={handleCopyPath}
          onCopyValue={handleCopyValue}
          copiedKey={copiedKey}
          onUpdateValue={onUpdateValue}
          chunkLargeArrays={chunkLargeArrays}
          onSelectNode={onSelectNode}
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
  onCopyValue,
  copiedKey,
  onUpdateValue,
  chunkLargeArrays,
  onSelectNode,
}) => {
  const isObject = value !== null && typeof value === 'object';
  const isArray = Array.isArray(value);
  const isCollapsed = collapsedPaths.has(path);

  // Inline value editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editInput, setEditInput] = useState('');

  const isKeyMatch = searchTerm && name.toLowerCase().includes(searchTerm);
  const isValueMatch =
    searchTerm &&
    !isObject &&
    String(value).toLowerCase().includes(searchTerm);

  const isPathCopied = copiedKey === `path_${path}`;
  const isValCopied = copiedKey === `val_${path}`;

  const startEditing = () => {
    if (isObject || !onUpdateValue) return;
    setEditInput(value === null ? 'null' : String(value));
    setIsEditing(true);
  };

  const handleEditSubmit = () => {
    if (onUpdateValue) {
      onUpdateValue(path, editInput);
    }
    setIsEditing(false);
  };

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  };

  // Render Primitive Values
  if (!isObject) {
    let formattedVal = String(value);
    let colorClass = 'text-zinc-300';

    if (value === null) {
      formattedVal = 'null';
      colorClass = 'text-rose-400 italic';
    } else if (typeof value === 'string') {
      formattedVal = JSON.stringify(value);
      colorClass = 'text-emerald-400';
    } else if (typeof value === 'number') {
      formattedVal = String(value);
      colorClass = 'text-amber-400 font-semibold';
    } else if (typeof value === 'boolean') {
      formattedVal = String(value);
      colorClass = 'text-purple-400 font-semibold';
    }

    return (
      <div className="group relative flex items-center h-6 hover:bg-[#141418]/80 rounded px-1 -mx-1 transition-colors">
        <span style={{ paddingLeft: `${depth * 18}px` }} />
        <span className="w-4 shrink-0 text-transparent select-none">•</span>

        {/* Key name */}
        <span 
          onClick={() => onSelectNode?.(path, name)}
          className={`font-semibold mr-1.5 cursor-pointer ${isKeyMatch ? 'bg-amber-500/30 text-amber-200 px-0.5 rounded' : 'text-zinc-300'}`}
        >
          {name}:
        </span>

        {/* Value or Inline Edit Input */}
        {isEditing ? (
          <div className="flex items-center gap-1.5">
            <input
              type="text"
              autoFocus
              value={editInput}
              onChange={(e) => setEditInput(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleEditKeyDown}
              className="px-1.5 py-0.5 bg-zinc-900 border border-indigo-500 text-xs font-mono text-white rounded outline-none w-48 shadow-sm"
            />
            <span className="text-[10px] text-zinc-500 font-sans">↵ Enter</span>
          </div>
        ) : (
          <span 
            onDoubleClick={startEditing}
            className={`cursor-pointer hover:underline decoration-zinc-600 underline-offset-2 ${colorClass} ${isValueMatch ? 'bg-amber-500/30 text-amber-200 px-0.5 rounded' : ''}`}
            title="Double-click to edit value"
          >
            {formattedVal}
          </span>
        )}

        {/* Hover Micro-Buttons: Copy Path, Copy Value & Edit */}
        <div className="opacity-0 group-hover:opacity-100 ml-3 flex items-center gap-1 transition-opacity shrink-0">
          {!isEditing && (
            <button
              onClick={startEditing}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-sans"
              title="Edit value inline"
            >
              <Edit2 className="w-2.5 h-2.5 text-zinc-400" />
              <span>Edit</span>
            </button>
          )}

          <button
            onClick={() => onCopyPath(path)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-sans"
            title={`Copy JSON path: ${path}`}
          >
            {isPathCopied ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-400">Path Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5 text-zinc-400" />
                <span>Copy Path</span>
              </>
            )}
          </button>

          <button
            onClick={() => onCopyValue(value, path)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-sans"
            title="Copy raw value"
          >
            {isValCopied ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-400">Value Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5 text-zinc-400" />
                <span>Copy Val</span>
              </>
            )}
          </button>
        </div>
      </div>
    );
  }

  // Render Object or Array Node
  const isLargeArray = isArray && (value as unknown[]).length > 50 && chunkLargeArrays;

  const entries = isArray
    ? (value as unknown[]).map((item, idx) => [String(idx), item] as [string, unknown])
    : Object.entries(value as Record<string, unknown>);

  const itemsCount = entries.length;

  return (
    <div className="select-text">
      <div className="group relative flex items-center h-6 hover:bg-[#141418]/80 rounded px-1 -mx-1 transition-colors">
        <span style={{ paddingLeft: `${depth * 18}px` }} />

        {/* Toggle Caret */}
        <button
          onClick={() => onToggleCollapse(path)}
          className="w-4 h-4 flex items-center justify-center text-zinc-400 hover:text-zinc-200 mr-1 shrink-0"
        >
          {isCollapsed ? (
            <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-indigo-400" />
          )}
        </button>

        {/* Key name */}
        <span 
          onClick={() => {
            onToggleCollapse(path);
            onSelectNode?.(path, name);
          }}
          className={`font-semibold mr-1.5 cursor-pointer ${
            isKeyMatch ? 'bg-amber-500/30 text-amber-200 px-0.5 rounded' : 'text-zinc-200'
          }`}
        >
          {name}:
        </span>

        {/* Node Badge */}
        <span
          onClick={() => onToggleCollapse(path)}
          className="cursor-pointer text-[10px] px-1.5 py-0.2 rounded font-sans bg-zinc-800/80 border border-zinc-700/80 text-zinc-400 hover:text-zinc-200 mr-1 font-mono"
        >
          {isArray ? `[ ${itemsCount} items ]` : `{ ${itemsCount} keys }`}
        </span>

        {/* Hover Micro-Buttons */}
        <div className="opacity-0 group-hover:opacity-100 ml-3 flex items-center gap-1 transition-opacity shrink-0">
          <button
            onClick={() => onCopyPath(path)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-sans"
            title={`Copy JSON path: ${path}`}
          >
            {isPathCopied ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-400">Path Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5 text-zinc-400" />
                <span>Copy Path</span>
              </>
            )}
          </button>

          <button
            onClick={() => onCopyValue(value, path)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition-colors font-sans"
            title="Copy whole JSON node"
          >
            {isValCopied ? (
              <>
                <Check className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-400">Value Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5 text-zinc-400" />
                <span>Copy Val</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Children with Anti-Freeze Large Array Chunking */}
      {!isCollapsed && (
        <div className="relative">
          <div
            className="absolute left-[7px] top-0 bottom-0 w-[1px] bg-zinc-800/80"
            style={{ left: `${depth * 18 + 7}px` }}
          />

          {isLargeArray ? (
            // Chunked Array Rendering (50 items per chunk)
            Array.from({ length: Math.ceil(itemsCount / 50) }).map((_, chunkIdx) => {
              const startIdx = chunkIdx * 50;
              const endIdx = Math.min(startIdx + 49, itemsCount - 1);
              const chunkPath = `${path}_chunk_${chunkIdx}`;
              const isChunkCollapsed = collapsedPaths.has(chunkPath);

              return (
                <div key={chunkPath} className="my-0.5">
                  <div
                    onClick={() => onToggleCollapse(chunkPath)}
                    className="flex items-center h-6 hover:bg-[#141418] cursor-pointer rounded px-1 -mx-1 text-xs text-zinc-400"
                    style={{ paddingLeft: `${(depth + 1) * 18}px` }}
                  >
                    {isChunkCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 mr-1" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-indigo-400 mr-1" />
                    )}
                    <span className="font-mono text-[11px] text-indigo-300 bg-indigo-950/60 px-1.5 py-0.2 rounded border border-indigo-800/40">
                      Items [{startIdx} ... {endIdx}]
                    </span>
                  </div>

                  {!isChunkCollapsed && (
                    <div>
                      {entries.slice(startIdx, endIdx + 1).map(([childKey, childVal]) => (
                        <TreeNode
                          key={childKey}
                          name={childKey}
                          value={childVal}
                          path={`${path}[${childKey}]`}
                          depth={depth + 2}
                          searchTerm={searchTerm}
                          collapsedPaths={collapsedPaths}
                          onToggleCollapse={onToggleCollapse}
                          onCopyPath={onCopyPath}
                          onCopyValue={onCopyValue}
                          copiedKey={copiedKey}
                          onUpdateValue={onUpdateValue}
                          chunkLargeArrays={chunkLargeArrays}
                          onSelectNode={onSelectNode}
                        />
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            // Standard Unchunked Rendering
            entries.map(([childKey, childVal]) => {
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
                  onCopyValue={onCopyValue}
                  copiedKey={copiedKey}
                  onUpdateValue={onUpdateValue}
                  chunkLargeArrays={chunkLargeArrays}
                  onSelectNode={onSelectNode}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
