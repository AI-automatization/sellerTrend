/**
 * generate-db-docs.ts
 *
 * Parses apps/api/prisma/schema.prisma and generates docs/DATABASE.md
 * with model tables, enum listings, relations, and a Mermaid ER diagram.
 *
 * Usage: npx tsx scripts/generate-db-docs.ts
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface FieldInfo {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  attributes: string[];
  comment: string;
}

interface ModelInfo {
  name: string;
  tableName: string;
  fields: FieldInfo[];
  indexes: string[];
  uniqueConstraints: string[];
  comment: string;
  section: string;
}

interface EnumInfo {
  name: string;
  values: string[];
}

interface RelationInfo {
  from: string;
  to: string;
  field: string;
  type: 'one-to-many' | 'one-to-one' | 'many-to-many';
  onDelete: string;
  relationName: string;
}

// ---------------------------------------------------------------------------
// Path resolution
// ---------------------------------------------------------------------------

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SCHEMA_PATH = resolve(ROOT, 'apps/api/prisma/schema.prisma');
const OUTPUT_PATH = resolve(ROOT, 'docs/DATABASE.md');

// ---------------------------------------------------------------------------
// Parse helpers
// ---------------------------------------------------------------------------

function stripInlineComment(line: string): { cleaned: string; comment: string } {
  // Match // comments that are NOT inside strings
  const match = line.match(/^(.*?)\s*\/\/\s*(.*)$/);
  if (match) {
    return { cleaned: match[1].trimEnd(), comment: match[2].trim() };
  }
  return { cleaned: line, comment: '' };
}

/**
 * Pre-scan the schema for section header blocks:
 *   // ============
 *   // SECTION NAME
 *   // ============
 *
 * Returns an array of { line, name } sorted by line number.
 */
function parseSectionHeaders(lines: string[]): Array<{ line: number; name: string }> {
  const headers: Array<{ line: number; name: string }> = [];
  for (let i = 0; i < lines.length - 2; i++) {
    const a = lines[i].trim();
    const b = lines[i + 1].trim();
    const c = lines[i + 2].trim();
    if (
      a.startsWith('// ====') &&
      b.startsWith('//') && !b.startsWith('// ====') &&
      c.startsWith('// ====')
    ) {
      const name = b.replace(/^\/\/\s*/, '').trim();
      if (name.length > 0) {
        headers.push({ line: i, name });
      }
    }
  }
  return headers;
}

function getSectionForLine(lineIndex: number, sectionHeaders: Array<{ line: number; name: string }>): string {
  let currentSection = '';
  for (const header of sectionHeaders) {
    if (header.line <= lineIndex) {
      currentSection = header.name;
    } else {
      break;
    }
  }
  return currentSection;
}

function parseAttributes(cleaned: string, fieldName: string): string[] {
  const attrs: string[] = [];
  // Match @xxx or @@xxx with balanced parentheses (supports nesting like @default(uuid()))
  const len = cleaned.length;
  let pos = 0;
  while (pos < len) {
    // Find next @ that starts an attribute
    const atIdx = cleaned.indexOf('@', pos);
    if (atIdx === -1) break;

    // Read attribute name: @word or @@word (with optional dots like @db.VarChar)
    let end = atIdx + 1;
    if (end < len && cleaned[end] === '@') end++; // handle @@
    while (end < len && /[\w.]/.test(cleaned[end])) end++;

    const attrName = cleaned.slice(atIdx, end);

    // If followed by '(', read balanced parens
    if (end < len && cleaned[end] === '(') {
      let depth = 0;
      const parenStart = end;
      while (end < len) {
        if (cleaned[end] === '(') depth++;
        else if (cleaned[end] === ')') {
          depth--;
          if (depth === 0) { end++; break; }
        }
        end++;
      }
      const full = cleaned.slice(atIdx, end);
      if (!full.startsWith('@@')) {
        attrs.push(full);
      }
    } else {
      if (!attrName.startsWith('@@') && attrName.length > 1) {
        attrs.push(attrName);
      }
    }
    pos = end;
  }
  return attrs;
}

function parseFieldType(typeToken: string): { baseType: string; isOptional: boolean; isArray: boolean } {
  let isOptional = false;
  let isArray = false;
  let baseType = typeToken;

  if (baseType.endsWith('?')) {
    isOptional = true;
    baseType = baseType.slice(0, -1);
  }
  if (baseType.endsWith('[]')) {
    isArray = true;
    baseType = baseType.slice(0, -2);
  }

  return { baseType, isOptional, isArray };
}

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

