/**
 * Smart Input Unwrapper Utility
 * Detects and unwraps:
 * 1. Escaped / Stringified JSON (e.g. "\"{\\\"id\\\":1}\"")
 * 2. JWT Tokens (header.payload.signature base64url)
 * 3. cURL commands (extracts body, method, url, and headers)
 * 4. URL query strings (?id=123&role=admin)
 */

export type UnwrapperType = 'escaped_json' | 'jwt' | 'curl' | 'query_string';

export interface CurlParsedData {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
}

export interface UnwrapperCandidate {
  type: UnwrapperType;
  title: string;
  actionLabel: string;
  description: string;
  unwrappedJson: string;
  curlData?: CurlParsedData;
}

/**
 * Safe base64url decoder
 */
function decodeBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    try {
      // Decode UTF-8 correctly
      return decodeURIComponent(
        Array.prototype.map
          .call(decoded, (c: string) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
    } catch {
      return decoded;
    }
  } catch {
    return '';
  }
}

/**
 * 1. Detect and parse Escaped / Stringified JSON
 */
function tryUnwrapEscapedJson(input: string): UnwrapperCandidate | null {
  const trimmed = input.trim();
  // Check if string starts and ends with quotes or contains heavily escaped quotes \\"
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.includes('\\"')) ||
    (trimmed.includes('\\"') && !trimmed.startsWith('{') && !trimmed.startsWith('['))
  ) {
    try {
      // First unescape JSON string
      const parsedOnce = JSON.parse(trimmed);
      if (typeof parsedOnce === 'string') {
        const parsedTwice = JSON.parse(parsedOnce);
        if (typeof parsedTwice === 'object' && parsedTwice !== null) {
          return {
            type: 'escaped_json',
            title: 'Escaped / Stringified JSON Detected',
            actionLabel: 'Unescape & Format JSON',
            description: 'Double-stringified JSON was detected. Click to parse and unescape.',
            unwrappedJson: JSON.stringify(parsedTwice, null, 2),
          };
        }
      }
    } catch {
      // Try naive unescape
      try {
        let unescaped = trimmed;
        if (unescaped.startsWith('"') && unescaped.endsWith('"')) {
          unescaped = unescaped.slice(1, -1);
        }
        unescaped = unescaped.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        const parsed = JSON.parse(unescaped);
        if (typeof parsed === 'object' && parsed !== null) {
          return {
            type: 'escaped_json',
            title: 'Escaped JSON Detected',
            actionLabel: 'Unescape & Format JSON',
            description: 'Escaped quotes were detected. Click to restore valid JSON structure.',
            unwrappedJson: JSON.stringify(parsed, null, 2),
          };
        }
      } catch {
        // Not valid
      }
    }
  }
  return null;
}

/**
 * 2. Detect and decode JWT Token
 */
function tryUnwrapJwt(input: string): UnwrapperCandidate | null {
  const trimmed = input.trim();
  // JWT regex: 3 segments separated by dots
  const jwtRegex = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  if (jwtRegex.test(trimmed)) {
    const parts = trimmed.split('.');
    if (parts.length === 3) {
      try {
        const headerStr = decodeBase64Url(parts[0]);
        const payloadStr = decodeBase64Url(parts[1]);
        const header = JSON.parse(headerStr);
        const payload = JSON.parse(payloadStr);

        const combined = {
          _jwtHeader: header,
          ...payload,
        };

        return {
          type: 'jwt',
          title: 'JWT Bearer Token Detected',
          actionLabel: 'Decode JWT Payload to JSON',
          description: `Decoded claims for ${payload.sub || payload.email || payload.name || 'user'}.`,
          unwrappedJson: JSON.stringify(combined, null, 2),
        };
      } catch {
        // Not a decodable JWT
      }
    }
  }
  return null;
}

/**
 * 3. Detect and parse cURL command
 */
