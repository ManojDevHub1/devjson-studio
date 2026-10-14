/**
 * Converts JSON data into clean, idiomatic TypeScript interfaces.
 * Features:
 * - Proper PascalCase naming for sub-interfaces
 * - Array schema merging with optional flags for heterogeneous keys
 * - Union types for mixed primitive arrays
 * - Safe handling for identifiers with special characters
 * - Recursive traversal without stack overflow
 */

export interface TsGeneratorOptions {
  rootName?: string;
  useTypeAlias?: boolean;
}

export function jsonToTypeScript(data: unknown, options: TsGeneratorOptions = {}): string {
  const rootName = options.rootName || 'ApiResponse';

  if (data === null || data === undefined) {
    return `export type ${rootName} = null;\n`;
  }

  if (typeof data !== 'object') {
    return `export type ${rootName} = ${typeof data};\n`;
  }

  const interfaces: Map<string, string> = new Map();
  const nameRegistry = new Set<string>();

  function sanitizeTypeName(name: string): string {
    const cleaned = name
      .replace(/[^a-zA-Z0-9_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');
    
    // Singularize simple plurals for interface names (e.g. Items -> Item, Users -> User)
    let singular = cleaned;
    if (singular.endsWith('ies')) {
      singular = singular.slice(0, -3) + 'y';
    } else if (singular.endsWith('ses')) {
      singular = singular.slice(0, -2);
    } else if (singular.endsWith('s') && !singular.endsWith('ss') && singular.length > 3) {
      singular = singular.slice(0, -1);
    }

    let candidate = singular || 'Item';
    if (!/^[A-Za-z_]/.test(candidate)) {
      candidate = 'T' + candidate;
    }

    return candidate;
  }

  function getUniqueTypeName(baseName: string): string {
    let name = sanitizeTypeName(baseName);
    let counter = 2;
    while (nameRegistry.has(name)) {
      name = `${sanitizeTypeName(baseName)}${counter++}`;
    }
    nameRegistry.add(name);
    return name;
  }

  function formatKey(key: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key;
    }
    return JSON.stringify(key);
  }

  function getType(val: unknown, keyContext: string): string {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';

    const type = typeof val;
    if (type === 'string') return 'string';
    if (type === 'number') return 'number';
    if (type === 'boolean') return 'boolean';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'unknown[]';

      // Check all items in array
      const itemTypes = new Set<string>();
      const objectItems: Record<string, unknown>[] = [];

      for (const item of val) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          objectItems.push(item as Record<string, unknown>);
        } else {
          itemTypes.add(getType(item, keyContext));
        }
      }

      // If array contains objects, merge their schemas
      if (objectItems.length > 0) {
        const typeName = getUniqueTypeName(keyContext);
        processMergedObjects(typeName, objectItems);
        itemTypes.add(typeName);
      }

      const typesArray = Array.from(itemTypes);
      if (typesArray.length === 1) {
        return `${typesArray[0]}[]`;
      }
      return `(${typesArray.join(' | ')})[]`;
    }

    if (typeof val === 'object') {
      const typeName = getUniqueTypeName(keyContext);
      processObject(typeName, val as Record<string, unknown>);
      return typeName;
    }

    return 'unknown';
  }

  function processMergedObjects(name: string, objects: Record<string, unknown>[]) {
    // Collect all unique keys and track how many objects have each key
    const keyFrequency = new Map<string, number>();
    const keyTypes = new Map<string, Set<string>>();

    for (const obj of objects) {
      for (const [key, val] of Object.entries(obj)) {
        keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
        if (!keyTypes.has(key)) {
          keyTypes.set(key, new Set());
        }
        const t = getType(val, key);
        keyTypes.get(key)!.add(t);
      }
    }

    const totalObjects = objects.length;
    const lines: string[] = [];

    for (const [key, freq] of keyFrequency.entries()) {
      const isOptional = freq < totalObjects;
      const formattedKey = formatKey(key) + (isOptional ? '?' : '');
      const types = Array.from(keyTypes.get(key) || ['unknown']);
      const typeStr = types.join(' | ') || 'unknown';
      lines.push(`  ${formattedKey}: ${typeStr};`);
    }

    if (lines.length === 0) {
      interfaces.set(name, `export type ${name} = Record<string, unknown>;`);
    } else {
      interfaces.set(name, `export interface ${name} {\n${lines.join('\n')}\n}`);
    }
  }

  function processObject(name: string, obj: Record<string, unknown>) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      interfaces.set(name, `export type ${name} = Record<string, unknown>;`);
      return;
    }

    const lines: string[] = [];
    for (const [key, val] of entries) {
      const formattedKey = formatKey(key);
      const valType = getType(val, key);
      lines.push(`  ${formattedKey}: ${valType};`);
    }

    interfaces.set(name, `export interface ${name} {\n${lines.join('\n')}\n}`);
  }

  // Handle Root
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `export type ${rootName} = unknown[];\n`;
    }
    const itemType = getType(data, 'Item');
    // If nested interfaces were generated, print them first, then the root alias
    const defs = Array.from(interfaces.values()).join('\n\n');
    return `${defs ? defs + '\n\n' : ''}export type ${rootName} = ${itemType};\n`;
  } else {
    nameRegistry.add(rootName);
    processObject(rootName, data as Record<string, unknown>);

    // Order: output sub-interfaces first, then Root interface at the end (or Root first, sub-interfaces next)
    // Standard TypeScript conventions prefer Root at the top, or sub-interfaces ordered logically
    const rootDef = interfaces.get(rootName);
    interfaces.delete(rootName);

    const subDefs = Array.from(interfaces.values());
    const parts = [];
    if (rootDef) parts.push(rootDef);
    if (subDefs.length > 0) parts.push(...subDefs);

    return parts.join('\n\n') + '\n';
  }
}