function parseSchema(schemaText: string): {
  models: ModelInfo[];
  enums: EnumInfo[];
  relations: RelationInfo[];
} {
  const lines = schemaText.split('\n');
  const models: ModelInfo[] = [];
  const enums: EnumInfo[] = [];
  const relations: RelationInfo[] = [];

  const sectionHeaders = parseSectionHeaders(lines);

  let i = 0;
  while (i < lines.length) {
    const trimmed = lines[i].trim();

    // Parse model
    const modelMatch = trimmed.match(/^model\s+(\w+)\s*\{/);
    if (modelMatch) {
      const modelName = modelMatch[1];
      const section = getSectionForLine(i, sectionHeaders);
      const fields: FieldInfo[] = [];
      const indexes: string[] = [];
      const uniqueConstraints: string[] = [];
      let tableName = modelName;
      let modelComment = '';
      i++;

      while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '}') {
          i++;
          break;
        }

        // Skip empty lines
        if (line === '') {
          i++;
          continue;
        }

        // Full-line comment inside model — skip but capture if relevant
        if (line.startsWith('//')) {
          i++;
          continue;
        }

        // @@map
        const mapMatch = line.match(/@@map\("([^"]+)"\)/);
        if (mapMatch) {
          tableName = mapMatch[1];
          i++;
          continue;
        }

        // @@index
        const indexMatch = line.match(/@@index\(\[([^\]]+)\]\)/);
        if (indexMatch) {
          indexes.push(indexMatch[1].replace(/"/g, ''));
          i++;
          continue;
        }

        // @@unique
        const uniqueMatch = line.match(/@@unique\(\[([^\]]+)\]\)/);
        if (uniqueMatch) {
          uniqueConstraints.push(uniqueMatch[1].replace(/"/g, ''));
          i++;
          continue;
        }

        // Parse field line
        const { cleaned, comment } = stripInlineComment(line);
        if (cleaned.length === 0) {
          i++;
          continue;
        }

        // Split tokens: field_name Type @attrs...
        const tokens = cleaned.split(/\s+/);
        if (tokens.length >= 2) {
          const fieldName = tokens[0];
          const rawType = tokens[1];

          // Skip @@-level directives already handled above
          if (fieldName.startsWith('@@')) {
            i++;
            continue;
          }

          // Skip Unsupported types (commented out pgvector etc.)
          if (rawType.startsWith('Unsupported')) {
            i++;
            continue;
          }

          const { baseType, isOptional, isArray } = parseFieldType(rawType);
          const attrs = parseAttributes(cleaned, fieldName);

          fields.push({
            name: fieldName,
            type: baseType,
            isOptional,
            isArray,
            attributes: attrs,
            comment,
          });

          // Detect relations
          const relationAttr = cleaned.match(/@relation\(([^)]+)\)/);
          if (relationAttr) {
            const relContent = relationAttr[1];
            const fieldsMatch = relContent.match(/fields:\s*\[([^\]]+)\]/);
            const refsMatch = relContent.match(/references:\s*\[([^\]]+)\]/);
            const onDeleteMatch = relContent.match(/onDelete:\s*(\w+)/);
            const nameMatch = relContent.match(/"([^"]+)"/);

            if (fieldsMatch && refsMatch) {
              const isOneToOne = !isArray && !isOptional && !rawType.endsWith('[]');
              relations.push({
                from: modelName,
                to: baseType,
                field: fieldsMatch[1].trim(),
                type: 'one-to-many',
                onDelete: onDeleteMatch ? onDeleteMatch[1] : 'none',
                relationName: nameMatch ? nameMatch[1] : '',
              });
            }
          }
        }

        i++;
      }

      models.push({
        name: modelName,
        tableName,
        fields,
        indexes,
        uniqueConstraints,
        comment: modelComment,
        section,
      });
      continue;
    }

    // Parse enum
    const enumMatch = trimmed.match(/^enum\s+(\w+)\s*\{/);
    if (enumMatch) {
      const enumName = enumMatch[1];
      const values: string[] = [];
      i++;

      while (i < lines.length) {
        const line = lines[i].trim();
        if (line === '}') {
          i++;
          break;
        }
        if (line !== '' && !line.startsWith('//')) {
          values.push(line);
        }
        i++;
      }

      enums.push({ name: enumName, values });
      continue;
    }

    i++;
  }

  return { models, enums, relations };
}

// ---------------------------------------------------------------------------
// Detect relation fields that are "virtual" (no @relation with fields:)
// These are the "back-reference" side (e.g., products Product[])
// ---------------------------------------------------------------------------

function isRelationField(field: FieldInfo, models: ModelInfo[]): boolean {
  const modelNames = new Set(models.map((m) => m.name));
  return modelNames.has(field.type);
}

// ---------------------------------------------------------------------------
// Markdown generation
// ---------------------------------------------------------------------------

