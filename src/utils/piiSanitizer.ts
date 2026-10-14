/**
 * Client-side PII and Secret Sanitizer / Masking Engine.
 * Scans keys case-insensitively and replaces values with type-preserving dummy data.
 */

export interface SensitiveDetection {
  key: string;
  path: string;
  category: string;
}

const SENSITIVE_PATTERNS: { regex: RegExp; category: string }[] = [
  { regex: /password|passwd|pwd/i, category: 'Password' },
  { regex: /secret|client_secret|api_secret/i, category: 'Secret' },
  { regex: /jwt|token|access_token|refresh_token|bearer/i, category: 'Auth Token' },
  { regex: /api_?key|apikey|private_key/i, category: 'API Key' },
  { regex: /authorization|auth_header/i, category: 'Authorization' },
  { regex: /email|mail_address/i, category: 'Email' },
  { regex: /phone|mobile|cell|telephone/i, category: 'Phone' },
  { regex: /credit_?card|card_?number|cc_num|pan/i, category: 'Credit Card' },
  { regex: /cvv|cvc|security_code/i, category: 'CVV' },
  { regex: /ssn|social_security|tax_id/i, category: 'SSN/Tax ID' },
];

function getSafeDummyValue(key: string, originalVal: unknown): unknown {
  const k = key.toLowerCase();

  if (typeof originalVal === 'number') {
    if (k.includes('cvv') || k.includes('cvc')) return 123;
    if (k.includes('card') || k.includes('number')) return 42424242;
    return 100000;
  }

  if (typeof originalVal === 'boolean') {
    return true;
  }

  if (typeof originalVal === 'string') {
    if (k.includes('email')) return 'dev_user@example.com';
    if (k.includes('phone') || k.includes('mobile')) return '+1-555-0199';
    if (k.includes('jwt') || k.includes('token')) return 'eyJhbGciOi_REDACTED_TOKEN';
    if (k.includes('api_key') || k.includes('apikey')) return 'ak_live_REDACTED_SAFE_KEY';
    if (k.includes('credit') || k.includes('card')) return '4242-4242-4242-4242';
    if (k.includes('cvv') || k.includes('cvc')) return '123';
    if (k.includes('ssn')) return '123-45-6789';
    if (k.includes('password') || k.includes('secret')) return '••••••••••••';
    return '[REDACTED_SAFE_VALUE]';
  }

  return originalVal;
}

export function detectSensitiveKeys(data: unknown): SensitiveDetection[] {
  const detections: SensitiveDetection[] = [];

  function traverse(node: unknown, currentPath: string) {
    if (node === null || node === undefined || typeof node !== 'object') return;

    if (Array.isArray(node)) {
      node.forEach((item, idx) => traverse(item, `${currentPath}[${idx}]`));
    } else {
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        const nextPath = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
          ? `${currentPath}.${key}`
          : `${currentPath}["${key}"]`;

        const match = SENSITIVE_PATTERNS.find(p => p.regex.test(key));
        if (match && typeof val !== 'object') {
          detections.push({
            key,
            path: nextPath,
            category: match.category,
          });
        }

        traverse(val, nextPath);
      }
    }
  }

  traverse(data, 'root');
  return detections;
}

export function maskSecretsInPayload(raw: string): { maskedJson: string; count: number; paths: string[] } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { maskedJson: raw, count: 0, paths: [] };
  }

  let count = 0;
  const paths: string[] = [];

  function sanitize(node: unknown, currentPath: string): unknown {
    if (node === null || node === undefined) return node;

    if (Array.isArray(node)) {
      return node.map((item, idx) => sanitize(item, `${currentPath}[${idx}]`));
    }

    if (typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        const nextPath = `${currentPath}.${key}`;
        const match = SENSITIVE_PATTERNS.find(p => p.regex.test(key));

        if (match && typeof val !== 'object') {
          result[key] = getSafeDummyValue(key, val);
          count++;
          paths.push(nextPath);
        } else if (typeof val === 'object' && val !== null) {
          result[key] = sanitize(val, nextPath);
        } else {
          result[key] = val;
        }
      }
      return result;
    }

    return node;
  }

  const sanitizedData = sanitize(parsed, 'root');
  return {
    maskedJson: JSON.stringify(sanitizedData, null, 2),
    count,
    paths,
  };
}

/**
 * Selectively masks only specific chosen paths
 */
export function maskSelectedSecretsInPayload(raw: string, selectedPaths: string[]): { maskedJson: string; count: number } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { maskedJson: raw, count: 0 };
  }

  const pathSet = new Set(selectedPaths);
  let count = 0;

  function sanitize(node: unknown, currentPath: string): unknown {
    if (node === null || node === undefined) return node;

    if (Array.isArray(node)) {
      return node.map((item, idx) => sanitize(item, `${currentPath}[${idx}]`));
    }

    if (typeof node === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(node as Record<string, unknown>)) {
        const nextPath = `${currentPath}.${key}`;
        if (pathSet.has(nextPath) && typeof val !== 'object') {
          result[key] = getSafeDummyValue(key, val);
          count++;
        } else if (typeof val === 'object' && val !== null) {
          result[key] = sanitize(val, nextPath);
        } else {
          result[key] = val;
        }
      }
      return result;
    }

    return node;
  }

  const sanitizedData = sanitize(parsed, 'root');
  return {
    maskedJson: JSON.stringify(sanitizedData, null, 2),
    count,
  };
}
