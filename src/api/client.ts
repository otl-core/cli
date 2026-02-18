/**
 * API client for fetching schemas from the OTL backend.
 * Uses native fetch (Node 18+) with deployment token authentication.
 */

import type {
  ApiSuccessResponse,
  BlockSchemaListData,
  BlockSchemaResponse,
  CliConfig,
  SectionSchemaResponse,
} from "../types";

function buildUrl(config: CliConfig, path: string): string {
  const base = config.apiUrl.replace(/\/+$/, "");
  return `${base}/api/v1/public/deployments/${encodeURIComponent(config.deploymentId)}${path}`;
}

function authHeaders(config: CliConfig): Record<string, string> {
  return {
    Authorization: `Bearer ${config.accessToken}`,
    Accept: "application/json",
  };
}

async function fetchJson<T>(
  url: string,
  headers: Record<string, string>
): Promise<T> {
  const response = await fetch(url, { headers });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `API request failed (${response.status} ${response.statusText}): ${body}`
    );
  }

  return response.json() as Promise<T>;
}

/**
 * Fetch all block schemas for the configured deployment.
 */
export async function fetchBlockSchemas(
  config: CliConfig
): Promise<BlockSchemaResponse[]> {
  const url = buildUrl(config, "/schemas/blocks");
  const result = await fetchJson<ApiSuccessResponse<BlockSchemaListData>>(
    url,
    authHeaders(config)
  );
  return result.data.schemas;
}

/**
 * Fetch a single block schema by its ID.
 */
export async function fetchBlockSchemaById(
  config: CliConfig,
  schemaId: string
): Promise<BlockSchemaResponse> {
  const url = buildUrl(
    config,
    `/schemas/blocks/${encodeURIComponent(schemaId)}`
  );
  const result = await fetchJson<ApiSuccessResponse<BlockSchemaResponse>>(
    url,
    authHeaders(config)
  );
  return result.data;
}

/**
 * Find a block schema by its type name (e.g. "pricing-card").
 * Fetches the full list and filters client-side, since the API indexes by ID.
 */
export async function findBlockSchemaByType(
  config: CliConfig,
  typeName: string
): Promise<BlockSchemaResponse | undefined> {
  const schemas = await fetchBlockSchemas(config);
  return schemas.find(s => s.type === typeName);
}

/**
 * Fetch all section schemas for the configured deployment.
 * The backend returns the array directly (not wrapped in { schemas, total }).
 */
export async function fetchSectionSchemas(
  config: CliConfig
): Promise<SectionSchemaResponse[]> {
  const url = buildUrl(config, "/schemas/sections");
  const result = await fetchJson<ApiSuccessResponse<SectionSchemaResponse[]>>(
    url,
    authHeaders(config)
  );
  return result.data;
}

/**
 * Fetch a single section schema by its ID.
 */
export async function fetchSectionSchemaById(
  config: CliConfig,
  schemaId: string
): Promise<SectionSchemaResponse> {
  const url = buildUrl(
    config,
    `/schemas/sections/${encodeURIComponent(schemaId)}`
  );
  const result = await fetchJson<ApiSuccessResponse<SectionSchemaResponse>>(
    url,
    authHeaders(config)
  );
  return result.data;
}

/**
 * Find a section schema by its type name (e.g. "pricing-table").
 * Fetches the full list and filters client-side.
 */
export async function findSectionSchemaByType(
  config: CliConfig,
  typeName: string
): Promise<SectionSchemaResponse | undefined> {
  const schemas = await fetchSectionSchemas(config);
  return schemas.find(s => s.type === typeName);
}
