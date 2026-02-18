import { describe, expect, it } from "vitest";
import { generateSectionComponent } from "../src/codegen/generate-section";
import type { SchemaField } from "../src/types";

function field(
  overrides: Partial<SchemaField> & { id: string; type: string }
): SchemaField {
  return { label: overrides.id, ...overrides };
}

describe("generateSectionComponent", () => {
  it("generates a valid section component with simple fields", () => {
    const fields: SchemaField[] = [
      field({ id: "heading", type: "text" }),
      field({ id: "columns", type: "number" }),
    ];
    const output = generateSectionComponent("pricing-table", fields);

    expect(output).toContain(
      'import type { SectionComponentProps } from "@otl-core/cms-types"'
    );
    expect(output).toContain("interface PricingTableConfig {");
    expect(output).toContain("heading?: string;");
    expect(output).toContain("columns?: number;");
    expect(output).toContain(
      "export function PricingTableSection({ config }: SectionComponentProps<PricingTableConfig>)"
    );
    expect(output).toContain("const { heading, columns } = config;");
    expect(output).toContain("{/* TODO: Implement pricing-table section */}");
  });

  it("merges additional type imports into one import statement", () => {
    const fields: SchemaField[] = [
      field({ id: "items", type: "blocks" }),
      field({ id: "gap", type: "spacing" }),
    ];
    const output = generateSectionComponent("content-grid", fields);

    expect(output).toContain("SectionComponentProps");
    expect(output).toContain("BlockInstance");
    expect(output).toContain("ResponsiveValue");
    const importLines = output
      .split("\n")
      .filter(l => l.startsWith("import type"));
    expect(importLines).toHaveLength(1);
  });

  it("generates a component with no destructuring when fields are empty", () => {
    const output = generateSectionComponent("empty", []);

    expect(output).toContain("export function EmptySection");
    expect(output).not.toContain("const {");
  });

  it("uses the correct component name from kebab-case type", () => {
    const output = generateSectionComponent("hero-banner", [
      field({ id: "title", type: "text" }),
    ]);

    expect(output).toContain("interface HeroBannerConfig");
    expect(output).toContain("export function HeroBannerSection");
    expect(output).toContain("SectionComponentProps<HeroBannerConfig>");
  });
});
