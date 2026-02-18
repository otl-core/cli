/**
 * Shared types for the OTL CLI
 */

export interface CliConfig {
  deploymentId: string;
  accessToken: string;
  apiUrl: string;
}

export interface SchemaField {
  id: string;
  type: string;
  label: string;
  description?: string;
  required?: boolean;
  defaultValue?: unknown;
  multiple?: boolean;
  fields?: SchemaField[];
  properties?: SchemaField[];
  options?: Array<{ label: string; value: string }>;
}

export interface BlockSchemaResponse {
  schema_id: string;
  deployment_id: string;
  type: string;
  name: string;
  description?: string;
  fields: SchemaField[];
  targets?: string[];
  icon?: string;
  preview_image?: string;
  relevancy: number;
  is_built_in: boolean;
  created_at: string;
  updated_at: string;
}

export interface SectionSchemaResponse {
  schema_id: string;
  deployment_id: string;
  type: string;
  name: string;
  description?: string;
  fields: SchemaField[];
  icon?: string;
  preview_image?: string;
  relevancy: number;
  is_built_in: boolean;
  created_at: string;
  updated_at: string;
  created_by: string;
}

/** Wrapper returned by the backend for single-item responses */
export interface ApiSuccessResponse<T> {
  success: boolean;
  data: T;
}

/** Wrapper returned by the backend for block schema list */
export interface BlockSchemaListData {
  schemas: BlockSchemaResponse[];
  total: number;
}

export interface EnginePaths {
  root: string;
  blocksDir: string;
  sectionsDir: string;
  blockRegistryFile: string;
  sectionRegistryFile: string;
}
