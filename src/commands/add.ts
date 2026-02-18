/**
 * `otl-cli add` command group.
 *
 * Generates block or section components from their schema definitions
 * and registers them in the appropriate registry file.
 */

import type { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { findBlockSchemaByType, findSectionSchemaByType } from "../api/client";
import { generateBlockComponent } from "../codegen/generate-block";
import { generateSectionComponent } from "../codegen/generate-section";
import {
  addToBlockRegistry,
  addToSectionRegistry,
} from "../codegen/registry-updater";
import { loadConfig } from "../utils/env";
import { requireEngineProject } from "../utils/project";

export function registerAddCommands(program: Command): void {
  const add = program
    .command("add")
    .description("Generate a component from a schema definition");

  add
    .command("block <name>")
    .description("Generate a block component from its schema")
    .option("--force", "Overwrite existing files")
    .action(async (name: string, opts: { force?: boolean }) => {
      try {
        const paths = requireEngineProject();
        const config = loadConfig();

        // Fetch schema
        const schema = await findBlockSchemaByType(config, name);
        if (!schema) {
          console.error(`Error: No block schema found with type "${name}".`);
          console.error(
            "Run 'npx @otl-core/cli list blocks' to see available schemas."
          );
          process.exit(1);
        }

        // Check output path
        const outputFile = path.join(paths.blocksDir, `${name}.tsx`);
        if (fs.existsSync(outputFile) && !opts.force) {
          console.error(
            `Error: ${path.relative(paths.root, outputFile)} already exists.`
          );
          console.error("Use --force to overwrite.");
          process.exit(1);
        }

        // Generate component
        const content = generateBlockComponent(name, schema.fields);

        // Ensure directory exists
        fs.mkdirSync(path.dirname(outputFile), { recursive: true });
        fs.writeFileSync(outputFile, content, "utf-8");

        const relPath = path.relative(paths.root, outputFile);
        console.log(`Created ${relPath}`);

        // Update registry
        if (fs.existsSync(paths.blockRegistryFile)) {
          addToBlockRegistry(paths.blockRegistryFile, name);
          console.log(
            `Updated ${path.relative(paths.root, paths.blockRegistryFile)}`
          );
        }

        console.log("");
        console.log(`Next: implement your component in ${relPath}`);
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });

  add
    .command("section <name>")
    .description("Generate a section component from its schema")
    .option("--force", "Overwrite existing files")
    .action(async (name: string, opts: { force?: boolean }) => {
      try {
        const paths = requireEngineProject();
        const config = loadConfig();

        // Fetch schema
        const schema = await findSectionSchemaByType(config, name);
        if (!schema) {
          console.error(`Error: No section schema found with type "${name}".`);
          console.error(
            "Run 'npx @otl-core/cli list sections' to see available schemas."
          );
          process.exit(1);
        }

        // Check output path
        const outputFile = path.join(paths.sectionsDir, `${name}.tsx`);
        if (fs.existsSync(outputFile) && !opts.force) {
          console.error(
            `Error: ${path.relative(paths.root, outputFile)} already exists.`
          );
          console.error("Use --force to overwrite.");
          process.exit(1);
        }

        // Generate component
        const content = generateSectionComponent(name, schema.fields);

        // Ensure directory exists
        fs.mkdirSync(path.dirname(outputFile), { recursive: true });
        fs.writeFileSync(outputFile, content, "utf-8");

        const relPath = path.relative(paths.root, outputFile);
        console.log(`Created ${relPath}`);

        // Update registry
        if (fs.existsSync(paths.sectionRegistryFile)) {
          addToSectionRegistry(paths.sectionRegistryFile, name);
          console.log(
            `Updated ${path.relative(paths.root, paths.sectionRegistryFile)}`
          );
        }

        console.log("");
        console.log(`Next: implement your component in ${relPath}`);
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });
}
