import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as child_process from "child_process";

vi.mock("child_process", () => ({
  execSync: vi.fn(),
}));

let tmpDir: string;
let originalCwd: () => string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-customize-"));
  originalCwd = process.cwd;
  process.cwd = () => tmpDir;
  vi.mocked(child_process.execSync).mockReset();
});

afterEach(() => {
  process.cwd = originalCwd;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

async function importCustomize() {
  vi.resetModules();
  return await import("../src/commands/customize");
}

function writePkgJson(deps: Record<string, string>) {
  fs.writeFileSync(
    path.join(tmpDir, "package.json"),
    JSON.stringify({ dependencies: deps }, null, 2),
  );
}

function readPkgJsonDeps(): Record<string, string> {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(tmpDir, "package.json"), "utf-8"),
  );
  return pkg.dependencies || {};
}

// Helper to extract the action handler from commander registration
function captureAction(registerFn: (program: never) => void) {
  let actionHandler: (
    packages: string[],
    options: { force: boolean; list: boolean; restore?: string[] },
  ) => Promise<void>;

  const mockCommand = {
    command: vi.fn().mockReturnThis(),
    description: vi.fn().mockReturnThis(),
    option: vi.fn().mockReturnThis(),
    action: vi.fn((handler) => {
      actionHandler = handler;
      return mockCommand;
    }),
    help: vi.fn(),
  };
  const mockProgram = {
    command: vi.fn().mockReturnValue(mockCommand),
  };

  registerFn(mockProgram as never);
  return actionHandler!;
}

