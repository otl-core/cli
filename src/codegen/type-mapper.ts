/**
 * Maps schema field types (InputFieldType from @otl-core/cms-types) to
 * TypeScript type strings used in generated component interfaces.
 *
 * Also tracks which imports from @otl-core/cms-types are needed.
 */

import type { SchemaField } from "../types";
import { fieldIdToCamel, kebabToPascal } from "../utils/naming";

export interface TypeImports {
  ColorReference: boolean;
  MediaReference: boolean;
  ResponsiveValue: boolean;
  BlockInstance: boolean;
  LocalizedString: boolean;
}

export function createEmptyImports(): TypeImports {
  return {
    ColorReference: false,
    MediaReference: false,
    ResponsiveValue: false,
    BlockInstance: false,
    LocalizedString: false,
  };
}

/**
 * Produce the import statement for @otl-core/cms-types based on which types
 * are actually used in the generated interface.
 */
export function buildTypeImportLine(imports: TypeImports): string | null {
  const needed: string[] = [];
  if (imports.ColorReference) needed.push("ColorReference");
  if (imports.MediaReference) needed.push("MediaReference");
  if (imports.ResponsiveValue) needed.push("ResponsiveValue");
  if (imports.BlockInstance) needed.push("BlockInstance");
  if (imports.LocalizedString) needed.push("LocalizedString");

  if (needed.length === 0) {
    return null;
  }
  return `import type { ${needed.join(", ")} } from "@otl-core/cms-types";`;
}

/** Simple field types that map directly to a TS primitive or literal. */
const SIMPLE_TYPE_MAP: Record<string, string> = {
  text: "string",
  textarea: "string",
  url: "string",
  markdown: "string",
  html: "string",
  code: "string",
  richtext: "string",
  date: "string",
  number: "number",
  boolean: "boolean",
  color: "string",
  "form-selector": "string",
  "form-page": "string",
  json: "Record<string, unknown>",
  object: "Record<string, unknown>",
  array: "unknown[]",
  "container-behavior": '"boxed" | "edged" | "ignore"',
};

/**
 * Resolve the TypeScript type string for a single schema field.
 * Mutates `imports` to track which types need importing.
 * Returns the TS type string (e.g. `"string"`, `"ColorReference"`, etc.).
 */
export function resolveFieldType(
  field: SchemaField,
  imports: TypeImports
): string {
  const simple = SIMPLE_TYPE_MAP[field.type];
  if (simple !== undefined) {
    return simple;
  }

  switch (field.type) {
    // Select can be single or multi
    case "select":
      return field.multiple ? "string[]" : "string";

    // Theme color types
    case "theme-color":
    case "theme-background-color":
    case "theme-foreground-color":
      imports.ColorReference = true;
      return "ColorReference";

    // Image / media
    case "image":
      imports.MediaReference = true;
      return "MediaReference";

    // Responsive value types
    case "spacing":
    case "css-value":
    case "columns": // GridColumnsInputField type is "columns"
      imports.ResponsiveValue = true;
      return "ResponsiveValue<string>";

    // Blocks
    case "blocks":
      imports.BlockInstance = true;
      return "BlockInstance[]";

    // Localized text
    case "localized-text":
      imports.LocalizedString = true;
      return "LocalizedString";

    // Group -- will be handled by the interface generator to produce a nested
    // interface. At the type level we return the interface name.
    case "group":
      return "__GROUP__";

    default:
      // Unknown field types fall back to unknown
      return "unknown";
  }
}

export interface GeneratedInterface {
  /** The main interface name (e.g. "PricingCardConfig") */
  name: string;
  /** All interface declarations (main + nested), joined as a string */
  declarations: string;
  /** Tracked imports */
  imports: TypeImports;
}

/**
 * Generate TypeScript interface declarations from a list of schema fields.
 *
 * @param interfaceName  The name for the top-level interface
 * @param fields         The schema fields to map
 */
export function generateInterface(
  interfaceName: string,
  fields: SchemaField[]
): GeneratedInterface {
  const imports = createEmptyImports();
  const extraInterfaces: string[] = [];

  const lines = buildInterfaceLines(
    interfaceName,
    fields,
    imports,
    extraInterfaces
  );

  const mainInterface = [`interface ${interfaceName} {`, ...lines, "}"].join(
    "\n"
  );

  const declarations = [...extraInterfaces, mainInterface].join("\n\n");

  return { name: interfaceName, declarations, imports };
}

function buildInterfaceLines(
  parentName: string,
  fields: SchemaField[],
  imports: TypeImports,
  extraInterfaces: string[]
): string[] {
  const lines: string[] = [];

  for (const field of fields) {
    const camelId = fieldIdToCamel(field.id);
    let tsType = resolveFieldType(field, imports);

    // Handle group fields -- generate a nested interface
    if (tsType === "__GROUP__" && field.fields && field.fields.length > 0) {
      const nestedName = parentName + kebabToPascal(field.id);
      const nestedLines = buildInterfaceLines(
        nestedName,
        field.fields,
        imports,
        extraInterfaces
      );
      const nestedDecl = [
        `interface ${nestedName} {`,
        ...nestedLines,
        "}",
      ].join("\n");
      extraInterfaces.push(nestedDecl);
      tsType = nestedName;
    } else if (tsType === "__GROUP__") {
      // Group with no sub-fields
      tsType = "Record<string, unknown>";
    }

    // Build the property line with optional JSDoc description
    if (field.description) {
      lines.push(`  /** ${field.description} */`);
    }
    lines.push(`  ${camelId}?: ${tsType};`);
  }

  return lines;
}
