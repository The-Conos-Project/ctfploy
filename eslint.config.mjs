import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // These pages intentionally initialize browser-only theme state after hydration.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "node_modules/**"]),
]);
