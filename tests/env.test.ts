import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

let tmpDir: string;
let originalCwd: () => string;
let originalEnv: NodeJS.ProcessEnv;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-env-"));
  originalCwd = process.cwd;
  originalEnv = { ...process.env };
  process.cwd = () => tmpDir;
});

afterEach(() => {
  process.cwd = originalCwd;
  process.env = originalEnv;
  fs.rmSync(tmpDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

// We need to re-import loadConfig for each test to avoid module caching issues.
// vitest handles this with dynamic import + resetModules.

async function importLoadConfig() {
  // Clear the module cache so each test gets a fresh import
  vi.resetModules();
  const mod = await import("../src/utils/env");
  return mod.loadConfig;
}

describe("env utilities", () => {
  it("reads configuration from .env.local file", async () => {
    const envContent = [
      "DEPLOYMENT_ID=test-deploy-123",
      "DEPLOYMENT_ACCESS_TOKEN=otl_dpl_test_token",
      "API_URL=https://api.test.com",
    ].join("\n");
    fs.writeFileSync(path.join(tmpDir, ".env.local"), envContent, "utf-8");

    const loadConfig = await importLoadConfig();
    const config = loadConfig();

    expect(config.deploymentId).toBe("test-deploy-123");
    expect(config.accessToken).toBe("otl_dpl_test_token");
    expect(config.apiUrl).toBe("https://api.test.com");
  });

  it("falls back to process.env when no .env.local exists", async () => {
    process.env["DEPLOYMENT_ID"] = "env-deploy";
    process.env["DEPLOYMENT_ACCESS_TOKEN"] = "env-token";
    process.env["API_URL"] = "https://env-api.com";

    const loadConfig = await importLoadConfig();
    const config = loadConfig();

    expect(config.deploymentId).toBe("env-deploy");
    expect(config.accessToken).toBe("env-token");
    expect(config.apiUrl).toBe("https://env-api.com");
  });

  it("defaults API_URL to http://localhost:8080", async () => {
    const envContent = [
      "DEPLOYMENT_ID=test-deploy",
      "DEPLOYMENT_ACCESS_TOKEN=test-token",
    ].join("\n");
    fs.writeFileSync(path.join(tmpDir, ".env.local"), envContent, "utf-8");

    const loadConfig = await importLoadConfig();
    const config = loadConfig();

    expect(config.apiUrl).toBe("http://localhost:8080");
  });

  it("exits with error when DEPLOYMENT_ID is missing", async () => {
    const envContent = "DEPLOYMENT_ACCESS_TOKEN=test-token\n";
    fs.writeFileSync(path.join(tmpDir, ".env.local"), envContent, "utf-8");

    // Remove from process.env too
    delete process.env["DEPLOYMENT_ID"];

    const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    const mockError = vi.spyOn(console, "error").mockImplementation(() => {});

    const loadConfig = await importLoadConfig();

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
    expect(mockError).toHaveBeenCalledWith(
      expect.stringContaining("Missing DEPLOYMENT_ID")
    );
  });

  it("exits with error when DEPLOYMENT_ACCESS_TOKEN is missing", async () => {
    const envContent = "DEPLOYMENT_ID=test-deploy\n";
    fs.writeFileSync(path.join(tmpDir, ".env.local"), envContent, "utf-8");

    delete process.env["DEPLOYMENT_ACCESS_TOKEN"];

    const mockExit = vi.spyOn(process, "exit").mockImplementation((() => {
      throw new Error("process.exit called");
    }) as never);
    vi.spyOn(console, "error").mockImplementation(() => {});

    const loadConfig = await importLoadConfig();

    expect(() => loadConfig()).toThrow("process.exit called");
    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it(".env.local values take precedence over process.env", async () => {
    process.env["DEPLOYMENT_ID"] = "from-env";
    process.env["DEPLOYMENT_ACCESS_TOKEN"] = "from-env-token";

    const envContent = [
      "DEPLOYMENT_ID=from-file",
      "DEPLOYMENT_ACCESS_TOKEN=from-file-token",
    ].join("\n");
    fs.writeFileSync(path.join(tmpDir, ".env.local"), envContent, "utf-8");

    const loadConfig = await importLoadConfig();
    const config = loadConfig();

    expect(config.deploymentId).toBe("from-file");
    expect(config.accessToken).toBe("from-file-token");
  });
});
