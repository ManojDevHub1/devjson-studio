/**
 * Client-side Structural & Schema Diff Engine.
 * Detects:
 * - Added Keys (🟢)
 * - Removed Keys (🔴)
 * - Type Changes / Breaking API changes (🟡)
 * - Modified Values (🔵)
 */

export type DiffChangeType = 'added' | 'removed' | 'type_change' | 'modified';

export interface DiffEntry {
  path: string;
  type: DiffChangeType;
  oldValue?: unknown;
  newValue?: unknown;
  oldType?: string;
  newType?: string;
  description: string;
}

export interface DiffReport {
  entries: DiffEntry[];
  stats: {
    added: number;
    removed: number;
    typeChanges: number;
    modified: number;
    total: number;
  };
  hasBreakingChanges: boolean;
}

function getNodeType(val: unknown): string {
  if (val === null) return 'null';
  if (val === undefined) return 'undefined';
  if (Array.isArray(val)) return 'array';
  return typeof val;
}

export function computeJsonDiff(v1Data: unknown, v2Data: unknown): DiffReport {
  const entries: DiffEntry[] = [];

  function compare(path: string, val1: unknown, val2: unknown) {
    const type1 = getNodeType(val1);
    const type2 = getNodeType(val2);

    // 1. Removed key
    if (val1 !== undefined && val2 === undefined) {
      entries.push({
        path,
        type: 'removed',
        oldValue: val1,
        oldType: type1,
        description: `Key removed (was ${type1})`,
      });
      return;
    }

    // 2. Added key
    if (val1 === undefined && val2 !== undefined) {
      entries.push({
        path,
        type: 'added',
        newValue: val2,
        newType: type2,
        description: `Key added (${type2})`,
      });
      return;
    }

    // 3. Type change (Breaking Change!)
    if (type1 !== type2) {
      entries.push({
        path,
        type: 'type_change',
        oldValue: val1,
        newValue: val2,
        oldType: type1,
        newType: type2,
        description: `BREAKING: Type changed from ${type1} to ${type2}`,
      });
      return;
    }

    // Both are objects
    if (type1 === 'object' && val1 !== null && val2 !== null) {
      const obj1 = val1 as Record<string, unknown>;
      const obj2 = val2 as Record<string, unknown>;
      const allKeys = Array.from(new Set([...Object.keys(obj1), ...Object.keys(obj2)]));

      for (const k of allKeys) {
        const nextPath = `${path}.${k}`;
        compare(nextPath, obj1[k], obj2[k]);
      }
      return;
    }

    // Both are arrays
    if (type1 === 'array') {
      const arr1 = val1 as unknown[];
      const arr2 = val2 as unknown[];
      const maxLen = Math.max(arr1.length, arr2.length);

      for (let i = 0; i < maxLen; i++) {
        const nextPath = `${path}[${i}]`;
        compare(nextPath, arr1[i], arr2[i]);
      }
      return;
    }

    // Primitives: Check if modified
    if (val1 !== val2) {
      entries.push({
        path,
        type: 'modified',
        oldValue: val1,
        newValue: val2,
        oldType: type1,
        newType: type2,
        description: `Value updated from ${JSON.stringify(val1)} to ${JSON.stringify(val2)}`,
      });
    }
  }

  compare('root', v1Data, v2Data);

  const stats = {
    added: entries.filter(e => e.type === 'added').length,
    removed: entries.filter(e => e.type === 'removed').length,
    typeChanges: entries.filter(e => e.type === 'type_change').length,
    modified: entries.filter(e => e.type === 'modified').length,
    total: entries.length,
  };

  return {
    entries,
    stats,
    hasBreakingChanges: stats.typeChanges > 0,
  };
}
