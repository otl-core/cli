import { describe, expect, it } from "vitest";
import {
  fieldIdToCamel,
  kebabToPascal,
  pascalToDisplay,
} from "../src/utils/naming";

describe("naming utilities", () => {
  describe("kebabToPascal", () => {
    it("converts a two-segment kebab string", () => {
      expect(kebabToPascal("pricing-card")).toBe("PricingCard");
    });

    it("converts a multi-segment kebab string", () => {
      expect(kebabToPascal("blog-post-list")).toBe("BlogPostList");
    });

    it("converts a single word", () => {
      expect(kebabToPascal("spacer")).toBe("Spacer");
    });

    it("handles an already-capitalized segment", () => {
      expect(kebabToPascal("my-CMS-block")).toBe("MyCMSBlock");
    });
  });

  describe("fieldIdToCamel", () => {
    it("converts snake_case to camelCase", () => {
      expect(fieldIdToCamel("plan_name")).toBe("planName");
    });

    it("converts kebab-case to camelCase", () => {
      expect(fieldIdToCamel("plan-name")).toBe("planName");
    });

    it("passes through an already camelCase id", () => {
      expect(fieldIdToCamel("planName")).toBe("planName");
    });

    it("handles multiple separators", () => {
      expect(fieldIdToCamel("long_field_name")).toBe("longFieldName");
    });

    it("handles a single word", () => {
      expect(fieldIdToCamel("title")).toBe("title");
    });
  });

  describe("pascalToDisplay", () => {
    it("converts PascalCase to spaced display name", () => {
      expect(pascalToDisplay("PricingCard")).toBe("Pricing Card");
    });

    it("handles a single word", () => {
      expect(pascalToDisplay("Spacer")).toBe("Spacer");
    });

    it("handles consecutive uppercase letters", () => {
      expect(pascalToDisplay("CMSBlock")).toBe("C M S Block");
    });
  });
});
