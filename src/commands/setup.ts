/**
 * `otl-cli setup` command group.
 *
 * Placeholder commands for future engine scaffolding and deployment setup.
 */

import type { Command } from "commander";

export function registerSetupCommands(program: Command): void {
  const setup = program
    .command("setup")
    .description("Scaffold and configure OTL projects");

  setup
    .command("engine [name]")
    .description("Scaffold a new OTL engine project")
    .action(async (_name?: string) => {
      console.log("Engine scaffolding is not yet available.");
      console.log("This command will create a new OTL engine project.");
      process.exit(1);
    });

  setup
    .command("deployment")
    .description("Create and configure a new deployment")
    .action(async () => {
      console.log("Deployment setup is not yet available.");
      console.log(
        "This command will create a deployment and generate access tokens."
      );
      process.exit(1);
    });
}
