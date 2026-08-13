import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";

export default defineConfig([
  {
    plugins: {
      "@next/next": nextPlugin,
    },
    rules: {
      // These pages intentionally initialize browser-only theme state after hydration.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**"]),
]);
