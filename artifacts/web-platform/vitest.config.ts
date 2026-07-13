import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    // Prohibition tests talk to a real Postgres. They are not unit tests, and
    // they must not run in parallel against a shared database.
    fileParallelism: false,
    setupFiles: ["tests/setup.ts"],
    testTimeout: 20_000,
    env: { NODE_ENV: "test" },
  },
});
