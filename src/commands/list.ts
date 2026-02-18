/**
 * `otl-cli list` command group.
 *
 * Lists available block or section schemas for the configured deployment.
 */

import type { Command } from "commander";
import { fetchBlockSchemas, fetchSectionSchemas } from "../api/client";
import { loadConfig } from "../utils/env";

export function registerListCommands(program: Command): void {
  const list = program
    .command("list")
    .description("List available schemas for the deployment");

  list
    .command("blocks")
    .description("List all block schemas")
    .action(async () => {
      try {
        const config = loadConfig();
        const schemas = await fetchBlockSchemas(config);

        if (schemas.length === 0) {
          console.log("No block schemas found for this deployment.");
          return;
        }

        // Print header
        const typeCol = 24;
        const nameCol = 28;
        const fieldsCol = 8;
        console.log(
          padRight("TYPE", typeCol) +
            padRight("NAME", nameCol) +
            padRight("FIELDS", fieldsCol)
        );
        console.log("-".repeat(typeCol + nameCol + fieldsCol));

        for (const schema of schemas) {
          const fieldCount = schema.fields ? schema.fields.length : 0;
          console.log(
            padRight(schema.type, typeCol) +
              padRight(schema.name, nameCol) +
              String(fieldCount)
          );
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });

  list
    .command("sections")
    .description("List all section schemas")
    .action(async () => {
      try {
        const config = loadConfig();
        const schemas = await fetchSectionSchemas(config);

        if (schemas.length === 0) {
          console.log("No section schemas found for this deployment.");
          return;
        }

        const typeCol = 24;
        const nameCol = 28;
        const fieldsCol = 8;
        console.log(
          padRight("TYPE", typeCol) +
            padRight("NAME", nameCol) +
            padRight("FIELDS", fieldsCol)
        );
        console.log("-".repeat(typeCol + nameCol + fieldsCol));

        for (const schema of schemas) {
          const fieldCount = schema.fields ? schema.fields.length : 0;
          console.log(
            padRight(schema.type, typeCol) +
              padRight(schema.name, nameCol) +
              String(fieldCount)
          );
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });
}

/** Pad a string to a minimum width with trailing spaces. */
function padRight(str: string, width: number): string {
  if (str.length >= width) {
    return str + "  ";
  }
  return str + " ".repeat(width - str.length);
}
