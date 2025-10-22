import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
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
];

export default eslintConfig;
