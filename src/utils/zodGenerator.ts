/**
 * Production-grade Zod Schema Generator with v3.0 customization controls.
 */

export interface ZodGeneratorOptions {
  rootName?: string;
  inferPatterns?: boolean;
  isStrict?: boolean;
  exportInferredType?: boolean;
}

export function generateZodSchema(data: unknown, options: ZodGeneratorOptions = {}): string {
  const rawRoot = (options.rootName || 'ApiResponse').trim();
  const rootBase = rawRoot.replace(/[^a-zA-Z0-9_]/g, '') || 'ApiResponse';
  const inferPatterns = options.inferPatterns ?? true;
  const isStrict = options.isStrict || false;
  const exportInferredType = options.exportInferredType ?? true;

  const rootSchemaName = rootBase.charAt(0).toLowerCase() + rootBase.slice(1) + 'Schema';
  const rootTypeName = rootBase.charAt(0).toUpperCase() + rootBase.slice(1);

  const strictModifier = isStrict ? '.strict()' : '';

  if (data === null || data === undefined) {
    let out = `import { z } from 'zod';\n\nexport const ${rootSchemaName} = z.null();\n`;
    if (exportInferredType) {
      out += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
    }
    return out;
  }

  if (typeof data !== 'object') {
    const primitiveZod = typeof data === 'string' ? 'z.string()' : typeof data === 'number' ? 'z.number()' : 'z.boolean()';
    let out = `import { z } from 'zod';\n\nexport const ${rootSchemaName} = ${primitiveZod};\n`;
    if (exportInferredType) {
      out += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
    }
    return out;
  }

  const schemas = new Map<string, string>();
  const nameRegistry = new Set<string>();

  function isEmail(str: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  }

  function isUrl(str: string): boolean {
    return /^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(str);
  }

  function isDatetime(str: string): boolean {
    return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?$/.test(str);
  }

  function isUuid(str: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
  }

  function sanitizeSchemaName(name: string): string {
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

    return candidate.charAt(0).toLowerCase() + candidate.slice(1) + 'Schema';
  }

  function getUniqueSchemaName(baseName: string): string {
    const clean = sanitizeSchemaName(baseName);
    let name = clean;
    let counter = 2;
    while (nameRegistry.has(name)) {
      name = `${clean}${counter++}`;
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

  function resolveZodType(val: unknown, keyContext: string): string {
    if (val === null) return 'z.null()';
    if (val === undefined) return 'z.undefined()';

    const valType = typeof val;
    if (valType === 'string') {
      const s = val as string;
      if (inferPatterns) {
        if (isEmail(s)) return 'z.string().email()';
        if (isUrl(s)) return 'z.string().url()';
        if (isDatetime(s)) return 'z.string().datetime()';
        if (isUuid(s)) return 'z.string().uuid()';
      }
      return 'z.string()';
    }
    if (valType === 'number') return 'z.number()';
    if (valType === 'boolean') return 'z.boolean()';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'z.array(z.unknown())';

      const itemTypes = new Set<string>();
      const objectItems: Record<string, unknown>[] = [];

      for (const item of val) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          objectItems.push(item as Record<string, unknown>);
        } else {
          itemTypes.add(resolveZodType(item, keyContext));
        }
      }

      if (objectItems.length > 0) {
        const schemaName = getUniqueSchemaName(keyContext);
        processMergedObjects(schemaName, objectItems);
        itemTypes.add(schemaName);
      }

      const typesList = Array.from(itemTypes);
      if (typesList.length === 1) {
        return `z.array(${typesList[0]})`;
      }
      return `z.array(z.union([${typesList.join(', ')}]))`;
    }

    if (typeof val === 'object') {
      const schemaName = getUniqueSchemaName(keyContext);
      processObject(schemaName, val as Record<string, unknown>);
      return schemaName;
    }

    return 'z.unknown()';
  }

  function processMergedObjects(name: string, objects: Record<string, unknown>[]) {
    const keyFrequency = new Map<string, number>();
    const keyTypes = new Map<string, Set<string>>();

    for (const obj of objects) {
      for (const [key, val] of Object.entries(obj)) {
        keyFrequency.set(key, (keyFrequency.get(key) || 0) + 1);
        if (!keyTypes.has(key)) {
          keyTypes.set(key, new Set());
        }
        const t = resolveZodType(val, key);
        keyTypes.get(key)!.add(t);
      }
    }

    const totalObjects = objects.length;
    const lines: string[] = [];

    for (const [key, freq] of keyFrequency.entries()) {
      const isOptional = freq < totalObjects;
      const formattedKey = formatKey(key);
      const types = Array.from(keyTypes.get(key) || ['z.unknown()']);
      let typeExpr = types.length === 1 ? types[0] : `z.union([${types.join(', ')}])`;
      if (isOptional) {
        typeExpr += '.optional()';
      }
      lines.push(`  ${formattedKey}: ${typeExpr},`);
    }

    if (lines.length === 0) {
      schemas.set(name, `export const ${name} = z.record(z.unknown())${strictModifier};`);
    } else {
      schemas.set(name, `export const ${name} = z.object({\n${lines.join('\n')}\n})${strictModifier};`);
    }
  }

  function processObject(name: string, obj: Record<string, unknown>) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      schemas.set(name, `export const ${name} = z.record(z.unknown())${strictModifier};`);
      return;
    }

    const lines: string[] = [];
    for (const [key, val] of entries) {
      const formattedKey = formatKey(key);
      const valType = resolveZodType(val, key);
      lines.push(`  ${formattedKey}: ${valType},`);
    }

    schemas.set(name, `export const ${name} = z.object({\n${lines.join('\n')}\n})${strictModifier};`);
  }

  // Handle Root
  let output = `import { z } from 'zod';\n\n`;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      output += `export const ${rootSchemaName} = z.array(z.unknown());\n`;
      if (exportInferredType) {
        output += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
      }
      return output;
    }

    const itemType = resolveZodType(data, 'Item');
    const subDefs = Array.from(schemas.values()).join('\n\n');
    if (subDefs) {
      output += subDefs + '\n\n';
    }
    output += `export const ${rootSchemaName} = ${itemType};\n`;
    if (exportInferredType) {
      output += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
    }
    return output;
  } else {
    nameRegistry.add(rootSchemaName);
    processObject(rootSchemaName, data as Record<string, unknown>);

    const rootDef = schemas.get(rootSchemaName);
    schemas.delete(rootSchemaName);

    const subDefs = Array.from(schemas.values());
    if (subDefs.length > 0) {
      output += subDefs.join('\n\n') + '\n\n';
    }
    if (rootDef) {
      output += rootDef + '\n\n';
    }
    if (exportInferredType) {
      output += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
    }
    return output;
  }
}
