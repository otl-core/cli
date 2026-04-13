import { describe, expect, it } from "vitest";
import {
  buildTypeImportLine,
  createEmptyImports,
  generateInterface,
  resolveFieldType,
} from "../src/codegen/type-mapper";
import type { SchemaField } from "../src/types";

// Helper to make a minimal SchemaField
function field(
  overrides: Partial<SchemaField> & { id: string; type: string },
): SchemaField {
  return { label: overrides.id, ...overrides };
}

describe("type-mapper", () => {
  describe("resolveFieldType", () => {
    const simpleMappings: Array<[string, string]> = [
      ["text", "string"],
      ["textarea", "string"],
      ["url", "string"],
      ["markdown", "string"],
      ["html", "string"],
      ["code", "string"],
      ["richtext", "string"],
      ["date", "string"],
      ["number", "number"],
      ["boolean", "boolean"],
      ["color", "string"],
      ["form-selector", "string"],
      ["form-page", "string"],
      ["json", "Record<string, unknown>"],
      ["container-behavior", '"boxed" | "edged" | "ignore"'],
    ];

    for (const [fieldType, expected] of simpleMappings) {
      it(`maps "${fieldType}" to ${expected}`, () => {
        const imports = createEmptyImports();
        const result = resolveFieldType(
          field({ id: "test", type: fieldType }),
          imports,
        );
        expect(result).toBe(expected);
      });
    }

    it('maps "select" without multiple to "string"', () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "test", type: "select" }),
        imports,
      );
      expect(result).toBe("string");
    });

    it('maps "select" with multiple: true to "string[]"', () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "test", type: "select", multiple: true }),
        imports,
      );
      expect(result).toBe("string[]");
    });

    it("maps unknown type to unknown", () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "test", type: "nonexistent" }),
        imports,
      );
      expect(result).toBe("unknown");
    });
  });

  describe("resolveFieldType import tracking", () => {
    it("sets ColorReference for theme-color", () => {
      const imports = createEmptyImports();
      resolveFieldType(field({ id: "c", type: "theme-color" }), imports);
      expect(imports.ColorReference).toBe(true);
    });

    it("sets ColorReference for theme-background-color", () => {
      const imports = createEmptyImports();
      resolveFieldType(
        field({ id: "c", type: "theme-background-color" }),
        imports,
      );
      expect(imports.ColorReference).toBe(true);
    });

    it("sets ColorReference for theme-foreground-color", () => {
      const imports = createEmptyImports();
      resolveFieldType(
        field({ id: "c", type: "theme-foreground-color" }),
        imports,
      );
      expect(imports.ColorReference).toBe(true);
    });

    it("returns string for image", () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "img", type: "image" }),
        imports,
      );
      expect(result).toBe("string");
      expect(imports.MediaReference).toBe(false);
    });

    it("sets ResponsiveValue for spacing", () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "s", type: "spacing" }),
        imports,
      );
      expect(result).toBe("ResponsiveValue<string>");
      expect(imports.ResponsiveValue).toBe(true);
    });

    it("sets ResponsiveValue for css-value", () => {
      const imports = createEmptyImports();
      resolveFieldType(field({ id: "s", type: "css-value" }), imports);
      expect(imports.ResponsiveValue).toBe(true);
    });

    it("sets ResponsiveValue for columns", () => {
      const imports = createEmptyImports();
      resolveFieldType(field({ id: "s", type: "columns" }), imports);
      expect(imports.ResponsiveValue).toBe(true);
    });

    it("sets BlockInstance for blocks", () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "b", type: "blocks" }),
        imports,
      );
      expect(result).toBe("BlockInstance[]");
      expect(imports.BlockInstance).toBe(true);
    });

    it("sets LocalizedString for localized-text", () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "t", type: "localized-text" }),
        imports,
      );
      expect(result).toBe("LocalizedString");
      expect(imports.LocalizedString).toBe(true);
    });
  });

  describe("resolveFieldType group", () => {
    it('returns "__GROUP__" sentinel for group type', () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "g", type: "group" }),
        imports,
      );
      expect(result).toBe("__GROUP__");
    });
  });

  describe("resolveFieldType array", () => {
    it('returns "__ARRAY__" sentinel for array type', () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "items", type: "array" }),
        imports,
      );
      expect(result).toBe("__ARRAY__");
    });
  });

  describe("resolveFieldType object", () => {
    it('returns "__OBJECT__" sentinel for object type', () => {
      const imports = createEmptyImports();
      const result = resolveFieldType(
        field({ id: "meta", type: "object" }),
        imports,
      );
      expect(result).toBe("__OBJECT__");
    });
  });

  describe("buildTypeImportLine", () => {
    it("returns null when no imports are needed", () => {
      const imports = createEmptyImports();
      expect(buildTypeImportLine(imports)).toBeNull();
    });

    it("returns correct import with one type", () => {
      const imports = createEmptyImports();
      imports.ColorReference = true;
      expect(buildTypeImportLine(imports)).toBe(
        'import type { ColorReference } from "@otl-core/cms-types";',
      );
    });

    it("returns correct import with multiple types", () => {
      const imports = createEmptyImports();
      imports.ColorReference = true;
      imports.BlockInstance = true;
      const line = buildTypeImportLine(imports);
      expect(line).toContain("ColorReference");
      expect(line).toContain("BlockInstance");
      expect(line).toContain("@otl-core/cms-types");
    });
  });

  describe("generateInterface", () => {
    it("generates an interface with optional fields", () => {
      const fields: SchemaField[] = [
        field({ id: "title", type: "text" }),
        field({ id: "count", type: "number" }),
      ];
      const result = generateInterface("TestConfig", fields);
      expect(result.name).toBe("TestConfig");
      expect(result.declarations).toContain("interface TestConfig {");
      expect(result.declarations).toContain("title?: string;");
      expect(result.declarations).toContain("count?: number;");
      expect(result.declarations).toContain("}");
    });

    it("includes JSDoc descriptions when present", () => {
      const fields: SchemaField[] = [
        field({ id: "title", type: "text", description: "The page title" }),
      ];
      const result = generateInterface("TestConfig", fields);
      expect(result.declarations).toContain("/** The page title */");
    });

    it("generates nested interfaces for group fields", () => {
      const fields: SchemaField[] = [
        field({
          id: "hero",
          type: "group",
          fields: [
            field({ id: "heading", type: "text" }),
            field({ id: "visible", type: "boolean" }),
          ],
        }),
      ];
      const result = generateInterface("PageConfig", fields);
      expect(result.declarations).toContain("interface PageConfigHero {");
      expect(result.declarations).toContain("heading?: string;");
      expect(result.declarations).toContain("visible?: boolean;");
      expect(result.declarations).toContain("hero?: PageConfigHero;");
    });

    it("generates nested interface for object fields with properties", () => {
      const fields: SchemaField[] = [
        field({
          id: "cta",
          type: "object",
          properties: [
            field({ id: "label", type: "text" }),
            field({ id: "url", type: "url" }),
            field({ id: "open-new-tab", type: "boolean" }),
          ],
        }),
      ];
      const result = generateInterface("CardConfig", fields);
      expect(result.declarations).toContain("interface CardConfigCta {");
      expect(result.declarations).toContain("label?: string;");
      expect(result.declarations).toContain("url?: string;");
      expect(result.declarations).toContain('"open-new-tab"?: boolean;');
      expect(result.declarations).toContain("cta?: CardConfigCta;");
    });

    it("falls back to Record for object with no properties", () => {
      const fields: SchemaField[] = [field({ id: "meta", type: "object" })];
      const result = generateInterface("TestConfig", fields);
      expect(result.declarations).toContain("meta?: Record<string, unknown>;");
    });

    it("falls back to Record for group with no sub-fields", () => {
      const fields: SchemaField[] = [
        field({ id: "meta", type: "group", fields: [] }),
      ];
      const result = generateInterface("TestConfig", fields);
      expect(result.declarations).toContain("meta?: Record<string, unknown>;");
    });

    it("tracks imports from nested fields", () => {
      const fields: SchemaField[] = [
        field({
          id: "content",
          type: "group",
          fields: [field({ id: "bg", type: "theme-color" })],
        }),
      ];
      const result = generateInterface("TestConfig", fields);
      expect(result.imports.ColorReference).toBe(true);
    });

    it("preserves original field IDs", () => {
      const fields: SchemaField[] = [field({ id: "plan_name", type: "text" })];
      const result = generateInterface("TestConfig", fields);
      expect(result.declarations).toContain("plan_name?: string;");
    });

    it("generates nested item interface for array fields with sub-fields", () => {
      const fields: SchemaField[] = [
        field({
          id: "badges",
          type: "array",
          fields: [
            field({ id: "badge-icon", type: "select" }),
            field({ id: "badge-text", type: "text" }),
            field({ id: "badge-coming-soon", type: "boolean" }),
          ],
        }),
      ];
      const result = generateInterface("HeroConfig", fields);
      expect(result.declarations).toContain("interface HeroConfigBadgesItem {");
      expect(result.declarations).toContain('"badge-icon"?: string;');
      expect(result.declarations).toContain('"badge-text"?: string;');
      expect(result.declarations).toContain('"badge-coming-soon"?: boolean;');
      expect(result.declarations).toContain("badges?: HeroConfigBadgesItem[];");
    });

    it("falls back to unknown[] for array with no sub-fields", () => {
      const fields: SchemaField[] = [
        field({ id: "tags", type: "array", fields: [] }),
      ];
      const result = generateInterface("TestConfig", fields);
      expect(result.declarations).toContain("tags?: unknown[];");
    });

    it("tracks imports from array item sub-fields", () => {
      const fields: SchemaField[] = [
        field({
          id: "items",
          type: "array",
          fields: [field({ id: "image", type: "image" })],
        }),
      ];
      const result = generateInterface("TestConfig", fields);
      expect(result.imports.MediaReference).toBe(false);
      expect(result.declarations).toContain("image?: string;");
    });
  });
});
