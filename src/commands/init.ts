/**
 * `otl-cli init` command.
 *
 * Interactive setup that writes DEPLOYMENT_ID, DEPLOYMENT_ACCESS_TOKEN,
 * and API_URL into .env.local.
 */

import type { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

export function registerInitCommand(program: Command): void {
  program
    .command("init")
    .description("Configure deployment credentials in .env.local")
    .action(async () => {
      try {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        const ask = (question: string): Promise<string> =>
          new Promise(resolve => {
            rl.question(question, answer => resolve(answer.trim()));
          });

        console.log("OTL CMS -- Engine Configuration");
        console.log("");

        const deploymentId = await ask("Deployment ID: ");
        if (!deploymentId) {
          console.error("Error: Deployment ID is required.");
          rl.close();
          process.exit(1);
        }

        const accessToken = await ask("Deployment Access Token: ");
        if (!accessToken) {
          console.error("Error: Access token is required.");
          rl.close();
          process.exit(1);
        }

        const apiUrlInput = await ask("API URL [http://localhost:8080]: ");
        const apiUrl = apiUrlInput || "http://localhost:8080";

        rl.close();

        // Write or update .env.local
        const envPath = path.resolve(process.cwd(), ".env.local");
        let content = "";

        if (fs.existsSync(envPath)) {
          content = fs.readFileSync(envPath, "utf-8");
          content = upsertEnvVar(content, "DEPLOYMENT_ID", deploymentId);
          content = upsertEnvVar(
            content,
            "DEPLOYMENT_ACCESS_TOKEN",
            accessToken
          );
          content = upsertEnvVar(content, "API_URL", apiUrl);
        } else {
          content = [
            "# OTL CMS Engine Configuration",
            `DEPLOYMENT_ID=${deploymentId}`,
            `DEPLOYMENT_ACCESS_TOKEN=${accessToken}`,
            `API_URL=${apiUrl}`,
            "",
          ].join("\n");
        }

        fs.writeFileSync(envPath, content, "utf-8");
        console.log("");
        console.log("Written to .env.local");
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });
}

/**
 * Update or insert an environment variable in a .env file string.
 * If the variable already exists, its value is replaced.
 * If it doesn't exist, it's appended at the end.
 */
function upsertEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  }
  // Ensure trailing newline before appending
  const base = content.endsWith("\n") ? content : content + "\n";
  return base + `${key}=${value}\n`;
}
