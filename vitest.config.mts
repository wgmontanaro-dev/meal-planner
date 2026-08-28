import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// First tests in the project (SPEC.md section 30.5). Node environment only —
// the suite covers pure date arithmetic and server-action logic with the
// Supabase client mocked; no DOM is involved.
export default defineConfig({
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
    },
  },
});
