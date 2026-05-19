import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  { ignores: ["dist", "node_modules", "scripts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // TypeScript strict mode handles most type issues; these are too noisy for an existing codebase
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      // Allow empty catch blocks (used intentionally throughout for localStorage)
      "no-empty": ["error", { allowEmptyCatch: true }],
      // Downgrade set-state-in-effect to warn — existing codebase uses this pattern intentionally
      // for resetting derived UI state when a prop changes (e.g. resetting visible cap on filter change)
      "react-hooks/set-state-in-effect": "warn",
      // These produce false positives on intentional patterns
      "no-useless-assignment": "warn",
      // Assigning to .current on a MutableRefObject prop is valid React — rule doesn't understand refs
      "react-hooks/no-mutable-props": "off",
      // False positive: assigning to ref.current via a prop is the standard forwarded-ref pattern
      "react-hooks/immutability": "off",
    },
  },
);
