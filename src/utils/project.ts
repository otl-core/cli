/**
 * Engine project detection and path resolution.
 */

import * as fs from "fs";
import * as path from "path";
import type { EnginePaths } from "../types";

/** OTL package names that indicate an engine project. */
const ENGINE_MARKERS = [
  "@otl-core/block-registry",
  "@otl-core/section-registry",
];

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

/**
 * Read and parse a package.json file. Returns null if it cannot be read.
 */
function readPackageJson(dir: string): PackageJson | null {
  const filePath = path.join(dir, "package.json");
  if (!fs.existsSync(filePath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as PackageJson;
  } catch {
    return null;
  }
}

/**
 * Check whether a directory looks like a OTL engine project.
 */
function isEngineProject(dir: string): boolean {
  const pkg = readPackageJson(dir);
  if (!pkg) {
    return false;
  }

  const allDeps: Record<string, string> = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
  };

  return ENGINE_MARKERS.some(marker => marker in allDeps);
}

/**
 * Detect the engine project root starting from the current working directory.
 * Walks up the directory tree until it finds a matching package.json or hits
 * the filesystem root.
 *
 * Returns the resolved EnginePaths, or prints an error and exits.
 */
export function requireEngineProject(): EnginePaths {
  let current = process.cwd();

  // Walk up at most 10 levels
  for (let i = 0; i < 10; i++) {
    if (isEngineProject(current)) {
      return {
        root: current,
        blocksDir: path.join(current, "src", "components", "blocks"),
        sectionsDir: path.join(current, "src", "components", "sections"),
        blockRegistryFile: path.join(
          current,
          "src",
          "lib",
          "registries",
          "block-registry.ts"
        ),
        sectionRegistryFile: path.join(
          current,
          "src",
          "lib",
          "registries",
          "section-registry.ts"
        ),
      };
    }

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  console.error("Error: Not in a OTL engine project.");
  console.error("Could not find a package.json with @otl-core/ dependencies.");
  console.error("Run this command from your engine project root.");
  process.exit(1);
}
