import tseslint from "typescript-eslint";

const eslintConfig = tseslint.config(
  {
    ignores: ["node_modules/**", "dist/**", "build/**", "tests/**"],
  },
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      "no-nested-ternary": "error",
      "no-console": "off",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
    },
  }
);

export default eslintConfig;