function formatType(field: FieldInfo): string {
  let t = field.type;
  if (field.isArray) t += '[]';
  if (field.isOptional) t += '?';
  return t;
}

function formatAttributes(attrs: string[]): string {
  if (attrs.length === 0) return '';
  return attrs
    .map((a) => '`' + a + '`')
    .join(' ');
}

function escapeMarkdown(text: string): string {
  return text.replace(/\|/g, '\\|');
}

function generateModelTable(model: ModelInfo, allModels: ModelInfo[]): string {
  const lines: string[] = [];

  // Separate scalar fields from relation fields
  const scalarFields = model.fields.filter((f) => !isRelationField(f, allModels) || f.attributes.some((a) => a.startsWith('@relation')));
  const relationBackRefs = model.fields.filter((f) => isRelationField(f, allModels) && !f.attributes.some((a) => a.startsWith('@relation')));

  lines.push(`### ${model.name}`);
  lines.push('');
  lines.push(`**Table:** \`${model.tableName}\``);
  lines.push('');
  lines.push('| Field | Type | Attributes | Description |');
  lines.push('|-------|------|------------|-------------|');

  for (const field of scalarFields) {
    const typStr = escapeMarkdown(formatType(field));
    const attrStr = escapeMarkdown(formatAttributes(field.attributes));
    const commentStr = escapeMarkdown(field.comment);
    lines.push(`| \`${field.name}\` | ${typStr} | ${attrStr} | ${commentStr} |`);
  }

  // List back-reference relation fields
  if (relationBackRefs.length > 0) {
    lines.push('');
    lines.push('**Relations (back-references):**');
    for (const rf of relationBackRefs) {
      const relName = rf.attributes.find((a) => a.startsWith('@relation'))
        ? ` (${rf.attributes.find((a) => a.startsWith('@relation'))})`
        : '';
      lines.push(`- \`${rf.name}\` -> \`${formatType(rf)}\`${relName}`);
    }
  }

  // Indexes
  if (model.indexes.length > 0) {
    lines.push('');
    lines.push('**Indexes:**');
    for (const idx of model.indexes) {
      lines.push(`- \`[${idx}]\``);
    }
  }

  // Unique constraints
  if (model.uniqueConstraints.length > 0) {
    lines.push('');
    lines.push('**Unique constraints:**');
    for (const uc of model.uniqueConstraints) {
      lines.push(`- \`[${uc}]\``);
    }
  }

  lines.push('');
  return lines.join('\n');
}

