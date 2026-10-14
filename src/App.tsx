import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { GlobalHeader, type WorkspaceMode } from './components/GlobalHeader';
import { SmartEditor } from './components/SmartEditor';
import { MultiEngineInspector, type OutputEngineTab } from './components/MultiEngineInspector';
import { TelemetryBar } from './components/TelemetryBar';
import { CommandPalette, type CommandItem } from './components/CommandPalette';
import { HistoryDrawer } from './components/HistoryDrawer';
import { ShareModal } from './components/ShareModal';
import { PrivacyModal } from './components/PrivacyModal';
import { DiffViewer } from './components/DiffViewer';

import { 
  validatePayload, 
  repairPayload, 
  sortJsonKeys,
  type EngineValidationResult
} from './utils/jsonRepairEngine';
import { calculateJsonMetrics, type JsonMetrics } from './utils/jsonMetrics';
import { generateTypeScriptTypes, type TypeGeneratorOptions } from './utils/typeGenerator';
import { generateZodSchema, type ZodGeneratorOptions } from './utils/zodGenerator';
import { generateApiAndMockCode, type MockEngineType, type HttpMethod } from './utils/mockGenerator';
import { detectSensitiveKeys, maskSecretsInPayload, maskSelectedSecretsInPayload, type SensitiveDetection } from './utils/piiSanitizer';
import { updateValueByPath } from './utils/treeUpdater';
import { UndoRedoStack } from './utils/historyStack';
import { detectUnwrapperCandidate, type UnwrapperCandidate } from './utils/inputUnwrapper';
import { scanPrecisionGuard, formatPreservingBigInt, minifyPreservingBigInt } from './utils/precisionGuard';
import { 
  getStoredSessions, 
  saveSession, 
  deleteSession, 
  clearAllSessions, 
  saveCurrentDraft, 
  getCurrentDraft,
  getStoredWorkspaceTabs,
  saveStoredWorkspaceTabs,
  type JsonSession,
  type WorkspaceTab
} from './utils/storage';
import { 
  generateShareUrl, 
  extractJsonFromUrl, 
  downloadFile, 
  type ShareResult 
} from './utils/urlSharing';
import { PRESET_DATASETS, type PresetDataset } from './data/sampleData';

import { 
  Wand2, 
  AlignLeft, 
  Minimize2, 
  ArrowUpDown, 
  Trash2, 
  Share2, 
  Download, 
  Network, 
  FileCode, 
  ShieldAlert, 
  Search, 
  Send, 
  Sparkles, 
  Shield, 
  GitCompare, 
  RotateCcw,
  RotateCw,
  Package
} from 'lucide-react';

