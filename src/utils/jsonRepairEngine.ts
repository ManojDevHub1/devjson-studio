import { jsonrepair } from 'jsonrepair';

export type PayloadFormat = 'valid_json' | 'repairable_js_object' | 'syntax_error' | 'empty';

export interface DiagnosticDetail {
  message: string;
  line: number;
  column: number;
  position: number;
  snippet: string;
  fixSuggestion: string;
}

export interface EngineValidationResult {
  isValid: boolean;
  format: PayloadFormat;
  parsed: unknown | null;
  error: DiagnosticDetail | null;
}

/**
 * Strict validator and diagnostic detector
 */
export function validatePayload(text: string): EngineValidationResult {
  if (!text || text.trim() === '') {
    return {
      isValid: false,
      format: 'empty',
      parsed: null,
      error: null,
    };
  }

  // 1. Check if strictly valid JSON
  try {
    const parsed = JSON.parse(text);
    return {
      isValid: true,
      format: 'valid_json',
      parsed,
      error: null,
    };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const diagnostic = extractDiagnostic(text, errorMsg);

    // 2. Test if it's auto-repairable
    const testRepair = repairPayload(text);
    const format: PayloadFormat = testRepair.repaired && testRepair.changed ? 'repairable_js_object' : 'syntax_error';

    return {
      isValid: false,
      format,
      parsed: null,
      error: diagnostic,
    };
  }
}

/**
 * Extract exact line, column, and visual pointer from error
 */
function extractDiagnostic(text: string, errorMessage: string): DiagnosticDetail {
  let line = 1;
  let column = 1;
  let position = 0;

  const posMatch = errorMessage.match(/at position (\d+)/i);
  if (posMatch) {
    position = parseInt(posMatch[1], 10);
    const lines = text.slice(0, position).split('\n');
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
  } else {
    const lineColMatch = errorMessage.match(/line (\d+) column (\d+)/i);
    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
      const lines = text.split('\n');
      position = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i++) {
        position += lines[i].length + 1;
      }
      position += Math.max(0, column - 1);
    }
  }

  const lines = text.split('\n');
  const targetLineIdx = Math.max(0, Math.min(line - 1, lines.length - 1));
  const targetLine = lines[targetLineIdx] || '';
  const pointerSpaces = ' '.repeat(Math.max(0, column - 1));
  const snippet = `${targetLine}\n${pointerSpaces}^`;

  let fixSuggestion = 'Run Auto-Repair ✨ to fix quotes, trailing commas, or missing brackets.';
  if (/trailing comma/i.test(errorMessage) || (targetLine.includes(',') && errorMessage.includes('token'))) {
    fixSuggestion = 'Trailing comma detected in object or array. RFC 8259 disallows trailing commas.';
  } else if (/single quote/i.test(errorMessage) || targetLine.includes("'")) {
    fixSuggestion = 'Single quotes are invalid in JSON. Double quotes are required.';
  } else if (/unexpected token/i.test(errorMessage) && /[a-zA-Z_]/.test(targetLine)) {
    fixSuggestion = 'Unquoted keys or Python literals (True/False/None) must be formatted.';
  }

  const cleanMsg = errorMessage
    .replace(/^SyntaxError:\s*/i, '')
    .replace(/^JSON\.parse:\s*/i, '')
    .trim();

  return {
    message: cleanMsg,
    line,
    column,
    position,
    snippet,
    fixSuggestion,
  };
}

/**
 * Comprehensive Repair Engine: jsonrepair + Python literals + Comments + Unquoted keys + Missing braces
 */
export function repairPayload(raw: string): { repaired: string; changed: boolean; error?: string } {
  if (!raw || raw.trim() === '') {
    return { repaired: raw, changed: false };
  }

  let working = raw;

  // Pass 1: Try jsonrepair library directly
  try {
    const directResult = jsonrepair(working);
    JSON.parse(directResult);
    return {
      repaired: directResult,
      changed: directResult !== raw,
    };
  } catch {
    // Continue to advanced heuristic pre-processing
  }

  try {
    // Replace Python booleans and None
    working = working
      .replace(/:\s*True\b/g, ': true')
      .replace(/:\s*False\b/g, ': false')
      .replace(/:\s*None\b/g, ': null')
      .replace(/\[\s*True\b/g, '[true')
      .replace(/\[\s*False\b/g, '[false')
      .replace(/\[\s*None\b/g, '[null')
      .replace(/,\s*True\b/g, ', true')
      .replace(/,\s*False\b/g, ', false')
      .replace(/,\s*None\b/g, ', null');

    // Strip single line comments // ...
    working = working.replace(/\/\/.*$/gm, '');

    // Strip multiline comments /* ... */
    working = working.replace(/\/\*[\s\S]*?\*\//g, '');

    // Replace JS undefined / NaN
    working = working
      .replace(/:\s*undefined\b/g, ': null')
      .replace(/:\s*NaN\b/g, ': null');

    // Remove trailing semicolons
    working = working.replace(/;\s*$/gm, '');

    // Retry jsonrepair with pre-processed text
    const secondPass = jsonrepair(working);
    JSON.parse(secondPass);
    return {
      repaired: secondPass,
      changed: true,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      repaired: raw,
      changed: false,
      error: `Could not fully auto-repair: ${msg}`,
    };
  }
}

/**
 * Format payload with custom indentation
 */
export function prettifyPayload(raw: string, space = 2): { formatted: string; success: boolean } {
  try {
    const parsed = JSON.parse(raw);
    return {
      formatted: JSON.stringify(parsed, null, space),
      success: true,
    };
  } catch {
    const repair = repairPayload(raw);
    if (repair.changed) {
      try {
        const parsed = JSON.parse(repair.repaired);
        return {
          formatted: JSON.stringify(parsed, null, space),
          success: true,
        };
      } catch {
        return { formatted: raw, success: false };
      }
    }
    return { formatted: raw, success: false };
  }
}

/**
 * Minify payload into a single line
 */
export function minifyPayload(raw: string): { minified: string; success: boolean } {
  try {
    const parsed = JSON.parse(raw);
    return {
      minified: JSON.stringify(parsed),
      success: true,
    };
  } catch {
    const repair = repairPayload(raw);
    if (repair.changed) {
      try {
        const parsed = JSON.parse(repair.repaired);
        return {
          minified: JSON.stringify(parsed),
          success: true,
        };
      } catch {
        return { minified: raw, success: false };
      }
    }
    return { minified: raw, success: false };
  }
}

/**
 * Sort all object keys alphabetically (A-Z) recursively
 */
export function sortJsonKeys(raw: string): { sorted: string; success: boolean } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const repair = repairPayload(raw);
    if (repair.changed) {
      try {
        data = JSON.parse(repair.repaired);
      } catch {
        return { sorted: raw, success: false };
      }
    } else {
      return { sorted: raw, success: false };
    }
  }

  function sortRecursively(value: unknown): unknown {
    if (Array.isArray(value)) {
      return value.map(sortRecursively);
    } else if (value !== null && typeof value === 'object') {
      const sortedObj: Record<string, unknown> = {};
      const keys = Object.keys(value as Record<string, unknown>).sort((a, b) => a.localeCompare(b));
      for (const key of keys) {
        sortedObj[key] = sortRecursively((value as Record<string, unknown>)[key]);
      }
      return sortedObj;
    }
    return value;
  }

  const sortedData = sortRecursively(data);
  return {
    sorted: JSON.stringify(sortedData, null, 2),
    success: true,
  };
}
