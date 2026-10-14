import { jsonrepair } from 'jsonrepair';

export interface JsonErrorDetail {
  message: string;
  line: number;
  column: number;
  position: number;
  snippet: string;
  fixSuggestion?: string;
}

export interface ValidationResult {
  isValid: boolean;
  parsed: unknown | null;
  error: JsonErrorDetail | null;
}

/**
 * Validate JSON string and pinpoint error location
 */
export function validateJson(text: string): ValidationResult {
  if (!text || text.trim() === '') {
    return {
      isValid: false,
      parsed: null,
      error: {
        message: 'JSON input is empty',
        line: 1,
        column: 1,
        position: 0,
        snippet: '',
      },
    };
  }

  try {
    const parsed = JSON.parse(text);
    return { isValid: true, parsed, error: null };
  } catch (err: unknown) {
    const errorMsg = (err instanceof Error) ? err.message : String(err);
    const detail = extractJsonErrorDetails(text, errorMsg);
    return { isValid: false, parsed: null, error: detail };
  }
}

/**
 * Extract line, column, and code snippet from JSON.parse error message
 */
function extractJsonErrorDetails(text: string, errorMessage: string): JsonErrorDetail {
  let line = 1;
  let column = 1;
  let position = 0;

  // Try extracting position from standard V8 error "at position X"
  const posMatch = errorMessage.match(/at position (\d+)/i);
  if (posMatch) {
    position = parseInt(posMatch[1], 10);
    // Calculate line and column from character position
    const lines = text.slice(0, position).split('\n');
    line = lines.length;
    column = lines[lines.length - 1].length + 1;
  } else {
    // Try matching "line X column Y" (e.g. in some browsers / engines)
    const lineColMatch = errorMessage.match(/line (\d+) column (\d+)/i);
    if (lineColMatch) {
      line = parseInt(lineColMatch[1], 10);
      column = parseInt(lineColMatch[2], 10);
      // Calculate approximate position
      const lines = text.split('\n');
      position = 0;
      for (let i = 0; i < line - 1 && i < lines.length; i++) {
        position += lines[i].length + 1; // +1 for newline
      }
      position += Math.max(0, column - 1);
    }
  }

  // Generate excerpt around the error position
  const lines = text.split('\n');
  const targetLineIdx = Math.max(0, Math.min(line - 1, lines.length - 1));
  const targetLine = lines[targetLineIdx] || '';
  
  // Create pointer string
  const pointerSpaces = ' '.repeat(Math.max(0, column - 1));
  const snippet = `${targetLine}\n${pointerSpaces}^`;

  // Suggest fix based on error message patterns
  let fixSuggestion = 'Click "Auto-Fix JSON ✨" to repair syntax errors automatically.';
  if (/trailing comma/i.test(errorMessage) || (targetLine.includes(',') && errorMessage.includes('token'))) {
    fixSuggestion = 'Likely trailing comma or missing property after comma.';
  } else if (/single quote/i.test(errorMessage) || targetLine.includes("'")) {
    fixSuggestion = 'Single quotes are invalid in standard JSON. Use double quotes.';
  } else if (/unexpected token/i.test(errorMessage) && /[a-zA-Z_]/.test(targetLine)) {
    fixSuggestion = 'Keys must be wrapped in double quotes, or literal values like True/False should be lowercase.';
  }

  return {
    message: cleanErrorMessage(errorMessage),
    line,
    column,
    position,
    snippet,
    fixSuggestion,
  };
}

function cleanErrorMessage(msg: string): string {
  // Strip redundant "JSON.parse: " or "SyntaxError: " prefixes
  return msg
    .replace(/^SyntaxError:\s*/i, '')
    .replace(/^JSON\.parse:\s*/i, '')
    .trim();
}

/**
 * Attempts to repair invalid JSON using jsonrepair + fallback heuristics
 */
export function repairJsonString(raw: string): { repaired: string; changed: boolean; error?: string } {
  if (!raw || raw.trim() === '') {
    return { repaired: raw, changed: false };
  }

  // Pre-cleaning for Python literals, comments, unquoted booleans
  let working = raw;

  // 1. First attempt: jsonrepair library
  try {
    const repairedByLib = jsonrepair(working);
    // Verify it is actually valid JSON
    JSON.parse(repairedByLib);
    return {
      repaired: repairedByLib,
      changed: repairedByLib !== raw,
    };
  } catch {
    // If jsonrepair alone fails, apply pre-processing heuristics and try again
  }

  // Heuristic Pre-processing
  try {
    // Replace Python True, False, None
    working = working.replace(/:\s*True\b/g, ': true')
                     .replace(/:\s*False\b/g, ': false')
                     .replace(/:\s*None\b/g, ': null')
                     .replace(/\[\s*True\b/g, '[true')
                     .replace(/\[\s*False\b/g, '[false')
                     .replace(/\[\s*None\b/g, '[null');

    // Remove single line comments // ...
    working = working.replace(/\/\/.*$/gm, '');

    // Remove multiline comments /* ... */
    working = working.replace(/\/\*[\s\S]*?\*\//g, '');

    // Replace undefined or NaN
    working = working.replace(/:\s*undefined\b/g, ': null')
                     .replace(/:\s*NaN\b/g, ': null');

    // Strip trailing semicolons
    working = working.replace(/;\s*$/g, '');

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
      error: `Could not fully auto-fix: ${msg}`,
    };
  }
}

/**
 * Format JSON with custom spacing (2 or 4 spaces)
 */
export function formatJsonString(raw: string, space = 2): { formatted: string; success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    return {
      formatted: JSON.stringify(parsed, null, space),
      success: true,
    };
  } catch {
    // Try auto-fixing first
    const repair = repairJsonString(raw);
    if (repair.changed) {
      try {
        const parsed = JSON.parse(repair.repaired);
        return {
          formatted: JSON.stringify(parsed, null, space),
          success: true,
        };
      } catch (err) {
        return { formatted: raw, success: false, error: String(err) };
      }
    }
    return { formatted: raw, success: false, error: 'Cannot format invalid JSON' };
  }
}

/**
 * Minify JSON
 */
export function minifyJsonString(raw: string): { minified: string; success: boolean; error?: string } {
  try {
    const parsed = JSON.parse(raw);
    return {
      minified: JSON.stringify(parsed),
      success: true,
    };
  } catch {
    // Try auto-repair then minify
    const repair = repairJsonString(raw);
    if (repair.changed) {
      try {
        const parsed = JSON.parse(repair.repaired);
        return {
          minified: JSON.stringify(parsed),
          success: true,
        };
      } catch (err) {
        return { minified: raw, success: false, error: String(err) };
      }
    }
    return { minified: raw, success: false, error: 'Cannot minify invalid JSON' };
  }
}
