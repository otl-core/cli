/**
 * `otl-cli upgrade` command.
 *
 * Fetches the diff between the current engine version and the latest
 * stable release, applies it as a patch, and updates .otl-engine-version.
 */

import type { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const VERSION_FILE = ".otl-engine-version";
const REPO = "otl-core/engine-next";

function getCurrentVersion(): string | null {
  const versionPath = path.resolve(process.cwd(), VERSION_FILE);
  if (!fs.existsSync(versionPath)) return null;
  return fs.readFileSync(versionPath, "utf-8").trim();
}

async function getLatestRelease(): Promise<string | null> {
  const res = await fetch(
    `https://api.github.com/repos/${REPO}/releases/latest`,
    { headers: { Accept: "application/vnd.github.v3+json" } },
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { tag_name: string };
  return data.tag_name;
}

async function fetchDiff(from: string, to: string): Promise<string | null> {
  const url = `https://github.com/${REPO}/compare/${from}...${to}.diff`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.text();
}

export function registerUpgradeCommand(program: Command): void {
  program
    .command("upgrade")
    .description("Update the engine to the latest stable version")
    .option("--dry-run", "Show what would change without applying")
    .action(async (opts: { dryRun?: boolean }) => {
      try {
        const currentVersion = getCurrentVersion();
        if (!currentVersion) {
          console.error(
            `Error: ${VERSION_FILE} not found. Are you in an OTL Engine project?`,
          );
          process.exit(1);
        }

        console.log(`Current version: ${currentVersion}`);
        console.log("Checking for updates...");

        const latest = await getLatestRelease();
        if (!latest) {
          console.error("Error: Could not fetch latest release.");
          process.exit(1);
        }

        if (latest === currentVersion) {
          console.log(`Already up to date (${currentVersion}).`);
          return;
        }

        console.log(`New version available: ${latest}`);
        console.log(`Fetching changes ${currentVersion} -> ${latest}...`);

        const diff = await fetchDiff(currentVersion, latest);
        if (!diff) {
          console.error("Error: Could not fetch diff between versions.");
          process.exit(1);
        }

        if (!diff.trim()) {
          console.log("No file changes between versions.");
          return;
        }

        if (opts.dryRun) {
          console.log("\n--- Dry run (changes not applied) ---\n");
          console.log(diff);
          return;
        }

        // Write diff to temp file and apply
        const tmpDiff = path.resolve(process.cwd(), ".otl-upgrade.patch");
        fs.writeFileSync(tmpDiff, diff, "utf-8");

        try {
          execSync(`git apply --3way "${tmpDiff}"`, {
            cwd: process.cwd(),
            stdio: "inherit",
          });
          console.log("\nPatch applied successfully.");
        } catch {
          console.log(
            "\nPatch applied with conflicts. Resolve them, then commit.",
          );
        } finally {
          fs.unlinkSync(tmpDiff);
        }

        // Update version file
        const versionPath = path.resolve(process.cwd(), VERSION_FILE);
        fs.writeFileSync(versionPath, latest + "\n", "utf-8");

        console.log(`\nUpdated ${VERSION_FILE} to ${latest}.`);
        console.log("Review the changes, then commit when ready.");
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });
}