function tryUnwrapCurl(input: string): UnwrapperCandidate | null {
  const trimmed = input.trim();
  if (trimmed.startsWith('curl ') || trimmed.startsWith('curl\n') || trimmed.includes('--data-raw') || trimmed.includes('--data-binary')) {
    try {
      let url = 'https://api.example.com/v1/endpoint';
      let method = 'GET';
      const headers: Record<string, string> = {};
      let body: string | null = null;

      // Extract URL
      const urlMatch = trimmed.match(/curl\s+(?:-[A-Za-z0-9-]+\s+)*['"]?(https?:\/\/[^\s'"]+)/i);
      if (urlMatch) {
        url = urlMatch[1];
      }

      // Extract Method
      const methodMatch = trimmed.match(/-X\s+['"]?([A-Z]+)['"]?/i);
      if (methodMatch) {
        method = methodMatch[1].toUpperCase();
      } else if (trimmed.includes('--data') || trimmed.includes('-d ') || trimmed.includes('--data-raw')) {
        method = 'POST';
      }

      // Extract Headers
      const headerRegex = /-H\s+['"]([^'"]+)['"]/gi;
      let hMatch;
      while ((hMatch = headerRegex.exec(trimmed)) !== null) {
        const headerLine = hMatch[1];
        const colonIdx = headerLine.indexOf(':');
        if (colonIdx > 0) {
          const key = headerLine.slice(0, colonIdx).trim();
          const val = headerLine.slice(colonIdx + 1).trim();
          headers[key] = val;
        }
      }

      // Extract Body
      const bodyRegex = /(?:--data-raw|--data-binary|--data|-d)\s+['"]([\s\S]*?)['"](?:\s+-[A-Za-z]|$)/i;
      const bMatch = trimmed.match(bodyRegex);
      if (bMatch) {
        body = bMatch[1];
      } else {
        // Fallback: look for JSON object inside curl
        const jsonMatch = trimmed.match(/(\{(?:[^{}]|(?:\{[^{}]*\}))*\})/s);
        if (jsonMatch) {
          body = jsonMatch[1];
        }
      }

      let parsedBodyJson = '{\n  "status": "extracted_from_curl"\n}';
      if (body) {
        try {
          const parsed = JSON.parse(body);
          parsedBodyJson = JSON.stringify(parsed, null, 2);
        } catch {
          parsedBodyJson = body;
        }
      }

      return {
        type: 'curl',
        title: 'cURL Command Detected',
        actionLabel: 'Extract cURL Payload to Editor',
        description: `Extracted ${method} ${url} with ${Object.keys(headers).length} headers.`,
        unwrappedJson: parsedBodyJson,
        curlData: {
          url,
          method,
          headers,
          body,
        },
      };
    } catch {
      // Failed to parse curl
    }
  }
  return null;
}

/**
 * 4. Detect and convert URL Query String
 */
function tryUnwrapQueryString(input: string): UnwrapperCandidate | null {
  const trimmed = input.trim();
  // Checks if input looks like a query string (e.g. "?a=1&b=2" or "a=1&b=2&c=3")
  if (
    (trimmed.startsWith('?') && trimmed.includes('=')) ||
    (!trimmed.startsWith('{') && !trimmed.startsWith('[') && trimmed.includes('&') && trimmed.includes('='))
  ) {
    try {
      const cleanStr = trimmed.startsWith('?') ? trimmed.slice(1) : trimmed;
      const params = new URLSearchParams(cleanStr);
      const result: Record<string, unknown> = {};

      let hasKeys = false;
      for (const [key, value] of params.entries()) {
        hasKeys = true;
        // Parse types: numbers, booleans, null
        let parsedVal: unknown = value;
        if (value === 'true') parsedVal = true;
        else if (value === 'false') parsedVal = false;
        else if (value === 'null') parsedVal = null;
        else if (!isNaN(Number(value)) && value.trim() !== '') parsedVal = Number(value);

        if (Object.prototype.hasOwnProperty.call(result, key)) {
          const existing = result[key];
          if (Array.isArray(existing)) {
            existing.push(parsedVal);
          } else {
            result[key] = [existing, parsedVal];
          }
        } else {
          result[key] = parsedVal;
        }
      }

      if (hasKeys && Object.keys(result).length >= 2) {
        return {
          type: 'query_string',
          title: 'URL Query String Detected',
          actionLabel: 'Convert Query String to JSON',
          description: `Parsed ${Object.keys(result).length} URL parameters into clean JSON.`,
          unwrappedJson: JSON.stringify(result, null, 2),
        };
      }
    } catch {
      // Not a query string
    }
  }
  return null;
}

/**
 * Master scanner function
 */
export function detectUnwrapperCandidate(input: string): UnwrapperCandidate | null {
  if (!input || input.trim().length < 5) return null;

  // Don't unwrap if already strictly valid JSON object or array
  try {
    const parsed = JSON.parse(input);
    if (typeof parsed === 'object' && parsed !== null) {
      return null;
    }
  } catch {
    // Continue inspection
  }

  return (
    tryUnwrapCurl(input) ||
    tryUnwrapJwt(input) ||
    tryUnwrapEscapedJson(input) ||
    tryUnwrapQueryString(input)
  );
}
