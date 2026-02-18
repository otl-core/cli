/**
 * Environment utilities for reading CLI configuration from .env.local or process.env.
 */

import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";
import type { CliConfig } from "../types";

/**
 * Load CLI configuration from .env.local (in the current directory) and
 * process.env. The .env.local file takes precedence for values it defines;
 * process.env acts as a fallback.
 *
 * Returns the resolved config, or throws an error with a user-friendly
 * message when required values are missing.
 */
export function loadConfig(): CliConfig {
  // Try to load .env.local from cwd
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  let fileEnv: Record<string, string> = {};

  if (fs.existsSync(envLocalPath)) {
    const parsed = dotenv.parse(fs.readFileSync(envLocalPath, "utf-8"));
    fileEnv = parsed;
  }

  const deploymentId =
    fileEnv["DEPLOYMENT_ID"] || process.env["DEPLOYMENT_ID"] || "";
  const accessToken =
    fileEnv["DEPLOYMENT_ACCESS_TOKEN"] ||
    process.env["DEPLOYMENT_ACCESS_TOKEN"] ||
    "";
  const apiUrl =
    fileEnv["API_URL"] || process.env["API_URL"] || "http://localhost:8080";

  if (!deploymentId || !accessToken) {
    console.error(
      "Error: Missing DEPLOYMENT_ID and/or DEPLOYMENT_ACCESS_TOKEN."
    );
    console.error(
      "Run 'npx @otl-core/cli init' to configure your environment."
    );
    process.exit(1);
  }

  return { deploymentId, accessToken, apiUrl };
}