describe("customize command", () => {
  it("registers command on program", async () => {
    const { registerCustomizeCommands } = await importCustomize();
    const mockCommand = {
      command: vi.fn().mockReturnThis(),
      description: vi.fn().mockReturnThis(),
      option: vi.fn().mockReturnThis(),
      action: vi.fn().mockReturnThis(),
    };
    const mockProgram = {
      command: vi.fn().mockReturnValue(mockCommand),
    };

    registerCustomizeCommands(mockProgram as never);
    expect(mockProgram.command).toHaveBeenCalledWith("customize [packages...]");
  });

  describe("--list", () => {
    it("lists all @otl-core/* dependencies", async () => {
      writePkgJson({
        "@otl-core/next-navigation": "^1.0.0",
        "@otl-core/cms-utils": "^1.0.0",
        react: "^19.0.0",
      });
      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action([], { force: false, list: true });

      const output = mockLog.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("next-navigation");
      expect(output).toContain("cms-utils");
      expect(output).not.toContain("react");
    });

    it("marks customized packages", async () => {
      writePkgJson({
        "@otl-core/next-navigation": "file:./packages/next-navigation",
        "@otl-core/cms-utils": "^1.0.0",
      });
      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action([], { force: false, list: true });

      const output = mockLog.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("(customized)");
    });
  });

  describe("customize", () => {
    it("clones package and updates package.json", async () => {
      writePkgJson({ "@otl-core/next-navigation": "^1.0.0" });

      const execSyncMock = vi.mocked(child_process.execSync);
      execSyncMock.mockImplementation((cmd) => {
        const match = String(cmd).match(/git clone --depth 1 .+ (.+)$/);
        if (match) {
          fs.mkdirSync(match[1], { recursive: true });
          fs.mkdirSync(path.join(match[1], ".git"));
        }
        return Buffer.from("");
      });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action(["next-navigation"], { force: false, list: false });

      // Cloned from correct repo
      expect(execSyncMock).toHaveBeenCalledWith(
        expect.stringContaining("otl-core/next-navigation.git"),
        expect.anything(),
      );

      // Updated package.json
      const deps = readPkgJsonDeps();
      expect(deps["@otl-core/next-navigation"]).toBe(
        "file:./packages/next-navigation",
      );

      // .git removed
      const targetDir = path.join(tmpDir, "packages", "next-navigation");
      expect(fs.existsSync(path.join(targetDir, ".git"))).toBe(false);
    });

    it("accepts full package name with @otl-core/ prefix", async () => {
      writePkgJson({ "@otl-core/cms-utils": "^1.0.0" });

      vi.mocked(child_process.execSync).mockImplementation((cmd) => {
        const match = String(cmd).match(/git clone --depth 1 .+ (.+)$/);
        if (match) fs.mkdirSync(match[1], { recursive: true });
        return Buffer.from("");
      });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action(["@otl-core/cms-utils"], { force: false, list: false });

      const deps = readPkgJsonDeps();
      expect(deps["@otl-core/cms-utils"]).toBe("file:./packages/cms-utils");
    });

    it("customizes multiple packages at once", async () => {
      writePkgJson({
        "@otl-core/next-navigation": "^1.0.0",
        "@otl-core/next-footer": "^1.0.0",
      });

      const execSyncMock = vi.mocked(child_process.execSync);
      execSyncMock.mockImplementation((cmd) => {
        const match = String(cmd).match(/git clone --depth 1 .+ (.+)$/);
        if (match) fs.mkdirSync(match[1], { recursive: true });
        return Buffer.from("");
      });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action(["next-navigation", "next-footer"], {
        force: false,
        list: false,
      });

      expect(execSyncMock).toHaveBeenCalledTimes(2);
      const deps = readPkgJsonDeps();
      expect(deps["@otl-core/next-navigation"]).toBe(
        "file:./packages/next-navigation",
      );
      expect(deps["@otl-core/next-footer"]).toBe("file:./packages/next-footer");
    });

    it("rejects unknown package", async () => {
      writePkgJson({ "@otl-core/next-navigation": "^1.0.0" });

      const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit called");
      }) as never);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);

      await expect(
        action(["nonexistent"], { force: false, list: false }),
      ).rejects.toThrow("process.exit called");
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("skips already-customized packages without --force", async () => {
      writePkgJson({
        "@otl-core/next-navigation": "file:./packages/next-navigation",
      });
      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});
      const execSyncMock = vi.mocked(child_process.execSync);

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action(["next-navigation"], { force: false, list: false });

      expect(execSyncMock).not.toHaveBeenCalled();
      const output = mockLog.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("already customized");
    });

    it("re-clones with --force even if already customized", async () => {
      writePkgJson({
        "@otl-core/next-navigation": "file:./packages/next-navigation",
      });

      const execSyncMock = vi.mocked(child_process.execSync);
      execSyncMock.mockImplementation((cmd) => {
        const match = String(cmd).match(/git clone --depth 1 .+ (.+)$/);
        if (match) fs.mkdirSync(match[1], { recursive: true });
        return Buffer.from("");
      });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action(["next-navigation"], { force: true, list: false });

      expect(execSyncMock).toHaveBeenCalledTimes(1);
    });

    it("refuses to overwrite existing directory without --force", async () => {
      writePkgJson({ "@otl-core/next-navigation": "^1.0.0" });
      fs.mkdirSync(path.join(tmpDir, "packages", "next-navigation"), {
        recursive: true,
      });

      const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
        throw new Error("process.exit called");
      }) as never);
      vi.spyOn(console, "error").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);

      await expect(
        action(["next-navigation"], { force: false, list: false }),
      ).rejects.toThrow("process.exit called");
      expect(mockExit).toHaveBeenCalledWith(1);
    });

    it("creates packages/ directory if it does not exist", async () => {
      writePkgJson({ "@otl-core/next-navigation": "^1.0.0" });

      vi.mocked(child_process.execSync).mockImplementation((cmd) => {
        const match = String(cmd).match(/git clone --depth 1 .+ (.+)$/);
        if (match) fs.mkdirSync(match[1], { recursive: true });
        return Buffer.from("");
      });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action(["next-navigation"], { force: false, list: false });

      expect(
        fs.existsSync(path.join(tmpDir, "packages", "next-navigation")),
      ).toBe(true);
    });
  });

  describe("--restore", () => {
    it("restores a customized package to npm version", async () => {
      writePkgJson({
        "@otl-core/next-navigation": "file:./packages/next-navigation",
      });
      vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action([], {
        force: false,
        list: false,
        restore: ["next-navigation"],
      });

      const deps = readPkgJsonDeps();
      expect(deps["@otl-core/next-navigation"]).toBe("*");
    });

    it("skips packages already on npm version", async () => {
      writePkgJson({ "@otl-core/next-navigation": "^1.0.0" });
      const mockLog = vi.spyOn(console, "log").mockImplementation(() => {});

      const { registerCustomizeCommands } = await importCustomize();
      const action = captureAction(registerCustomizeCommands);
      await action([], {
        force: false,
        list: false,
        restore: ["next-navigation"],
      });

      const output = mockLog.mock.calls.map((c) => c[0]).join("\n");
      expect(output).toContain("already using npm version");

      // Should not have changed
      const deps = readPkgJsonDeps();
      expect(deps["@otl-core/next-navigation"]).toBe("^1.0.0");
    });
  });
});
