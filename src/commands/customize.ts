/**
 * `otl-cli customize` command.
 *
 * Vendor any @otl-core/* package locally for customization.
 * Derives the GitHub repo URL from the package name by convention:
 *   @otl-core/<name> → github.com/otl-core/<name>
 */

import type { Command } from "commander";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

const GITHUB_ORG = "otl-core";

interface PkgJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

function readPkgJson(): { pkgJson: PkgJson; pkgPath: string } {
  const pkgPath = path.resolve(process.cwd(), "package.json");
  if (!fs.existsSync(pkgPath)) {
    console.error("Error: No package.json found in current directory.");
    process.exit(1);
  }
  const pkgJson = JSON.parse(fs.readFileSync(pkgPath, "utf-8")) as PkgJson;
  return { pkgJson, pkgPath };
}

function getOtlDeps(pkgJson: PkgJson): Map<string, string> {
  const deps = new Map<string, string>();
  for (const [name, version] of Object.entries(pkgJson.dependencies || {})) {
    if (name.startsWith("@otl-core/")) {
      deps.set(name, version);
    }
  }
  return deps;
}

function packageNameToShort(fullName: string): string {
  return fullName.replace("@otl-core/", "");
}

export function registerCustomizeCommands(program: Command): void {
  const cmd = program
    .command("customize [packages...]")
    .description("Vendor @otl-core/* packages locally for customization")
    .option("--force", "Overwrite existing local packages", false)
    .option("--list", "List all customizable @otl-core/* dependencies")
    .option("--restore <packages...>", "Restore packages to their npm versions")
    .action(
      async (
        packages: string[],
        options: { force: boolean; list: boolean; restore?: string[] },
      ) => {
        try {
          const { pkgJson, pkgPath } = readPkgJson();
          const otlDeps = getOtlDeps(pkgJson);

          if (options.list) {
            listPackages(otlDeps);
            return;
          }

          if (options.restore) {
            restorePackages(options.restore, pkgJson, pkgPath, otlDeps);
            return;
          }

          if (packages.length === 0) {
            console.error(
              "Error: Specify packages to customize, or use --list to see available packages.",
            );
            cmd.help();
            return;
          }

          customizePackages(packages, pkgJson, pkgPath, otlDeps, options.force);
        } catch (err) {
          if (err instanceof Error) {
            console.error(`Error: ${err.message}`);
          }
          process.exit(1);
        }
      },
    );
}

function listPackages(otlDeps: Map<string, string>): void {
  if (otlDeps.size === 0) {
    console.log("No @otl-core/* dependencies found in package.json.");
    return;
  }

  console.log("Customizable @otl-core/* packages:\n");
  for (const [name, version] of otlDeps) {
    const isLocal = version.startsWith("file:");
    const status = isLocal ? " (customized)" : "";
    console.log(`  ${packageNameToShort(name)}${status}`);
  }
  console.log("\nUsage: otl-cli customize <package-name> [<package-name> ...]");
}

function customizePackages(
  packages: string[],
  pkgJson: PkgJson,
  pkgPath: string,
  otlDeps: Map<string, string>,
  force: boolean,
): void {
  for (const pkg of packages) {
    const fullName = pkg.startsWith("@otl-core/") ? pkg : `@otl-core/${pkg}`;
    const shortName = packageNameToShort(fullName);

    if (!otlDeps.has(fullName)) {
      console.error(
        `Error: "${fullName}" is not a dependency. Run --list to see available packages.`,
      );
      process.exit(1);
    }

    const currentVersion = otlDeps.get(fullName)!;
    if (currentVersion.startsWith("file:") && !force) {
      console.log(
        `Skipping ${shortName} — already customized (${currentVersion}). Use --force to re-clone.`,
      );
      continue;
    }

    const targetDir = path.resolve(process.cwd(), "packages", shortName);

    if (fs.existsSync(targetDir)) {
      if (!force) {
        console.error(
          `Error: ./packages/${shortName}/ already exists. Use --force to overwrite.`,
        );
        process.exit(1);
      }
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    // Ensure packages/ directory exists
    const packagesDir = path.resolve(process.cwd(), "packages");
    if (!fs.existsSync(packagesDir)) {
      fs.mkdirSync(packagesDir, { recursive: true });
    }

    const repoUrl = `https://github.com/${GITHUB_ORG}/${shortName}.git`;
    console.log(`Cloning ${repoUrl} into ./packages/${shortName}/...`);
    execSync(`git clone --depth 1 ${repoUrl} ${targetDir}`, {
      stdio: "inherit",
    });

    // Remove .git directory
    const gitDir = path.join(targetDir, ".git");
    if (fs.existsSync(gitDir)) {
      fs.rmSync(gitDir, { recursive: true, force: true });
    }

    // Update package.json dependency to point to local copy
    pkgJson.dependencies![fullName] = `file:./packages/${shortName}`;
    console.log(`Customized ${shortName} → ./packages/${shortName}/`);
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + "\n");

  console.log("");
  console.log("Next steps:");
  console.log("  1. Run `npm install` to link the local packages");
  console.log("  2. Customize the source in ./packages/");
  console.log("  3. Rebuild with `npm run build` inside the package directory");
}

function restorePackages(
  packages: string[],
  pkgJson: PkgJson,
  pkgPath: string,
  otlDeps: Map<string, string>,
): void {
  for (const pkg of packages) {
    const fullName = pkg.startsWith("@otl-core/") ? pkg : `@otl-core/${pkg}`;
    const shortName = packageNameToShort(fullName);

    if (!otlDeps.has(fullName)) {
      console.error(
        `Error: "${fullName}" is not a dependency. Run --list to see available packages.`,
      );
      process.exit(1);
    }

    const currentVersion = otlDeps.get(fullName)!;
    if (!currentVersion.startsWith("file:")) {
      console.log(
        `${shortName} is already using npm version (${currentVersion}).`,
      );
      continue;
    }

    // Restore to latest
    pkgJson.dependencies![fullName] = "*";
    console.log(`Restored ${shortName} to npm registry version.`);
  }

  fs.writeFileSync(pkgPath, JSON.stringify(pkgJson, null, 2) + "\n");
  console.log("\nRun `npm install` to fetch the packages from npm.");
}
