import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tmpDir: string;
let originalCwd: () => string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-project-"));
  originalCwd = process.cwd;
});

afterEach(() => {
  process.cwd = originalCwd;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function importRequireEngineProject() {
  vi.resetModules();
  const mod = await import("../src/utils/project");
  return mod.requireEngineProject;
}

function writePackageJson(dir: string, content: Record<string, unknown>) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify(content, null, 2),
    "utf-8"
  );
}

describe("project detection", () => {
  it("detects a valid engine project in the current directory", async () => {
    writePackageJson(tmpDir, {
      name: "my-engine",
      dependencies: {
        "@otl-core/block-registry": "^1.0.0",
        "@otl-core/section-registry": "^1.0.0",
      },
    });
    process.cwd = () => tmpDir;

    const requireEngineProject = await importRequireEngineProject();
    const paths = requireEngineProject();

    expect(paths.root).toBe(tmpDir);
    expect(paths.blocksDir).toBe(
      path.join(tmpDir, "src", "components", "blocks")
    );
    expect(paths.sectionsDir).toBe(
      path.join(tmpDir, "src", "components", "sections")
    );
    expect(paths.blockRegistryFile).toBe(
      path.join(tmpDir, "src", "lib", "registries", "block-registry.ts")
    );
    expect(paths.sectionRegistryFile).toBe(
      path.join(tmpDir, "src", "lib", "registries", "section-registry.ts")
    );
  });

  it("walks up the directory tree to find the engine root", async () => {
    // Create engine root at tmpDir
    writePackageJson(tmpDir, {
      name: "my-engine",
      dependencies: { "@otl-core/block-registry": "^1.0.0" },
    });

    // CWD is a nested subdirectory
    const nested = path.join(tmpDir, "src", "components");
    fs.mkdirSync(nested, { recursive: true });
    process.cwd = () => nested;

    const requireEngineProject = await importRequireEngineProject();
    const paths = requireEngineProject();

    expect(paths.root).toBe(tmpDir);
  });

  it("detects engine project via devDependencies", async () => {
    writePackageJson(tmpDir, {
      name: "my-engine",
      devDependencies: { "@otl-core/section-registry": "^1.0.0" },
    });
    process.cwd = () => tmpDir;

    const requireEngineProject = await importRequireEngineProject();
    const paths = requireEngineProject();

    expect(paths.root).toBe(tmpDir);
  });

  it("exits with error when no engine project is found", async () => {
    // Empty directory, no package.json
    process.cwd = () => tmpDir;

    const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const requireEngineProject = await importRequireEngineProject();

    expect(() => requireEngineProject()).toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it("does not match a package.json without @otl-core/ dependencies", async () => {
    writePackageJson(tmpDir, {
      name: "some-other-project",
      dependencies: { react: "^18.0.0" },
    });
    process.cwd = () => tmpDir;

    const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const requireEngineProject = await importRequireEngineProject();

    expect(() => requireEngineProject()).toThrow("process.exit called");
  });
});
