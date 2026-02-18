import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addToBlockRegistry,
  addToSectionRegistry,
} from "../src/codegen/registry-updater";

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-test-registry-"));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// A minimal block registry file matching the real structure
const BLOCK_REGISTRY_TEMPLATE = `import { BlockRegistry } from "@otl-core/block-registry";
import { MarkdownBlock } from "@/components/blocks/markdown";

export const blockRegistry = new BlockRegistry();

blockRegistry.register("markdown", MarkdownBlock);

/**
 * Custom Blocks
 * To add your own blocks:
 * 1. Create your component in src/components/blocks/
 * 2. Import it above
 * 3. Register it: blockRegistry.register('your-block-name', YourBlock);
 */
`;

const SECTION_REGISTRY_TEMPLATE = `import { SectionRegistry } from "@otl-core/section-registry";
import { GridSection } from "@/components/sections/grid";

export const sectionRegistry = new SectionRegistry();

sectionRegistry.register("grid", GridSection);

/**
 * Custom Sections
 * To add your own sections:
 * 1. Create your component in src/components/sections/
 * 2. Import it above
 * 3. Register it: sectionRegistry.register('your-section-name', YourSection);
 */
`;

describe("registry-updater", () => {
  describe("addToBlockRegistry", () => {
    it("adds import and registration to a block registry file", () => {
      const filePath = path.join(tmpDir, "block-registry.ts");
      fs.writeFileSync(filePath, BLOCK_REGISTRY_TEMPLATE, "utf-8");

      addToBlockRegistry(filePath, "pricing-card");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain(
        'import { PricingCardBlock } from "@/components/blocks/pricing-card";'
      );
      expect(content).toContain(
        'blockRegistry.register("pricing-card", PricingCardBlock);'
      );
    });

    it("inserts import after the last existing import", () => {
      const filePath = path.join(tmpDir, "block-registry.ts");
      fs.writeFileSync(filePath, BLOCK_REGISTRY_TEMPLATE, "utf-8");

      addToBlockRegistry(filePath, "hero");

      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const importIndex = lines.findIndex(l => l.includes("HeroBlock"));
      const lastOriginalImport = lines.findIndex(l =>
        l.includes("MarkdownBlock")
      );
      // New import should be after the last original import
      expect(importIndex).toBeGreaterThan(lastOriginalImport);
    });

    it("inserts registration before the Custom Blocks comment", () => {
      const filePath = path.join(tmpDir, "block-registry.ts");
      fs.writeFileSync(filePath, BLOCK_REGISTRY_TEMPLATE, "utf-8");

      addToBlockRegistry(filePath, "card");

      const content = fs.readFileSync(filePath, "utf-8");
      const registerIndex = content.indexOf('blockRegistry.register("card"');
      const commentIndex = content.indexOf("/**\n * Custom Blocks");
      expect(registerIndex).toBeLessThan(commentIndex);
      expect(registerIndex).toBeGreaterThan(-1);
    });

    it("is idempotent -- skips if already registered", () => {
      const filePath = path.join(tmpDir, "block-registry.ts");
      fs.writeFileSync(filePath, BLOCK_REGISTRY_TEMPLATE, "utf-8");

      addToBlockRegistry(filePath, "pricing-card");
      const contentAfterFirst = fs.readFileSync(filePath, "utf-8");

      addToBlockRegistry(filePath, "pricing-card");
      const contentAfterSecond = fs.readFileSync(filePath, "utf-8");

      expect(contentAfterSecond).toBe(contentAfterFirst);
    });

    it("handles a file with no Custom comment (appends at end)", () => {
      const minimal = `import { BlockRegistry } from "@otl-core/block-registry";

export const blockRegistry = new BlockRegistry();
`;
      const filePath = path.join(tmpDir, "block-registry.ts");
      fs.writeFileSync(filePath, minimal, "utf-8");

      addToBlockRegistry(filePath, "test-block");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain(
        'blockRegistry.register("test-block", TestBlockBlock);'
      );
    });

    it("handles a file with no existing imports", () => {
      const noImports = `export const blockRegistry = {};

/**
 * Custom Blocks
 */
`;
      const filePath = path.join(tmpDir, "block-registry.ts");
      fs.writeFileSync(filePath, noImports, "utf-8");

      addToBlockRegistry(filePath, "card");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain(
        'import { CardBlock } from "@/components/blocks/card";'
      );
    });
  });

  describe("addToSectionRegistry", () => {
    it("adds import and registration to a section registry file", () => {
      const filePath = path.join(tmpDir, "section-registry.ts");
      fs.writeFileSync(filePath, SECTION_REGISTRY_TEMPLATE, "utf-8");

      addToSectionRegistry(filePath, "pricing-table");

      const content = fs.readFileSync(filePath, "utf-8");
      expect(content).toContain(
        'import { PricingTableSection } from "@/components/sections/pricing-table";'
      );
      expect(content).toContain(
        'sectionRegistry.register("pricing-table", PricingTableSection);'
      );
    });

    it("is idempotent", () => {
      const filePath = path.join(tmpDir, "section-registry.ts");
      fs.writeFileSync(filePath, SECTION_REGISTRY_TEMPLATE, "utf-8");

      addToSectionRegistry(filePath, "hero");
      const first = fs.readFileSync(filePath, "utf-8");

      addToSectionRegistry(filePath, "hero");
      const second = fs.readFileSync(filePath, "utf-8");

      expect(second).toBe(first);
    });
  });
});