function generateEnumSection(enums: EnumInfo[]): string {
  const lines: string[] = [];
  lines.push('## Enums');
  lines.push('');

  for (const e of enums) {
    lines.push(`### ${e.name}`);
    lines.push('');
    lines.push('| Value |');
    lines.push('|-------|');
    for (const v of e.values) {
      lines.push(`| \`${v}\` |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function generateRelationsSection(relations: RelationInfo[]): string {
  const lines: string[] = [];
  lines.push('## Relations');
  lines.push('');
  lines.push('| From | To | FK Field | On Delete | Relation Name |');
  lines.push('|------|----|----------|-----------|---------------|');

  for (const r of relations) {
    const relName = r.relationName || '-';
    lines.push(`| ${r.from} | ${r.to} | \`${r.field}\` | ${r.onDelete} | ${relName} |`);
  }

  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Mermaid ER diagram
// ---------------------------------------------------------------------------

function generateMermaidDiagram(models: ModelInfo[], relations: RelationInfo[]): string {
  const lines: string[] = [];
  lines.push('## Entity-Relationship Diagram');
  lines.push('');
  lines.push('```mermaid');
  lines.push('erDiagram');

  // Group models by section for readability
  const sections = new Map<string, ModelInfo[]>();
  for (const m of models) {
    const key = m.section || 'Other';
    const list = sections.get(key) || [];
    list.push(m);
    sections.set(key, list);
  }

  // Emit model blocks with key fields only (id + foreign keys)
  for (const [section, sectionModels] of sections) {
    lines.push(`    %% --- ${section} ---`);
    for (const model of sectionModels) {
      lines.push(`    ${model.name} {`);
      for (const field of model.fields) {
        // Only show scalar fields (not relation back-refs) for readability
        if (isRelationField(field, models) && !field.attributes.some((a) => a.startsWith('@relation'))) {
          continue;
        }
        // Skip pure relation reference fields (the FK is already shown)
        if (isRelationField(field, models) && field.attributes.some((a) => a.startsWith('@relation'))) {
          continue;
        }
        // Map Prisma types to simple ER types
        let erType = field.type;
        switch (field.type) {
          case 'String': erType = 'string'; break;
          case 'Int': erType = 'int'; break;
          case 'BigInt': erType = 'bigint'; break;
          case 'Boolean': erType = 'boolean'; break;
          case 'DateTime': erType = 'datetime'; break;
          case 'Decimal': erType = 'decimal'; break;
          case 'Float': erType = 'float'; break;
          case 'Json': erType = 'json'; break;
          default: erType = field.type.toLowerCase(); break;
        }
        const pk = field.attributes.some((a) => a === '@id') ? 'PK' : '';
        const fk = field.name.endsWith('_id') && field.name !== 'id' ? 'FK' : '';
        const marker = pk || fk;
        const safeFieldName = field.name.replace(/[^a-zA-Z0-9_]/g, '_');
        if (marker) {
          lines.push(`        ${erType} ${safeFieldName} ${marker}`);
        } else {
          lines.push(`        ${erType} ${safeFieldName}`);
        }
      }
      lines.push('    }');
    }
  }

  lines.push('');

  // Emit relationships
  // Deduplicate: for named relations, use the one with fields: (the FK side)
  const seen = new Set<string>();
  for (const r of relations) {
    const key = r.relationName
      ? `${r.relationName}`
      : `${r.from}-${r.to}-${r.field}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const label = r.relationName || r.field;
    // Determine cardinality: FK side is many, target is one
    lines.push(`    ${r.to} ||--o{ ${r.from} : "${label}"`);
  }

  lines.push('```');
  lines.push('');
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Assemble the full document
// ---------------------------------------------------------------------------

function generateDocument(models: ModelInfo[], enums: EnumInfo[], relations: RelationInfo[]): string {
  const lines: string[] = [];
  const now = new Date().toISOString().slice(0, 10);

  lines.push('# VENTRA Database Schema');
  lines.push('');
  lines.push(`> Auto-generated from \`apps/api/prisma/schema.prisma\` on ${now}.`);
  lines.push('> Do not edit manually. Run \`pnpm db:docs\` to regenerate.');
  lines.push('');

  // Stats
  lines.push(`**Models:** ${models.length} | **Enums:** ${enums.length} | **Relations:** ${relations.length}`);
  lines.push('');

  // Table of contents
  lines.push('## Table of Contents');
  lines.push('');
  lines.push('### Models');
  lines.push('');

  const sectionOrder: string[] = [];
  const sectionMap = new Map<string, ModelInfo[]>();
  for (const m of models) {
    const sec = m.section || 'Other';
    if (!sectionMap.has(sec)) {
      sectionOrder.push(sec);
      sectionMap.set(sec, []);
    }
    sectionMap.get(sec)!.push(m);
  }

  for (const sec of sectionOrder) {
    const sectionModels = sectionMap.get(sec)!;
    lines.push(`**${sec}**`);
    for (const m of sectionModels) {
      lines.push(`- [${m.name}](#${m.name.toLowerCase()}) (\`${m.tableName}\`)`);
    }
    lines.push('');
  }

  lines.push('### Other');
  lines.push('');
  lines.push('- [Enums](#enums)');
  lines.push('- [Relations](#relations)');
  lines.push('- [ER Diagram](#entity-relationship-diagram)');
  lines.push('');
  lines.push('---');
  lines.push('');

  // Models grouped by section
  lines.push('## Models');
  lines.push('');
  for (const sec of sectionOrder) {
    lines.push(`#### ${sec}`);
    lines.push('');
    const sectionModels = sectionMap.get(sec)!;
    for (const model of sectionModels) {
      lines.push(generateModelTable(model, models));
    }
  }

  lines.push('---');
  lines.push('');

  // Enums
  lines.push(generateEnumSection(enums));
  lines.push('---');
  lines.push('');

  // Relations
  lines.push(generateRelationsSection(relations));
  lines.push('---');
  lines.push('');

  // Mermaid ER diagram
  lines.push(generateMermaidDiagram(models, relations));

  lines.push('---');
  lines.push('');
  lines.push(`*Generated by \`scripts/generate-db-docs.ts\` | ${now}*`);
  lines.push('');

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  console.log(`Reading schema from: ${SCHEMA_PATH}`);
  const schemaText = readFileSync(SCHEMA_PATH, 'utf-8');

  console.log('Parsing schema...');
  const { models, enums, relations } = parseSchema(schemaText);

  console.log(`Found ${models.length} models, ${enums.length} enums, ${relations.length} relations`);

  const markdown = generateDocument(models, enums, relations);

  writeFileSync(OUTPUT_PATH, markdown, 'utf-8');
  console.log(`Documentation written to: ${OUTPUT_PATH}`);
  console.log('Done.');
}

main();
