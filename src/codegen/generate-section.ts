/**
 * Generates a section component .tsx file from a schema definition.
 */

import type { SchemaField } from "../types";
import { fieldIdToCamel, kebabToPascal } from "../utils/naming";
import { buildTypeImportLine, generateInterface } from "./type-mapper";

/**
 * Generate the full file content for a section component.
 *
 * @param typeName   The kebab-case schema type (e.g. "pricing-table")
 * @param fields     The schema field definitions
 * @returns The complete .tsx file content as a string
 */
export function generateSectionComponent(
  typeName: string,
  fields: SchemaField[]
): string {
  const pascal = kebabToPascal(typeName);
  const configName = `${pascal}Config`;
  const componentName = `${pascal}Section`;

  const result = generateInterface(configName, fields);

  // Build imports
  const importLines: string[] = [];

  const typeImportLine = buildTypeImportLine(result.imports);
  if (typeImportLine) {
    const typesInBraces = typeImportLine
      .replace("import type { ", "")
      .replace(' } from "@otl-core/cms-types";', "");
    importLines.push(
      `import type { SectionComponentProps, ${typesInBraces} } from "@otl-core/cms-types";`
    );
  } else {
    importLines.push(
      'import type { SectionComponentProps } from "@otl-core/cms-types";'
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
    `export function ${componentName}({ config }: SectionComponentProps<${configName}>) {`,
    destructuring,
    "  return (",
    "    <div>",
    `      {/* TODO: Implement ${typeName} section */}`,
    "    </div>",
    "  );",
    "}",
    "",
  ];

  return parts.join("\n");
}
