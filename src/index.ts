#!/usr/bin/env node

/**
 * OTL CMS CLI
 *
 * Schema-driven component scaffolder for the OTL engine.
 */

import { Command } from "commander";
import { registerAddCommands } from "./commands/add";
import { registerCustomizeCommands } from "./commands/customize";
import { registerInitCommand } from "./commands/init";
import { registerListCommands } from "./commands/list";
import { registerUpgradeCommand } from "./commands/upgrade";
// import { registerSetupCommands } from "./commands/setup";

declare const __CLI_VERSION__: string;

const program = new Command();

program
  .name("otl-cli")
  .description("OTL CMS CLI -- scaffold and manage engine components")
  .version(__CLI_VERSION__);

// Register command groups
registerAddCommands(program);
registerCustomizeCommands(program);
registerListCommands(program);
registerInitCommand(program);
registerUpgradeCommand(program);
// registerSetupCommands(program);

program.parse();
