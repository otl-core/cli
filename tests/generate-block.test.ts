import { describe, expect, it } from "vitest";
import { generateBlockComponent } from "../src/codegen/generate-block";
import type { SchemaField } from "../src/types";

function field(
  overrides: Partial<SchemaField> & { id: string; type: string }
): SchemaField {
  return { label: overrides.id, ...overrides };
}

describe("generateBlockComponent", () => {
  it("generates a valid block component with simple fields", () => {
    const fields: SchemaField[] = [
      field({ id: "title", type: "text" }),
      field({ id: "price", type: "number" }),
    ];
    const output = generateBlockComponent("pricing-card", fields);

    expect(output).toContain(
      'import type { BlockComponentProps } from "@otl-core/cms-types"'
    );
    expect(output).toContain("interface PricingCardConfig {");
    expect(output).toContain("title?: string;");
    expect(output).toContain("price?: number;");
    expect(output).toContain(
      "export function PricingCardBlock({ config }: BlockComponentProps<PricingCardConfig>)"
    );
    expect(output).toContain("const { title, price } = config;");
    expect(output).toContain("{/* TODO: Implement pricing-card block */}");
  });

  it("merges additional type imports into one import statement", () => {
    const fields: SchemaField[] = [
      field({ id: "bg", type: "theme-color" }),
      field({ id: "photo", type: "image" }),
    ];
    const output = generateBlockComponent("hero", fields);

    // Should have one combined import with BlockComponentProps + ColorReference + MediaReference
    expect(output).toContain("BlockComponentProps");
    expect(output).toContain("ColorReference");
    expect(output).toContain("MediaReference");
    // Should be a single import line from @otl-core/cms-types
    const importLines = output
      .split("\n")
      .filter(l => l.startsWith("import type"));
    expect(importLines).toHaveLength(1);
  });

  it("generates a component with no destructuring when fields are empty", () => {
    const output = generateBlockComponent("empty", []);

    expect(output).toContain("export function EmptyBlock");
    expect(output).not.toContain("const {");
  });

  it("uses the correct component name from kebab-case type", () => {
    const output = generateBlockComponent("blog-post-list", [
      field({ id: "limit", type: "number" }),
    ]);

    expect(output).toContain("interface BlogPostListConfig");
    expect(output).toContain("export function BlogPostListBlock");
    expect(output).toContain("BlockComponentProps<BlogPostListConfig>");
  });
});