export const App: React.FC = () => {
  // Main JSON state
  const [rawJson, setRawJson] = useState<string>('');
  const [activeTab, setActiveTab] = useState<OutputEngineTab>('tree');
  const [hasCurlExtracted, setHasCurlExtracted] = useState<boolean>(false);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('studio');

  const handleTabChange = useCallback((tab: OutputEngineTab) => {
    setActiveTab(tab);
    if (tab === 'mock') {
      setHasCurlExtracted(false);
    }
  }, []);

  // Multi-Tab Scratchpad Workspaces (v5.0)
  const [workspaceTabs, setWorkspaceTabs] = useState<WorkspaceTab[]>([
    {
      id: 'tab_default_1',
      name: 'Payload 1',
      rawJson: PRESET_DATASETS[0].data,
      updatedAt: Date.now(),
    }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>('tab_default_1');

  // Split-pane sizing
  const [splitPercent, setSplitPercent] = useState<number>(50);
  const isDraggingSplitter = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Undo / Redo Engine (capped at 25, 2MB guard)
  const undoStack = useRef(new UndoRedoStack(25));
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Breadcrumbs & Line Synchronization (v5.0)
  const [currentBreadcrumbPath, setCurrentBreadcrumbPath] = useState<string>('root');
  const [targetScrollLine, setTargetScrollLine] = useState<number | null>(null);

  // Modals
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [shareData, setShareData] = useState<ShareResult | null>(null);

  // IndexedDB session state
  const [sessions, setSessions] = useState<JsonSession[]>([]);
  const [isSavedToIdb, setIsSavedToIdb] = useState(false);

  // Adaptive Performance Debouncing for Payloads > 50KB (v5.0)
  const isLargePayload = rawJson.length > 50 * 1024;
  const [debouncedRawJson, setDebouncedRawJson] = useState<string>(rawJson);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  useEffect(() => {
    if (!isLargePayload) {
      setDebouncedRawJson(rawJson);
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    const timer = setTimeout(() => {
      setDebouncedRawJson(rawJson);
      setIsProcessing(false);
    }, 200);

    return () => clearTimeout(timer);
  }, [rawJson, isLargePayload]);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  }, []);

  // Code Generation Configs
  const [tsOptions, setTsOptions] = useState<TypeGeneratorOptions>({
    rootName: 'ApiResponse',
    exportKind: 'interface',
    exportKeyword: true,
    readonlyProps: false,
    allOptional: false,
    includeComments: true,
  });

  const [zodOptions, setZodOptions] = useState<ZodGeneratorOptions>({
    rootName: 'ApiResponse',
    inferPatterns: true,
    isStrict: false,
    exportInferredType: true,
  });

  const [mockEngine, setMockEngine] = useState<MockEngineType>('fetch');
  const [mockMethod, setMockMethod] = useState<HttpMethod>('GET');
  const [mockEndpoint, setMockEndpoint] = useState<string>('https://api.acme.io/v1/organization');
  const [mockAuthHeader, setMockAuthHeader] = useState<boolean>(true);
  const [mockTryCatch, setMockTryCatch] = useState<boolean>(true);

  // Mutation with Undo Snapshot helper
  const applyMutationWithUndo = useCallback((newText: string, actionLabel: string, toastNotice?: string) => {
    undoStack.current.pushSnapshot(rawJson, actionLabel);
    setRawJson(newText);
    setCanUndo(true);
    setCanRedo(false);
    if (toastNotice) {
      showToast(toastNotice);
    }
  }, [rawJson, showToast]);

  const handleUndo = useCallback(() => {
    const result = undoStack.current.undo(rawJson);
    if (result) {
      setRawJson(result.restoredText);
      setCanUndo(undoStack.current.canUndo());
      setCanRedo(undoStack.current.canRedo());
      showToast(`↩ Undone: ${result.label}`);
    } else {
      showToast('No more actions to undo');
    }
  }, [rawJson, showToast]);

  const handleRedo = useCallback(() => {
    const result = undoStack.current.redo(rawJson);
    if (result) {
      setRawJson(result.restoredText);
      setCanUndo(undoStack.current.canUndo());
      setCanRedo(undoStack.current.canRedo());
      showToast(`↪ Redone: ${result.label}`);
    } else {
      showToast('No more actions to redo');
    }
  }, [rawJson, showToast]);

  // 1. Initial Load: Check URL hash -> Workspace Tabs -> IndexedDB draft -> Default SaaS Preset
  useEffect(() => {
    async function init() {
      const stored = await getStoredSessions();
      setSessions(stored);

      const savedTabs = await getStoredWorkspaceTabs();
      if (savedTabs && savedTabs.length > 0) {
        setWorkspaceTabs(savedTabs);
        setActiveTabId(savedTabs[0].id);
        setRawJson(savedTabs[0].rawJson);
        return;
      }

      const urlPayload = extractJsonFromUrl();
      if (urlPayload) {
        setRawJson(urlPayload);
        showToast('🔗 Loaded snapshot from URL hash');
        return;
      }

      const savedDraft = await getCurrentDraft();
      if (savedDraft && savedDraft.trim()) {
        setRawJson(savedDraft);
        return;
      }

      // Default: SaaS Production Response
      const defaultData = PRESET_DATASETS[0].data;
      setRawJson(defaultData);
      setWorkspaceTabs([
        {
          id: 'tab_default_1',
          name: 'Payload 1',
          rawJson: defaultData,
          updatedAt: Date.now(),
        }
      ]);
    }

    init();
  }, [showToast]);

  // Sync current rawJson to active workspace tab
  useEffect(() => {
    setWorkspaceTabs(prev => {
      const updated = prev.map(t => t.id === activeTabId ? { ...t, rawJson, updatedAt: Date.now() } : t);
      saveStoredWorkspaceTabs(updated);
      return updated;
    });
  }, [rawJson, activeTabId]);

  // Multi-Tab Handlers
  const handleSelectWorkspaceTab = (targetId: string) => {
    if (targetId === activeTabId) return;
    const target = workspaceTabs.find(t => t.id === targetId);
    if (target) {
      setActiveTabId(targetId);
      setRawJson(target.rawJson);
      undoStack.current.clear();
      setCanUndo(false);
      setCanRedo(false);
      setCurrentBreadcrumbPath('root');
    }
  };

  const handleCreateWorkspaceTab = () => {
    if (workspaceTabs.length >= 6) {
      showToast('Maximum 6 workspace tabs allowed');
      return;
    }
    const newTab: WorkspaceTab = {
      id: 'tab_' + Date.now(),
      name: `Payload ${workspaceTabs.length + 1}`,
      rawJson: '',
      updatedAt: Date.now(),
    };
    const updated = [...workspaceTabs, newTab];
    setWorkspaceTabs(updated);
    saveStoredWorkspaceTabs(updated);
    setActiveTabId(newTab.id);
    setRawJson('');
    undoStack.current.clear();
    setCanUndo(false);
    setCanRedo(false);
    setCurrentBreadcrumbPath('root');
    showToast(`Created workspace: ${newTab.name}`);
  };

  const handleCloseWorkspaceTab = (tabId: string) => {
    if (workspaceTabs.length <= 1) return;
    const filtered = workspaceTabs.filter(t => t.id !== tabId);
    setWorkspaceTabs(filtered);
    saveStoredWorkspaceTabs(filtered);
    if (activeTabId === tabId) {
      const nextTab = filtered[0];
      setActiveTabId(nextTab.id);
      setRawJson(nextTab.rawJson);
      undoStack.current.clear();
      setCanUndo(false);
      setCanRedo(false);
      setCurrentBreadcrumbPath('root');
    }
    showToast('Closed workspace tab');
  };

  const handleRenameWorkspaceTab = (tabId: string, newName: string) => {
    setWorkspaceTabs(prev => {
      const updated = prev.map(t => t.id === tabId ? { ...t, name: newName, updatedAt: Date.now() } : t);
      saveStoredWorkspaceTabs(updated);
      return updated;
    });
    showToast(`Renamed workspace to "${newName}"`);
  };

  // 2. Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K -> Command Palette
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
      // ⌘Z / Ctrl+Z -> Undo
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleUndo();
        }
      }
      // ⌘Y / Ctrl+Y or ⌘Shift+Z -> Redo
      if (
        ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'y') ||
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        if (document.activeElement?.tagName !== 'TEXTAREA') {
          e.preventDefault();
          handleRedo();
        }
      }
      // Alt+R -> Auto-Repair
      if (e.altKey && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleAutoRepair();
      }
      // Alt+M -> Mask Secrets
      if (e.altKey && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleMaskSecrets();
      }
      // Alt+D -> Toggle Diff Mode
      if (e.altKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setWorkspaceMode(prev => prev === 'studio' ? 'diff' : 'studio');
      }
      // Alt+Shift+F -> Prettify
      if (e.altKey && e.shiftKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        handlePrettify();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [rawJson, handleUndo, handleRedo]);

  // 3. Validation and Diagnostics Evaluation
  const validation: EngineValidationResult = useMemo(() => {
    return validatePayload(debouncedRawJson);
  }, [debouncedRawJson]);

  // 4. Smart Input Unwrapper Candidate Detection (v5.0)
  const unwrapperCandidate: UnwrapperCandidate | null = useMemo(() => {
    return detectUnwrapperCandidate(rawJson);
  }, [rawJson]);

  // 5. 64-Bit BigInt Precision Guard (v5.0)
  const precisionReport = useMemo(() => {
    return scanPrecisionGuard(rawJson);
  }, [rawJson]);

  // 6. Metrics Calculation
  const metrics: JsonMetrics = useMemo(() => {
    return calculateJsonMetrics(debouncedRawJson, validation.parsed);
  }, [debouncedRawJson, validation.parsed]);

  // 7. Sensitive Keys Detection
  const sensitiveDetections: SensitiveDetection[] = useMemo(() => {
    if (!validation.isValid || !validation.parsed) return [];
    return detectSensitiveKeys(validation.parsed);
  }, [validation.isValid, validation.parsed]);

  // 8. Debounced Auto-Save to IndexedDB (1.5s after valid edit)
  useEffect(() => {
    if (!rawJson || rawJson.trim() === '') return;

    saveCurrentDraft(rawJson);

    if (!validation.isValid) {
      setIsSavedToIdb(false);
      return;
    }

    const timer = setTimeout(async () => {
      const updated = await saveSession(rawJson);
      setSessions(updated);
      setIsSavedToIdb(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [rawJson, validation.isValid]);

  // 9. Code Generators
  const tsCode = useMemo(() => {
    if (!validation.isValid || validation.parsed === null) {
      return '// Enter valid JSON or run Auto-Repair ✨ to generate TypeScript interfaces.\n';
    }
    try {
      return generateTypeScriptTypes(validation.parsed, {
        ...tsOptions,
        unsafe64BitKeys: precisionReport.unsafeKeys,
      });
    } catch (err) {
      return `// Error generating TypeScript: ${String(err)}`;
    }
  }, [validation.isValid, validation.parsed, tsOptions, precisionReport.unsafeKeys]);

  const zodCode = useMemo(() => {
    if (!validation.isValid || validation.parsed === null) {
      return '// Enter valid JSON or run Auto-Repair ✨ to generate Zod runtime validation schema.\n';
    }
    try {
      return generateZodSchema(validation.parsed, zodOptions);
    } catch (err) {
      return `// Error generating Zod schema: ${String(err)}`;
    }
  }, [validation.isValid, validation.parsed, zodOptions]);

  const mockCode = useMemo(() => {
    return generateApiAndMockCode({
      engine: mockEngine,
      method: mockMethod,
      endpointUrl: mockEndpoint,
      typeName: tsOptions.rootName || 'ApiResponse',
      includeAuthHeader: mockAuthHeader,
      includeTryCatch: mockTryCatch,
      rawJsonSample: validation.isValid && rawJson ? rawJson : '{\n  "status": "success"\n}',
    });
  }, [mockEngine, mockMethod, mockEndpoint, tsOptions.rootName, mockAuthHeader, mockTryCatch, validation.isValid, rawJson]);

  // 10. Actions
  const handleAutoRepair = () => {
    const res = repairPayload(rawJson);
    if (res.changed) {
      applyMutationWithUndo(res.repaired, 'Auto-Repair', '✨ Auto-repaired syntax — Press ⌘Z to undo');
    } else if (res.error) {
      showToast(`⚠️ ${res.error}`);
    } else {
      showToast('ℹ️ Payload is already valid RFC 8259 JSON');
    }
  };

  const handlePrettify = () => {
    try {
      // Use Lossless 64-bit BigInt formatting (v5.0)
      const formatted = formatPreservingBigInt(rawJson, 2);
      applyMutationWithUndo(formatted, 'Prettify JSON', '📐 Prettified JSON (Lossless BigInt Protected)');
    } catch {
      showToast('⚠️ Cannot prettify invalid JSON. Click Auto-Repair ✨ first.');
    }
  };

  const handleMinify = () => {
    try {
      const minified = minifyPreservingBigInt(rawJson);
      applyMutationWithUndo(minified, 'Minify JSON', '⚡ Minified payload (Lossless BigInt Protected)');
    } catch {
      showToast('⚠️ Cannot minify invalid JSON. Click Auto-Repair ✨ first.');
    }
  };

  const handleSortKeys = () => {
    const res = sortJsonKeys(rawJson);
    if (res.success) {
      applyMutationWithUndo(res.sorted, 'Sort Keys', '🔤 Sorted object keys (A-Z) — Press ⌘Z to undo');
    } else {
      showToast('⚠️ Cannot sort keys of invalid JSON. Click Auto-Repair ✨ first.');
    }
  };

  const handleMaskSecrets = () => {
    const res = maskSecretsInPayload(rawJson);
    if (res.count > 0) {
      applyMutationWithUndo(res.maskedJson, 'Mask Secrets', `🛡️ Masked ${res.count} sensitive values — Press ⌘Z to undo`);
    } else {
      showToast('ℹ️ No sensitive keys detected');
    }
  };

  const handleApplySelectiveMask = (selectedPaths: string[]) => {
    const res = maskSelectedSecretsInPayload(rawJson, selectedPaths);
    if (res.count > 0) {
      applyMutationWithUndo(res.maskedJson, 'Selective Mask', `🛡️ Redacted ${res.count} selected fields — Press ⌘Z to undo`);
    } else {
      showToast('ℹ️ No fields selected for redaction');
    }
  };

  const handleApplyUnwrapper = (candidate: UnwrapperCandidate) => {
    applyMutationWithUndo(candidate.unwrappedJson, candidate.title, `🪄 Applied: ${candidate.actionLabel}`);
    if (candidate.curlData) {
      setMockEndpoint(candidate.curlData.url);
      setMockMethod(candidate.curlData.method as HttpMethod);
      if (candidate.curlData.headers['Authorization'] || candidate.curlData.headers['authorization']) {
        setMockAuthHeader(true);
      }
      setHasCurlExtracted(true);
      showToast(`🪄 Extracted cURL: ${candidate.curlData.method} ${candidate.curlData.url} → View client.ts`);
    }
  };

  const handleClear = () => {
    if (rawJson) {
      applyMutationWithUndo('', 'Clear Canvas', '🗑️ Cleared canvas — Press ⌘Z to undo');
    }
  };

  const handleLoadPreset = (preset: PresetDataset) => {
    applyMutationWithUndo(preset.data, `Load ${preset.name}`, `📦 Loaded preset: ${preset.name}`);
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result;
      if (typeof text === 'string') {
        applyMutationWithUndo(text, `Upload ${file.name}`, `📁 Uploaded ${file.name} (${Math.round(file.size / 1024)} KB)`);
      }
    };
    reader.readAsText(file);
  };

  const handleOpenShare = () => {
    const res = generateShareUrl(rawJson);
    setShareData(res);
    setIsShareOpen(true);
  };

  const handleRestoreSession = (session: JsonSession) => {
    applyMutationWithUndo(session.rawJson, `Restore ${session.title}`, `🔄 Restored snapshot: ${session.title}`);
  };

  const handleDeleteSession = async (id: string) => {
    const updated = await deleteSession(id);
    setSessions(updated);
    showToast('Deleted snapshot from IndexedDB');
  };

  const handleClearAllHistory = async () => {
    await clearAllSessions();
    setSessions([]);
    showToast('Cleared all history snapshots');
  };

  const handleDownloadJson = () => {
    downloadFile(rawJson || '{}', 'payload.json', 'application/json');
    showToast('💾 Downloaded payload.json');
  };

  const handleDownloadOutput = (filename: string, content: string) => {
    const mime = filename.endsWith('.json') ? 'application/json' : 'text/typescript';
    downloadFile(content, filename, mime);
    showToast(`💾 Downloaded ${filename}`);
  };

  const handleUpdateTreeValue = (path: string, newVal: string) => {
    const updateRes = updateValueByPath(rawJson, path, newVal);
    if (updateRes.success) {
      applyMutationWithUndo(updateRes.newJson, `Edit ${path}`, `✏️ Updated "${path}" — Press ⌘Z to undo`);
    } else {
      showToast(`⚠️ ${updateRes.error || 'Failed to update value'}`);
    }
  };

  // Bi-directional node click synchronization (v5.0)
  const handleSelectTreeNode = (path: string, keyName: string) => {
    setCurrentBreadcrumbPath(path);
    if (!rawJson) return;

    // Search for key in rawJson and calculate line number
    const lines = rawJson.split('\n');
    const escaped = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`["']?${escaped}["']?\\s*:`);

    let target = -1;
    for (let i = 0; i < lines.length; i++) {
      if (regex.test(lines[i])) {
        target = i + 1;
        break;
      }
    }

    if (target !== -1) {
      setTargetScrollLine(target);
    }
  };

  // Resizable Splitter Drag Handler
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingSplitter.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingSplitter.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPercent = ((moveEvent.clientX - rect.left) / rect.width) * 100;
      if (newPercent >= 20 && newPercent <= 80) {
        setSplitPercent(newPercent);
      }
    };

    const handleMouseUp = () => {
      isDraggingSplitter.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleSplitterDoubleClick = () => {
    setSplitPercent(50);
    showToast('Reset split to 50 / 50');
  };

  // Command Palette Commands
  const commands: CommandItem[] = useMemo(() => [
    {
      id: 'undo',
      title: 'Undo Last Action ↩',
      category: 'Actions',
      icon: <RotateCcw className="w-4 h-4 text-indigo-400" />,
      shortcut: '⌘Z',
      run: handleUndo,
    },
    {
      id: 'redo',
      title: 'Redo Undone Action ↪',
      category: 'Actions',
      icon: <RotateCw className="w-4 h-4 text-purple-400" />,
      shortcut: '⌘Y',
      run: handleRedo,
    },
    {
      id: 'repair',
      title: 'Auto-Repair ✨ (Fix quotes, keys, commas, Python)',
      category: 'Actions',
      icon: <Wand2 className="w-4 h-4 text-amber-400" />,
      shortcut: 'Alt+R',
      run: handleAutoRepair,
    },
    {
      id: 'mask_secrets',
      title: 'Mask Secrets & Sanitize PII 🛡️',
      category: 'Actions',
      icon: <Shield className="w-4 h-4 text-amber-400" />,
      shortcut: 'Alt+M',
      run: handleMaskSecrets,
    },
    {
      id: 'copy_bundle',
      title: 'Copy Full API Bundle 📦 (TS + Zod + Client)',
      category: 'Export',
      icon: <Package className="w-4 h-4 text-indigo-400" />,
      run: () => {
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
        navigator.clipboard.writeText(bundle);
        showToast('📦 Copied full API bundle (TS + Zod + Client)');
      },
    },
    {
      id: 'toggle_diff',
      title: workspaceMode === 'studio' ? 'Switch to Semantic Diff ⚖️' : 'Switch to Studio Mode ⚡',
      category: 'Views',
      icon: <GitCompare className="w-4 h-4 text-emerald-400" />,
      shortcut: 'Alt+D',
      run: () => setWorkspaceMode(prev => prev === 'studio' ? 'diff' : 'studio'),
    },
    {
      id: 'prettify',
      title: 'Prettify JSON (2 spaces, Lossless BigInt)',
      category: 'Actions',
      icon: <AlignLeft className="w-4 h-4 text-indigo-400" />,
      shortcut: 'Alt+Shift+F',
      run: handlePrettify,
    },
    {
      id: 'minify',
      title: 'Minify Payload (Lossless BigInt)',
      category: 'Actions',
      icon: <Minimize2 className="w-4 h-4 text-cyan-400" />,
      run: handleMinify,
    },
    {
      id: 'sort_keys',
      title: 'Sort Object Keys A-Z (Recursive)',
      category: 'Actions',
      icon: <ArrowUpDown className="w-4 h-4 text-amber-400" />,
      run: handleSortKeys,
    },
    {
      id: 'clear',
      title: 'Clear Canvas',
      category: 'Actions',
      icon: <Trash2 className="w-4 h-4 text-rose-400" />,
      run: handleClear,
    },
    {
      id: 'engine_tree',
      title: 'Switch to Tree Explorer',
      category: 'Engines',
      icon: <Network className="w-4 h-4 text-emerald-400" />,
      run: () => setActiveTab('tree'),
    },
    {
      id: 'engine_ts',
      title: 'Switch to TypeScript Generator',
      category: 'Engines',
      icon: <FileCode className="w-4 h-4 text-indigo-400" />,
      run: () => setActiveTab('ts'),
    },
    {
      id: 'engine_zod',
      title: 'Switch to Zod Schema Generator',
      category: 'Engines',
      icon: <ShieldAlert className="w-4 h-4 text-amber-400" />,
      run: () => setActiveTab('zod'),
    },
    {
      id: 'engine_query',
      title: 'Switch to Query & Filter Engine',
      category: 'Engines',
      icon: <Search className="w-4 h-4 text-cyan-400" />,
      run: () => setActiveTab('query'),
    },
    {
      id: 'engine_mock',
      title: 'Switch to API & Mock Service Worker',
      category: 'Engines',
      icon: <Send className="w-4 h-4 text-purple-400" />,
      run: () => setActiveTab('mock'),
    },
    {
      id: 'preset_saas',
      title: 'Load SaaS Production Response',
      category: 'Presets',
      icon: <Sparkles className="w-4 h-4 text-indigo-400" />,
      run: () => handleLoadPreset(PRESET_DATASETS[0]),
    },
    {
      id: 'preset_broken',
      title: 'Load Broken JS Object (Test Auto-Fix)',
      category: 'Presets',
      icon: <Wand2 className="w-4 h-4 text-amber-400" />,
      run: () => handleLoadPreset(PRESET_DATASETS[1]),
    },
    {
      id: 'preset_stripe',
      title: 'Load Stripe Webhook Payload',
      category: 'Presets',
      icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
      run: () => handleLoadPreset(PRESET_DATASETS[2]),
    },
    {
      id: 'export_share',
      title: 'Share Zero-DB Snapshot URL',
      category: 'Export',
      icon: <Share2 className="w-4 h-4 text-indigo-400" />,
      run: handleOpenShare,
    },
    {
      id: 'export_devjson',
      title: 'Export .devjson File',
      category: 'Export',
      icon: <Download className="w-4 h-4 text-emerald-400" />,
      run: () => downloadFile(rawJson, 'snapshot.devjson', 'application/json'),
    },
  ], [rawJson, workspaceMode, handleUndo, handleRedo, tsCode, zodCode, mockCode, showToast]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#09090B] text-zinc-100 font-sans select-none">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-3.5 py-1.5 rounded-lg bg-[#141418] border border-zinc-700 shadow-2xl text-xs font-medium text-zinc-200 flex items-center gap-2 animate-command-palette">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* LAYER 1: Unified Global Bar with Multi-Tab Scratchpad Workspaces (h-11) */}
      <GlobalHeader
        mode={workspaceMode}
        onSetMode={setWorkspaceMode}
        tabs={workspaceTabs}
        activeTabId={activeTabId}
        onSelectTab={handleSelectWorkspaceTab}
        onAddTab={handleCreateWorkspaceTab}
        onCloseTab={handleCloseWorkspaceTab}
        onRenameTab={handleRenameWorkspaceTab}
        onOpenPrivacy={() => setIsPrivacyOpen(true)}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenShare={handleOpenShare}
        historyCount={sessions.length}
      />

      {/* LAYER 2: The Main Workbench (>90% vertical viewport) */}
      {workspaceMode === 'diff' ? (
        <DiffViewer
          v1Json={rawJson}
          onUpdateV1={setRawJson}
          onClose={() => setWorkspaceMode('studio')}
        />
      ) : (
        <main ref={containerRef} className="flex-1 flex overflow-hidden relative">
          {/* Left Pane: Smart Input Canvas */}
          <div 
            style={{ width: `${splitPercent}%` }} 
            className="flex flex-col min-w-[280px] h-full overflow-hidden"
          >
            <SmartEditor
              value={rawJson}
              onChange={setRawJson}
              format={validation.format}
              diagnostic={validation.error}
              sensitiveKeysCount={sensitiveDetections.length}
              sensitiveDetections={sensitiveDetections}
              unsafe64Count={precisionReport.count}
              unwrapperCandidate={unwrapperCandidate}
              onApplyUnwrapper={handleApplyUnwrapper}
              canUndo={canUndo}
              onUndo={handleUndo}
              onAutoRepair={handleAutoRepair}
              onPrettify={handlePrettify}
              onMinify={handleMinify}
              onSortKeys={handleSortKeys}
              onMaskSecrets={handleMaskSecrets}
              onApplySelectiveMask={handleApplySelectiveMask}
              onClear={handleClear}
              onFileUpload={handleFileUpload}
              onLoadPreset={handleLoadPreset}
              onDownload={handleDownloadJson}
              targetScrollLine={targetScrollLine}
            />
          </div>

          {/* 1px Resizer Divider Handle */}
          <div
            onMouseDown={handleSplitterMouseDown}
            onDoubleClick={handleSplitterDoubleClick}
            className="w-[3px] hover:w-1.5 bg-[#141418] hover:bg-indigo-500 active:bg-indigo-600 transition-all z-20 shrink-0 cursor-col-resize flex items-center justify-center group"
            title="Drag to resize (Double-click to reset 50/50)"
          >
            <div className="w-[1px] h-8 bg-zinc-700 group-hover:bg-white rounded-full transition-colors" />
          </div>

          {/* Right Pane: Virtual IDE Output & Tree Explorer */}
          <div 
            style={{ width: `${100 - splitPercent}%` }} 
            className="flex flex-col min-w-[280px] h-full overflow-hidden bg-[#09090B]"
          >
            <MultiEngineInspector
              activeTab={activeTab}
              onTabChange={handleTabChange}
              parsedData={validation.parsed}
              rawJson={rawJson}
              tsCode={tsCode}
              zodCode={zodCode}
              mockCode={mockCode}
              tsOptions={tsOptions}
              onUpdateTsOptions={setTsOptions}
              zodOptions={zodOptions}
              onUpdateZodOptions={setZodOptions}
              mockEngine={mockEngine}
              onSetMockEngine={setMockEngine}
              mockMethod={mockMethod}
              onSetMockMethod={setMockMethod}
              mockEndpoint={mockEndpoint}
              onSetMockEndpoint={setMockEndpoint}
              mockAuthHeader={mockAuthHeader}
              onSetMockAuthHeader={setMockAuthHeader}
              mockTryCatch={mockTryCatch}
              onSetMockTryCatch={setMockTryCatch}
              onDownload={handleDownloadOutput}
              onUpdateTreeValue={handleUpdateTreeValue}
              onSelectNode={handleSelectTreeNode}
              onToast={showToast}
              hasCurlExtracted={hasCurlExtracted}
            />
          </div>
        </main>
      )}

      {/* LAYER 3: Calm Telemetry Status Bar with Integrated Breadcrumbs (h-6) */}
      <TelemetryBar
        format={validation.format}
        diagnostic={validation.error}
        metrics={metrics}
        isSavedToIdb={isSavedToIdb}
        canUndo={canUndo}
        onUndo={handleUndo}
        canRedo={canRedo}
        onRedo={handleRedo}
        onErrorClick={() => {
          if (validation.error) {
            setTargetScrollLine(validation.error.line);
            showToast(`Error at Line ${validation.error.line}, Col ${validation.error.column}`);
          }
        }}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
        unsafe64Count={precisionReport.count}
        isProcessing={isProcessing}
        currentPath={currentBreadcrumbPath}
        onCopyPath={(p) => showToast(`Copied JSONPath: ${p}`)}
      />

      {/* ⌘K Command Palette Modal */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        commands={commands}
      />

      {/* Slide-Over History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        onRestoreSession={handleRestoreSession}
        onDeleteSession={handleDeleteSession}
        onClearAll={handleClearAllHistory}
      />

      {/* Share Snapshot Modal */}
      {shareData && (
        <ShareModal
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          shareData={shareData}
          rawJson={rawJson}
        />
      )}

      {/* Privacy Architecture Popover Modal */}
      <PrivacyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </div>
  );
};

export default App;
