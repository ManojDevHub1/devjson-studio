/**
 * Client-side JSON query & filter engine.
 * Supports:
 * - Simple dot & bracket notation: `customer.addresses[0].city`, `items[0]`
 * - Wildcard array expressions: `items[*].sku`, `users[*].name`
 * - Deep recursive search: `..id` or `..email`
 * - Substring key filtering
 */

export interface QueryResult {
  data: unknown;
  matchCount: number;
  executionTimeMs: number;
  error?: string;
}

export function executeJsonQuery(rootData: unknown, queryStr: string): QueryResult {
  const startTime = performance.now();
  const trimmed = queryStr.trim();

  if (!trimmed || trimmed === '$' || trimmed === 'root') {
    return {
      data: rootData,
      matchCount: 1,
      executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
    };
  }

  try {
    // 1. Recursive wildcard deep search (e.g., "..id" or "$..email")
    if (trimmed.startsWith('..') || trimmed.startsWith('$..')) {
      const targetKey = trimmed.replace(/^\$?\.\./, '').trim();
      const matches: unknown[] = [];

      function deepSearch(node: unknown) {
        if (node === null || node === undefined || typeof node !== 'object') return;
        if (Array.isArray(node)) {
          for (const item of node) deepSearch(item);
        } else {
          for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
            if (k === targetKey) {
              matches.push(v);
            }
            deepSearch(v);
          }
        }
      }

      deepSearch(rootData);
      return {
        data: matches,
        matchCount: matches.length,
        executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
      };
    }

    // 2. Normal path traversal
    // Clean leading $ or root
    let path = trimmed.replace(/^\$(\.|\/)?/, '').replace(/^root(\.|\/)?/, '');
    
    // Normalize bracket notation: users[0].id -> users.0.id
    path = path.replace(/\[(\d+)\]/g, '.$1');
    path = path.replace(/\["([^"]+)"\]/g, '.$1');
    path = path.replace(/\['([^']+)'\]/g, '.$1');

    const segments = path.split('.').filter(Boolean);
    let current: unknown = rootData;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];

      if (current === null || current === undefined) {
        current = undefined;
        break;
      }

      // Handle array wildcard: items[*].title
      if (seg === '*' || seg === '[*]') {
        if (!Array.isArray(current)) {
          current = [];
          break;
        }
        const remainingSegments = segments.slice(i + 1);
        if (remainingSegments.length === 0) {
          // just return all items
          break;
        }

        const subQuery = remainingSegments.join('.');
        const results = current.map((item) => {
          const res = executeJsonQuery(item, subQuery);
          return res.data;
        }).filter(item => item !== undefined);

        current = results;
        break;
      }

      if (Array.isArray(current)) {
        const index = parseInt(seg, 10);
        if (!isNaN(index)) {
          current = current[index];
        } else {
          // If property accessed on array of objects, map it! (e.g. items.title)
          current = current.map((item) => (item && typeof item === 'object' ? (item as any)[seg] : undefined)).filter(x => x !== undefined);
        }
      } else if (typeof current === 'object') {
        current = (current as Record<string, unknown>)[seg];
      } else {
        current = undefined;
        break;
      }
    }

    const matchCount = Array.isArray(current) ? current.length : current !== undefined ? 1 : 0;

    return {
      data: current,
      matchCount,
      executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      data: null,
      matchCount: 0,
      executionTimeMs: parseFloat((performance.now() - startTime).toFixed(2)),
      error: `Query Error: ${errorMsg}`,
    };
  }
}
