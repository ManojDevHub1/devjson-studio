export interface JsonMetrics {
  sizeBytes: number;
  formattedSize: string;
  totalKeys: number;
  maxDepth: number;
  objectsCount: number;
  arraysCount: number;
  linesCount: number;
  primitivesCount: number;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function calculateJsonMetrics(rawText: string, parsedData: unknown): JsonMetrics {
  const sizeBytes = new Blob([rawText]).size;
  const linesCount = rawText ? rawText.split('\n').length : 0;

  if (parsedData === null || parsedData === undefined || typeof parsedData !== 'object') {
    return {
      sizeBytes,
      formattedSize: formatBytes(sizeBytes),
      totalKeys: 0,
      maxDepth: parsedData !== undefined ? 1 : 0,
      objectsCount: 0,
      arraysCount: 0,
      linesCount,
      primitivesCount: parsedData !== undefined ? 1 : 0,
    };
  }

  let totalKeys = 0;
  let maxDepth = 0;
  let objectsCount = 0;
  let arraysCount = 0;
  let primitivesCount = 0;

  function traverse(node: unknown, depth: number) {
    if (depth > maxDepth) {
      maxDepth = depth;
    }

    if (Array.isArray(node)) {
      arraysCount++;
      for (const item of node) {
        if (typeof item === 'object' && item !== null) {
          traverse(item, depth + 1);
        } else {
          primitivesCount++;
          if (depth + 1 > maxDepth) maxDepth = depth + 1;
        }
      }
    } else if (node !== null && typeof node === 'object') {
      objectsCount++;
      const entries = Object.entries(node as Record<string, unknown>);
      totalKeys += entries.length;

      for (const [, val] of entries) {
        if (typeof val === 'object' && val !== null) {
          traverse(val, depth + 1);
        } else {
          primitivesCount++;
          if (depth + 1 > maxDepth) maxDepth = depth + 1;
        }
      }
    }
  }

  traverse(parsedData, 1);

  return {
    sizeBytes,
    formattedSize: formatBytes(sizeBytes),
    totalKeys,
    maxDepth,
    objectsCount,
    arraysCount,
    linesCount,
    primitivesCount,
  };
}
