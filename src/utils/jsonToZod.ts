/**
 * Converts JSON data into a clean, ready-to-use Zod schema.
 * Features:
 * - Standalone sub-schemas for nested objects for clean readability
 * - Infers TypeScript types using z.infer
 * - Handles nullable, optional, arrays, and mixed types
 */

export interface ZodGeneratorOptions {
  rootName?: string;
}

export function jsonToZod(data: unknown, options: ZodGeneratorOptions = {}): string {
  const rootBase = options.rootName || 'ApiResponse';
  // Schema name in camelCase ending in Schema: apiResponseSchema
  const rootSchemaName = rootBase.charAt(0).toLowerCase() + rootBase.slice(1) + 'Schema';
  const rootTypeName = rootBase.charAt(0).toUpperCase() + rootBase.slice(1);

  if (data === null || data === undefined) {
    return `import { z } from 'zod';\n\nexport const ${rootSchemaName} = z.null();\nexport type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
  }

  if (typeof data !== 'object') {
    const primitiveZod = typeof data === 'string' ? 'z.string()' : typeof data === 'number' ? 'z.number()' : 'z.boolean()';
    return `import { z } from 'zod';\n\nexport const ${rootSchemaName} = ${primitiveZod};\nexport type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
  }

  const schemas: Map<string, string> = new Map();
  const nameRegistry = new Set<string>();

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

    // lowercase first letter + Schema
    return candidate.charAt(0).toLowerCase() + candidate.slice(1) + 'Schema';
  }

  function getUniqueSchemaName(baseName: string): string {
    let name = sanitizeSchemaName(baseName);
    let counter = 2;
    while (nameRegistry.has(name)) {
      name = `${sanitizeSchemaName(baseName)}${counter++}`;
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

  function getZodType(val: unknown, keyContext: string): string {
    if (val === null) return 'z.null()';
    if (val === undefined) return 'z.undefined()';

    const type = typeof val;
    if (type === 'string') return 'z.string()';
    if (type === 'number') return 'z.number()';
    if (type === 'boolean') return 'z.boolean()';

    if (Array.isArray(val)) {
      if (val.length === 0) return 'z.array(z.unknown())';

      const itemTypes = new Set<string>();
      const objectItems: Record<string, unknown>[] = [];

      for (const item of val) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          objectItems.push(item as Record<string, unknown>);
        } else {
          itemTypes.add(getZodType(item, keyContext));
        }
      }

      if (objectItems.length > 0) {
        const schemaName = getUniqueSchemaName(keyContext);
        processMergedObjects(schemaName, objectItems);
        itemTypes.add(schemaName);
      }

      const typesArray = Array.from(itemTypes);
      if (typesArray.length === 1) {
        return `z.array(${typesArray[0]})`;
      }
      return `z.array(z.union([${typesArray.join(', ')}]))`;
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
        const t = getZodType(val, key);
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
      schemas.set(name, `export const ${name} = z.record(z.unknown());`);
    } else {
      schemas.set(name, `export const ${name} = z.object({\n${lines.join('\n')}\n});`);
    }
  }

  function processObject(name: string, obj: Record<string, unknown>) {
    const entries = Object.entries(obj);
    if (entries.length === 0) {
      schemas.set(name, `export const ${name} = z.record(z.unknown());`);
      return;
    }

    const lines: string[] = [];
    for (const [key, val] of entries) {
      const formattedKey = formatKey(key);
      const valType = getZodType(val, key);
      lines.push(`  ${formattedKey}: ${valType},`);
    }

    schemas.set(name, `export const ${name} = z.object({\n${lines.join('\n')}\n});`);
  }

  // Handle Root
  let output = `import { z } from 'zod';\n\n`;

  if (Array.isArray(data)) {
    if (data.length === 0) {
      output += `export const ${rootSchemaName} = z.array(z.unknown());\n`;
      output += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
      return output;
    }

    const itemType = getZodType(data, 'Item');
    const subDefs = Array.from(schemas.values()).join('\n\n');
    if (subDefs) {
      output += subDefs + '\n\n';
    }
    output += `export const ${rootSchemaName} = ${itemType};\n`;
    output += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
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
    output += `export type ${rootTypeName} = z.infer<typeof ${rootSchemaName}>;\n`;
    return output;
  }
}
