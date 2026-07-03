import { defineConfig } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Stale nested copy of the project - do not lint
      "the-menu-guide/**",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Allow unused variables that start with underscore
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      // Allow console.log in production (for debugging)
      "no-console": "off",
      // Allow unescaped entities in JSX
      "react/no-unescaped-entities": "off",
      // Warn about img tags (should use next/image)
      "@next/next/no-img-element": "warn",
      // Warn about missing dependencies in useEffect
      "react-hooks/exhaustive-deps": "warn",
      // Warn about explicit any types
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
]);

export default eslintConfig;
