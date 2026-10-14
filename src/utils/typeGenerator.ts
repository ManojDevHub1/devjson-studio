/**
 * Production-grade TypeScript AST interface & type generator with v3.0 customization controls.
 */

export interface TypeGeneratorOptions {
  rootName?: string;
  exportKind?: 'interface' | 'type';
  exportKeyword?: boolean;
  readonlyProps?: boolean;
  allOptional?: boolean;
  includeComments?: boolean;
  unsafe64BitKeys?: string[];
}

export function generateTypeScriptTypes(data: unknown, options: TypeGeneratorOptions = {}): string {
  const rawRoot = (options.rootName || 'ApiResponse').trim();
  const rootName = rawRoot.charAt(0).toUpperCase() + rawRoot.slice(1).replace(/[^a-zA-Z0-9_]/g, '') || 'ApiResponse';
  const exportKind = options.exportKind || 'interface';
  const exportKeyword = options.exportKeyword ?? true;
  const readonlyProps = options.readonlyProps || false;
  const allOptional = options.allOptional || false;
  const includeComments = options.includeComments ?? true;

  const exportPrefix = exportKeyword ? 'export ' : '';
  const readonlyPrefix = readonlyProps ? 'readonly ' : '';

  if (data === null || data === undefined) {
    return `${exportPrefix}type ${rootName} = null;\n`;
  }

  if (typeof data !== 'object') {
    return `${exportPrefix}type ${rootName} = ${typeof data};\n`;
  }

  const typeDefinitions = new Map<string, string>();
  const registeredNames = new Set<string>();

  function isIsoDate(str: string): boolean {
    return /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/.test(str);
  }

  function isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  }

  function sanitizeTypeName(name: string): string {
    const cleaned = name
      .replace(/[^a-zA-Z0-9_]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join('');

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
    const clean = sanitizeTypeName(baseName);
    let name = clean;
    let counter = 2;
    while (registeredNames.has(name)) {
      name = `${clean}${counter++}`;
    }
    registeredNames.add(name);
    return name;
  }

  function formatKey(key: string): string {
    if (/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)) {
      return key;
    }
    return JSON.stringify(key);
  }

  function resolveType(val: unknown, keyContext: string): { typeString: string; comment?: string } {
    if (val === null) return { typeString: 'null' };
    if (val === undefined) return { typeString: 'undefined' };

    const valType = typeof val;
    if (valType === 'string') {
      const s = val as string;
      if (includeComments && isIsoDate(s)) {
        return { typeString: 'string', comment: 'ISO 8601 Date' };
      }
      if (includeComments && isUuid(s)) {
        return { typeString: 'string', comment: 'UUID format' };
      }
      return { typeString: 'string' };
    }
    if (valType === 'number') {
      if (options.unsafe64BitKeys?.includes(keyContext)) {
        return { typeString: 'number', comment: '⚠️ 64-bit integer: use string or BigInt' };
      }
      return { typeString: 'number' };
    }
    if (valType === 'boolean') return { typeString: 'boolean' };

    if (Array.isArray(val)) {
      if (val.length === 0) return { typeString: 'unknown[]' };

      const itemTypes = new Set<string>();
      const objectItems: Record<string, unknown>[] = [];

      for (const item of val) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          objectItems.push(item as Record<string, unknown>);
        } else {
          itemTypes.add(resolveType(item, keyContext).typeString);
        }
      }

      if (objectItems.length > 0) {
        const typeName = getUniqueTypeName(keyContext);
        processMergedObjects(typeName, objectItems);
        itemTypes.add(typeName);
      }

      const typesList = Array.from(itemTypes);
      if (typesList.length === 1) {
        return { typeString: `${typesList[0]}[]` };
      }
      return { typeString: `(${typesList.join(' | ')})[]` };
    }

    if (typeof val === 'object') {
      const typeName = getUniqueTypeName(keyContext);
      processObject(typeName, val as Record<string, unknown>);
      return { typeString: typeName };
    }

    return { typeString: 'unknown' };
  }

  function processMergedObjects(name: string, objects: Record<string, unknown>[]) {
    const keyFrequency = new Map<string, number>();
    const keyTypes = new Map<string, Set<string>>();
    const keyComments = new Map<string, string>();

    for (const obj of objects) {
      for (const [key, val] of Object.entries(obj)) {
        keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
        if (!keyTypes.has(key)) {
          keyTypes.set(key, new Set());
        }
        const resolved = resolveType(val, key);
        keyTypes.get(key)!.add(resolved.typeString);
        if (resolved.comment && !keyComments.has(key)) {
          keyComments.set(key, resolved.comment);
        }
      }
    }

    const totalObjects = objects.length;
    const lines: string[] = [];

    for (const [key, freq] of keyFrequency.entries()) {
      const isMissingInSome = freq < totalObjects;
      const isOptional = allOptional || isMissingInSome;
      const formattedKey = readonlyPrefix + formatKey(key) + (isOptional ? '?' : '');
      const types = Array.from(keyTypes.get(key) || ['unknown']);
      const typeStr = types.join(' | ') || 'unknown';
      const comment = keyComments.get(key) ? ` // ${keyComments.get(key)}` : '';
      lines.push(`  ${formattedKey}: ${typeStr};${comment}`);
    }

    if (lines.length === 0) {
      typeDefinitions.set(name, `${exportPrefix}type ${name} = Record<string, unknown>;`);
    } else {
      if (exportKind === 'interface') {
        typeDefinitions.set(name, `${exportPrefix}interface ${name} {\n${lines.join('\n')}\n}`);
      } else {
        typeDefinitions.set(name, `${exportPrefix}type ${name} = {\n${lines.join('\n')}\n};`);
      }
    }
  }

  function processObject(name: string, obj: Record<string, unknown>) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      typeDefinitions.set(name, `${exportPrefix}type ${name} = Record<string, unknown>;`);
      return;
    }

    const lines: string[] = [];
    for (const [key, val] of entries) {
      const formattedKey = readonlyPrefix + formatKey(key) + (allOptional ? '?' : '');
      const resolved = resolveType(val, key);
      const comment = resolved.comment ? ` // ${resolved.comment}` : '';
      lines.push(`  ${formattedKey}: ${resolved.typeString};${comment}`);
    }

    if (exportKind === 'interface') {
      typeDefinitions.set(name, `${exportPrefix}interface ${name} {\n${lines.join('\n')}\n}`);
    } else {
      typeDefinitions.set(name, `${exportPrefix}type ${name} = {\n${lines.join('\n')}\n};`);
    }
  }

  // Handle Root
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return `${exportPrefix}type ${rootName} = unknown[];\n`;
    }
    const itemType = resolveType(data, 'Item').typeString;
    const defs = Array.from(typeDefinitions.values()).join('\n\n');
    return `${defs ? defs + '\n\n' : ''}${exportPrefix}type ${rootName} = ${itemType};\n`;
  } else {
    registeredNames.add(rootName);
    processObject(rootName, data as Record<string, unknown>);

    const rootDef = typeDefinitions.get(rootName);
    typeDefinitions.delete(rootName);

    const subDefs = Array.from(typeDefinitions.values());
    const parts = [];
    if (rootDef) parts.push(rootDef);
    if (subDefs.length > 0) parts.push(...subDefs);

    return parts.join('\n\n') + '\n';
  }
}
