/**
 * Lossless 64-Bit BigInt & Precision Guard
 * Standard JSON.parse() silently corrupts integers larger than Number.MAX_SAFE_INTEGER (9007199254740991).
 * Snowflake IDs, Discord IDs, and 64-bit database keys lose precision.
 */

export interface UnsafeIntegerDetail {
  key: string;
  rawValue: string;
  line: number;
  message: string;
}

export interface PrecisionGuardReport {
  hasUnsafeIntegers: boolean;
  count: number;
  unsafeKeys: string[];
  details: UnsafeIntegerDetail[];
}

const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991
const MIN_SAFE = BigInt(Number.MIN_SAFE_INTEGER); // -9007199254740991

/**
 * Scans raw JSON text for unsafe integer literals
 */
export function scanPrecisionGuard(rawText: string): PrecisionGuardReport {
  if (!rawText || rawText.length < 10) {
    return { hasUnsafeIntegers: false, count: 0, unsafeKeys: [], details: [] };
  }

  // Regex to match JSON key-value pairs where value is a raw number (no quotes around number)
  // or naked integers in arrays
  const integerRegex = /(?:"([^"\\]*(?:\\.[^"\\]*)*)"\s*:\s*)?(-?\b\d{15,}\b)(?!\.\d|[eE][+-]?\d)/g;
  
  const lines = rawText.split('\n');
  const details: UnsafeIntegerDetail[] = [];
  const unsafeKeySet = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = integerRegex.exec(rawText)) !== null) {
    const keyName = match[1] || 'array_item';
    const numStr = match[2];

    try {
      const bi = BigInt(numStr);
      if (bi > MAX_SAFE || bi < MIN_SAFE) {
        // Find line number
        const charIndex = match.index;
        let cumulative = 0;
        let lineNum = 1;
        for (let i = 0; i < lines.length; i++) {
          cumulative += lines[i].length + 1; // +1 for newline
          if (cumulative > charIndex) {
            lineNum = i + 1;
            break;
          }
        }

        unsafeKeySet.add(keyName);
        details.push({
          key: keyName,
          rawValue: numStr,
          line: lineNum,
          message: `Number ${numStr} exceeds 64-bit MAX_SAFE_INTEGER. Standard JSON.parse() will corrupt it.`,
        });
      }
    } catch {
      // Not a valid BigInt
    }
  }

  return {
    hasUnsafeIntegers: details.length > 0,
    count: details.length,
    unsafeKeys: Array.from(unsafeKeySet),
    details,
  };
}

/**
 * Lossless JSON Prettify/Format that preserves exact BigInt digits without precision truncation.
 */
export function formatPreservingBigInt(rawJson: string, space = 2): string {
  try {
    // 1. Scan for raw unsafe integers
    const report = scanPrecisionGuard(rawJson);
    if (!report.hasUnsafeIntegers) {
      const parsed = JSON.parse(rawJson);
      return JSON.stringify(parsed, null, space);
    }

    // 2. Replace raw BigInt numbers with unique string token placeholders: "__BIGINT_TOKEN_<index>__"
    const tokens: string[] = [];
    let tokenized = rawJson.replace(/(-?\b\d{15,}\b)(?!\.\d|[eE][+-]?\d)/g, (match) => {
      try {
        const bi = BigInt(match);
        if (bi > MAX_SAFE || bi < MIN_SAFE) {
          const tokenIndex = tokens.length;
          tokens.push(match);
          return `"__BIGINT_TOKEN_${tokenIndex}__"`;
        }
      } catch {
        // Fallback
      }
      return match;
    });

    // 3. Format with standard JSON.stringify
    const parsed = JSON.parse(tokenized);
    let formatted = JSON.stringify(parsed, null, space);

    // 4. Restore exact digits (removing the quotes around the token)
    tokens.forEach((origDigits, idx) => {
      const placeholder = `"__BIGINT_TOKEN_${idx}__"`;
      formatted = formatted.replace(placeholder, origDigits);
    });

    return formatted;
  } catch {
    // Fallback if not valid JSON
    return rawJson;
  }
}

/**
 * Lossless JSON Minify that preserves exact BigInt digits.
 */
export function minifyPreservingBigInt(rawJson: string): string {
  return formatPreservingBigInt(rawJson, 0).replace(/\n/g, '');
}
