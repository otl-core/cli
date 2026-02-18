/**
 * Naming utilities for converting between different case conventions.
 */

/**
 * Convert a kebab-case string to PascalCase.
 * Example: "pricing-card" -> "PricingCard"
 */
export function kebabToPascal(kebab: string): string {
  return kebab
    .split("-")
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join("");
}

/**
 * Convert a snake_case or kebab-case field ID to camelCase.
 * Example: "plan_name" -> "planName"
 * Example: "plan-name" -> "planName"
 */
export function fieldIdToCamel(id: string): string {
  return id.replace(/[-_]([a-z])/g, (_, char: string) => char.toUpperCase());
}

/**
 * Convert a PascalCase string to a display-friendly name.
 * Example: "PricingCard" -> "Pricing Card"
 */
export function pascalToDisplay(pascal: string): string {
  return pascal.replace(/([A-Z])/g, " $1").trim();
}
