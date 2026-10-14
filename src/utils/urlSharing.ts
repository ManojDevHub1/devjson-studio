import LZString from 'lz-string';

export interface ShareResult {
  url: string;
  charCount: number;
  isOverLimit: boolean;
  compressedLength: number;
  originalLength: number;
  compressionRatio: string;
}

const MAX_SAFE_URL_LENGTH = 4000;

/**
 * Generate shareable URL with compressed JSON in hash
 */
export function generateShareUrl(rawJson: string): ShareResult {
  const originalLength = rawJson.length;
  const compressed = LZString.compressToEncodedURIComponent(rawJson);
  const compressedLength = compressed.length;
  
  const baseUrl = window.location.origin + window.location.pathname;
  const url = `${baseUrl}#data=${compressed}`;
  const charCount = url.length;
  const isOverLimit = charCount > MAX_SAFE_URL_LENGTH;
  
  const ratio = originalLength > 0 
    ? `${Math.round((1 - compressedLength / originalLength) * 100)}%` 
    : '0%';

  return {
    url,
    charCount,
    isOverLimit,
    compressedLength,
    originalLength,
    compressionRatio: ratio,
  };
}

/**
 * Extract and decompress JSON from URL hash if present
 */
export function extractJsonFromUrl(): string | null {
  try {
    const hash = window.location.hash;
    if (!hash || !hash.includes('data=')) {
      return null;
    }

    const match = hash.match(/data=([^&]+)/);
    if (!match || !match[1]) {
      return null;
    }

    const compressed = match[1];
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    if (decompressed && decompressed.trim()) {
      return decompressed;
    }
    return null;
  } catch (err) {
    console.error('Failed to decompress JSON from URL hash:', err);
    return null;
  }
}

/**
 * Clear the #data= from hash without full page reload
 */
export function clearHashData(): void {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
  } else {
    window.location.hash = '';
  }
}

/**
 * Download arbitrary content as a file
 */
export function downloadFile(content: string, filename: string, mimeType = 'application/json'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
