import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      // The real package throws when imported outside React Server Components.
      // Next.js enforces it in the app; tests import server modules directly.
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["**/*.test.{ts,tsx}"],
          exclude: ["node_modules/**", "e2e/**", "contract/**"],
        },
      },
      {
        // Runs against the real prediction API; see `npm run test:contract`.
        extends: true,
        test: {
          name: "contract",
          environment: "node",
          include: ["contract/**/*.test.ts"],
        },
      },
    ],
  },
});
