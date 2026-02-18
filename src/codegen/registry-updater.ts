/**
 * Updates block/section registry files by adding an import statement
 * and a registration call for a newly generated component.
 */

import * as fs from "fs";
import { kebabToPascal } from "../utils/naming";

/**
 * Add a block component import and registration to the block registry file.
 *
 * @param registryPath  Absolute path to block-registry.ts
 * @param typeName      The kebab-case block type (e.g. "pricing-card")
 */
export function addToBlockRegistry(
  registryPath: string,
  typeName: string
): void {
  const pascal = kebabToPascal(typeName);
  const componentName = `${pascal}Block`;
  const importPath = `@/components/blocks/${typeName}`;

  const importLine = `import { ${componentName} } from "${importPath}";`;
  const registerLine = `blockRegistry.register("${typeName}", ${componentName});`;

  updateRegistryFile(registryPath, importLine, registerLine);
}

/**
 * Add a section component import and registration to the section registry file.
 *
 * @param registryPath  Absolute path to section-registry.ts
 * @param typeName      The kebab-case section type (e.g. "pricing-table")
 */
export function addToSectionRegistry(
  registryPath: string,
  typeName: string
): void {
  const pascal = kebabToPascal(typeName);
  const componentName = `${pascal}Section`;
  const importPath = `@/components/sections/${typeName}`;

  const importLine = `import { ${componentName} } from "${importPath}";`;
  const registerLine = `sectionRegistry.register("${typeName}", ${componentName});`;

  updateRegistryFile(registryPath, importLine, registerLine);
}

/**
 * Insert an import line and a registration line into a registry file.
 *
 * Strategy:
 * 1. Check that the import and registration don't already exist.
 * 2. Find the "Custom Blocks/Sections" comment block at the end of the file.
 * 3. Insert the import at the end of the existing import section (before the
 *    first blank line after imports or before "// Create instance").
 * 4. Insert the registration line just before the closing comment block,
 *    or at the very end if no comment block is found.
 */
function updateRegistryFile(
  filePath: string,
  importLine: string,
  registerLine: string
): void {
  let content = fs.readFileSync(filePath, "utf-8");

  // Bail if already registered
  if (content.includes(registerLine)) {
    return;
  }

  // --- Insert the import ---
  // Find the last import statement and insert after it
  const importRegex = /^import .+$/gm;
  let lastImportMatch: RegExpExecArray | null = null;
  let match: RegExpExecArray | null;
  while ((match = importRegex.exec(content)) !== null) {
    lastImportMatch = match;
  }

  if (lastImportMatch) {
    const insertPos = lastImportMatch.index + lastImportMatch[0].length;
    content =
      content.slice(0, insertPos) +
      "\n" +
      importLine +
      content.slice(insertPos);
  } else {
    // No imports found; prepend
    content = importLine + "\n" + content;
  }

  // --- Insert the registration ---
  // Look for the "Custom Blocks" or "Custom Sections" comment block
  const customCommentIndex = content.indexOf("/**\n * Custom ");
  if (customCommentIndex !== -1) {
    // Insert just before the comment block, with a blank line
    content =
      content.slice(0, customCommentIndex) +
      registerLine +
      "\n\n" +
      content.slice(customCommentIndex);
  } else {
    // Append at end
    content = content.trimEnd() + "\n" + registerLine + "\n";
  }

  fs.writeFileSync(filePath, content, "utf-8");
}
