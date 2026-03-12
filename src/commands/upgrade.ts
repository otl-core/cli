/**
 * `otl-cli upgrade` command.
 *
 * Fetches the diff between the current engine version and the latest
 * stable release, applies source patches, and updates package.json
 * dependencies programmatically.
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

async function fetchPackageJson(
  tag: string,
): Promise<Record<string, unknown> | null> {
  const url = `https://raw.githubusercontent.com/${REPO}/${tag}/package.json`;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res.json() as Promise<Record<string, unknown>>;
}

function filterDiff(diff: string, excludeFiles: string[]): string {
  const lines = diff.split("\n");
  const result: string[] = [];
  let skip = false;

  for (const line of lines) {
    if (line.startsWith("diff --git")) {
      const match = line.match(/b\/(.+)$/);
      skip = match ? excludeFiles.includes(match[1]) : false;
    }
    if (!skip) {
      result.push(line);
    }
  }
  return result.join("\n");
}

function updatePackageJson(
  localPkg: Record<string, unknown>,
  sourcePkg: Record<string, unknown>,
  targetPkg: Record<string, unknown>,
): void {
  const localDeps = (localPkg.dependencies ?? {}) as Record<string, string>;
  const targetDeps = (targetPkg.dependencies ?? {}) as Record<string, string>;

  // Update @otl-core/* dependency versions
  for (const [key, value] of Object.entries(targetDeps)) {
    if (key.startsWith("@otl-core/") && key in localDeps) {
      localDeps[key] = value;
    }
  }

  // Add new dependencies from target
  for (const [key, value] of Object.entries(targetDeps)) {
    if (!(key in localDeps)) {
      localDeps[key] = value;
      console.log(`  Added dependency: ${key}@${value}`);
    }
  }

  // Remove deps that upstream removed (existed in source but not in target)
  const sourceDeps = (sourcePkg.dependencies ?? {}) as Record<string, string>;
  for (const key of Object.keys(localDeps)) {
    if (key in sourceDeps && !(key in targetDeps)) {
      delete localDeps[key];
      console.log(`  Removed dependency: ${key}`);
    }
  }

  localPkg.dependencies = localDeps;

  // Handle devDependencies the same way
  const localDevDeps = (localPkg.devDependencies ?? {}) as Record<
    string,
    string
  >;
  const sourceDevDeps = (sourcePkg.devDependencies ?? {}) as Record<
    string,
    string
  >;
  const targetDevDeps = (targetPkg.devDependencies ?? {}) as Record<
    string,
    string
  >;

  // Add new devDependencies from target
  for (const [key, value] of Object.entries(targetDevDeps)) {
    if (!(key in localDevDeps)) {
      localDevDeps[key] = value;
      console.log(`  Added devDependency: ${key}@${value}`);
    }
  }

  // Remove devDependencies that upstream removed
  for (const key of Object.keys(localDevDeps)) {
    if (key in sourceDevDeps && !(key in targetDevDeps)) {
      delete localDevDeps[key];
      console.log(`  Removed devDependency: ${key}`);
    }
  }

  // Update @otl-core/* devDependency versions
  for (const [key, value] of Object.entries(targetDevDeps)) {
    if (key.startsWith("@otl-core/") && key in localDevDeps) {
      localDevDeps[key] = value;
    }
  }

  localPkg.devDependencies = localDevDeps;

  // Update version
  if (targetPkg.version) {
    localPkg.version = targetPkg.version;
  }
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

        // Fetch diff, source and target package.json in parallel
        const [diff, sourcePkg, targetPkg] = await Promise.all([
          fetchDiff(currentVersion, latest),
          fetchPackageJson(currentVersion),
          fetchPackageJson(latest),
        ]);

        if (!diff) {
          console.error("Error: Could not fetch diff between versions.");
          process.exit(1);
        }

        if (opts.dryRun) {
          console.log("\n--- Dry run (changes not applied) ---\n");
          console.log(diff);
          return;
        }

        // 1. Apply source code patches (exclude package.json and .otl-engine-version)
        const sourceDiff = filterDiff(diff, [
          "package.json",
          ".otl-engine-version",
        ]);
        if (sourceDiff.trim()) {
          const tmpDiff = path.resolve(process.cwd(), ".otl-upgrade.patch");
          fs.writeFileSync(tmpDiff, sourceDiff, "utf-8");

          try {
            execSync(`git apply --reject "${tmpDiff}" 2>&1 || true`, {
              cwd: process.cwd(),
              stdio: "inherit",
              shell: true,
            });
            // Clean up .rej files and report
            const rejFiles: string[] = [];
            const findRej = (dir: string) => {
              for (const entry of fs.readdirSync(dir, {
                withFileTypes: true,
              })) {
                const full = path.join(dir, entry.name);
                if (
                  entry.isDirectory() &&
                  entry.name !== "node_modules" &&
                  entry.name !== ".git"
                ) {
                  findRej(full);
                } else if (entry.name.endsWith(".rej")) {
                  rejFiles.push(full);
                  fs.unlinkSync(full);
                }
              }
            };
            findRej(process.cwd());
            if (rejFiles.length > 0) {
              console.log(
                `${rejFiles.length} file(s) had conflicts (skipped). Review manually if needed.`,
              );
            } else {
              console.log("Source patches applied successfully.");
            }
          } finally {
            fs.unlinkSync(tmpDiff);
          }
        }

        // 2. Update package.json programmatically
        if (targetPkg && sourcePkg) {
          const pkgPath = path.resolve(process.cwd(), "package.json");
          const localPkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

          console.log("\nUpdating package.json...");
          updatePackageJson(localPkg, sourcePkg, targetPkg);
          fs.writeFileSync(
            pkgPath,
            JSON.stringify(localPkg, null, 2) + "\n",
            "utf-8",
          );
          console.log("package.json updated.");
        }

        // 3. Update version file
        const versionPath = path.resolve(process.cwd(), VERSION_FILE);
        fs.writeFileSync(versionPath, latest + "\n", "utf-8");

        console.log(`\nUpgraded to ${latest}.`);
        console.log("Run 'npm install' then review and commit the changes.");
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Error: ${err.message}`);
        }
        process.exit(1);
      }
    });
}
