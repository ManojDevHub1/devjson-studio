/**
 * Utility to update a value inside a JSON structure by its dot/bracket path
 * and return the formatted JSON string.
 */

export function updateValueByPath(
  rawJson: string,
  path: string,
  rawInput: string
): { newJson: string; success: boolean; error?: string } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch (err) {
    return { newJson: rawJson, success: false, error: 'Cannot update invalid JSON' };
  }

  // Parse path: root.a.b[0].c -> ['a', 'b', 0, 'c']
  const cleanPath = path.replace(/^root(\.|\/)?/, '');
  if (!cleanPath) {
    return { newJson: rawJson, success: false };
  }

  // Tokenize path handling brackets: [0] or ["key"]
  const tokens: (string | number)[] = [];
  const parts = cleanPath.split(/\.|\b(?=\[)/g).filter(Boolean);

  for (const part of parts) {
    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1).replace(/^["']|["']$/g, '');
      const num = parseInt(inner, 10);
      tokens.push(isNaN(num) ? inner : num);
    } else {
      tokens.push(part);
    }
  }

  // Deep clone to avoid in-place mutation issues
  const cloned = JSON.parse(JSON.stringify(parsed));
  let current: any = cloned;

  for (let i = 0; i < tokens.length - 1; i++) {
    const key = tokens[i];
    if (current === null || current === undefined) {
      return { newJson: rawJson, success: false, error: 'Path not found' };
    }
    current = current[key];
  }

  const lastKey = tokens[tokens.length - 1];
  if (current === null || current === undefined || lastKey === undefined) {
    return { newJson: rawJson, success: false, error: 'Path not found' };
  }

  const existingVal = current[lastKey];
  let convertedValue: unknown = rawInput;

  // Type inference preservation
  if (typeof existingVal === 'number') {
    const num = Number(rawInput);
    convertedValue = isNaN(num) ? rawInput : num;
  } else if (typeof existingVal === 'boolean') {
    convertedValue = rawInput.toLowerCase() === 'true' || rawInput === '1';
  } else if (existingVal === null) {
    if (rawInput === 'null') convertedValue = null;
    else if (!isNaN(Number(rawInput))) convertedValue = Number(rawInput);
    else if (rawInput === 'true' || rawInput === 'false') convertedValue = rawInput === 'true';
    else convertedValue = rawInput;
  }

  current[lastKey] = convertedValue;

  return {
    newJson: JSON.stringify(cloned, null, 2),
    success: true,
  };
}
