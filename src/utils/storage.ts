import { get, set, del } from 'idb-keyval';
import { formatBytes } from './jsonMetrics';

export interface JsonSession {
  id: string;
  title: string;
  timestamp: number;
  rawJson: string;
  sizeBytes: number;
  formattedSize: string;
  keysCount: number;
  preview: string;
}

const SESSIONS_STORAGE_KEY = 'devjson_studio_sessions_v1';
const DRAFT_STORAGE_KEY = 'devjson_studio_current_draft';
const MAX_SESSIONS = 15;

/**
 * Generate a smart title from the JSON content
 */
export function generateSessionTitle(data: unknown): string {
  if (data === null) return 'Empty payload';
  if (typeof data !== 'object') return `${typeof data} payload`;

  if (Array.isArray(data)) {
    return `Array (${data.length} items)`;
  }

  const obj = data as Record<string, unknown>;
  if (obj.name && typeof obj.name === 'string') return `Entity: ${obj.name}`;
  if (obj.title && typeof obj.title === 'string') return `Item: ${obj.title}`;
  if (obj.id) return `Object #${obj.id}`;
  if (obj.status) return `Response (${obj.status})`;
  if (obj.data) return 'API Data Response';

  const keys = Object.keys(obj);
  if (keys.length > 0) {
    return `{ ${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''} }`;
  }

  return 'JSON Payload';
}

/**
 * Retrieve all saved sessions (up to 15, newest first)
 */
export async function getStoredSessions(): Promise<JsonSession[]> {
  try {
    const list = await get<JsonSession[]>(SESSIONS_STORAGE_KEY);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error('Failed to load sessions from IndexedDB:', err);
    return [];
  }
}

/**
 * Save or update a session in IndexedDB
 */
export async function saveSession(rawJson: string, customTitle?: string): Promise<JsonSession[]> {
  if (!rawJson || rawJson.trim() === '') {
    return await getStoredSessions();
  }

  let parsed: unknown = null;
  let keysCount = 0;
  try {
    parsed = JSON.parse(rawJson);
    if (parsed && typeof parsed === 'object') {
      keysCount = Object.keys(parsed).length;
    }
  } catch {
    // Incomplete or invalid JSON can still be saved as session draft
  }

  const sizeBytes = new Blob([rawJson]).size;
  const formattedSize = formatBytes(sizeBytes);
  const title = customTitle || generateSessionTitle(parsed);
  
  // Create 1-line preview
  const preview = rawJson.replace(/\s+/g, ' ').slice(0, 120);

  const newSession: JsonSession = {
    id: 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    title,
    timestamp: Date.now(),
    rawJson,
    sizeBytes,
    formattedSize,
    keysCount,
    preview,
  };

  try {
    const existing = await getStoredSessions();
    
    // Check if identical to the most recent session
    if (existing.length > 0 && existing[0].rawJson === rawJson) {
      existing[0].timestamp = Date.now();
      if (customTitle) existing[0].title = customTitle;
      await set(SESSIONS_STORAGE_KEY, existing);
      return existing;
    }

    // Filter out duplicate identical content if exists elsewhere
    const filtered = existing.filter(s => s.rawJson !== rawJson);
    const updated = [newSession, ...filtered].slice(0, MAX_SESSIONS);

    await set(SESSIONS_STORAGE_KEY, updated);
    return updated;
  } catch (err) {
    console.error('Failed to save session to IndexedDB:', err);
    return [];
  }
}

/**
 * Delete a single session by ID
 */
export async function deleteSession(id: string): Promise<JsonSession[]> {
  try {
    const existing = await getStoredSessions();
    const updated = existing.filter(s => s.id !== id);
    await set(SESSIONS_STORAGE_KEY, updated);
    return updated;
  } catch (err) {
    console.error('Failed to delete session from IndexedDB:', err);
    return [];
  }
}

/**
 * Clear all stored sessions
 */
export async function clearAllSessions(): Promise<void> {
  try {
    await del(SESSIONS_STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear sessions:', err);
  }
}

/**
 * Save draft state for instant page reload recovery
 */
export async function saveCurrentDraft(rawJson: string): Promise<void> {
  try {
    await set(DRAFT_STORAGE_KEY, rawJson);
  } catch (err) {
    console.warn('Draft save error:', err);
  }
}

/**
 * Retrieve saved draft
 */
export async function getCurrentDraft(): Promise<string | null> {
  try {
    const val = await get<string>(DRAFT_STORAGE_KEY);
    return typeof val === 'string' ? val : null;
  } catch {
    return null;
  }
}

export interface WorkspaceTab {
  id: string;
  name: string;
  rawJson: string;
  updatedAt: number;
}

const WORKSPACE_TABS_STORAGE_KEY = 'devjson_studio_workspace_tabs_v5';

export async function getStoredWorkspaceTabs(): Promise<WorkspaceTab[]> {
  try {
    const list = await get<WorkspaceTab[]>(WORKSPACE_TABS_STORAGE_KEY);
    return Array.isArray(list) && list.length > 0 ? list : [];
  } catch (err) {
    console.error('Failed to load workspace tabs:', err);
    return [];
  }
}

export async function saveStoredWorkspaceTabs(tabs: WorkspaceTab[]): Promise<void> {
  try {
    await set(WORKSPACE_TABS_STORAGE_KEY, tabs);
  } catch (err) {
    console.warn('Failed to save workspace tabs:', err);
  }
}
