/**
 * Generates a block component .tsx file from a schema definition.
 */

import type { SchemaField } from "../types";
import { fieldIdToCamel, kebabToPascal } from "../utils/naming";
import { buildTypeImportLine, generateInterface } from "./type-mapper";

/**
 * Generate the full file content for a block component.
 *
 * @param typeName   The kebab-case schema type (e.g. "pricing-card")
 * @param fields     The schema field definitions
 * @returns The complete .tsx file content as a string
 */
export function generateBlockComponent(
  typeName: string,
  fields: SchemaField[]
): string {
  const pascal = kebabToPascal(typeName);
  const configName = `${pascal}Config`;
  const componentName = `${pascal}Block`;

  const result = generateInterface(configName, fields);

  // Build imports
  const importLines: string[] = [];

  const typeImportLine = buildTypeImportLine(result.imports);
  if (typeImportLine) {
    // Merge BlockComponentProps into the same import if there are other cms-types imports
    const typesInBraces = typeImportLine
      .replace("import type { ", "")
      .replace(' } from "@otl-core/cms-types";', "");
    importLines.push(
      `import type { BlockComponentProps, ${typesInBraces} } from "@otl-core/cms-types";`
    );
  } else {
    importLines.push(
      'import type { BlockComponentProps } from "@otl-core/cms-types";'
    );
  }

  // Build the config destructuring for the component body
  const fieldIds = fields
    .map(f => fieldIdToCamel(f.id))
    .filter(id => id.length > 0);

  const destructuring =
    fieldIds.length > 0 ? `  const { ${fieldIds.join(", ")} } = config;\n` : "";

  // Assemble the file
  const parts: string[] = [
    importLines.join("\n"),
    "",
    result.declarations,
    "",
    `export function ${componentName}({ config }: BlockComponentProps<${configName}>) {`,
    destructuring,
    "  return (",
    "    <div>",
    `      {/* TODO: Implement ${typeName} block */}`,
    "    </div>",
    "  );",
    "}",
    "",
  ];

  return parts.join("\n");
}
