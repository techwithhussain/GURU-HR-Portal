import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // No global setupFiles: unit tests must stay DB-independent. Integration
    // tests opt into tests/setup/testDb.ts explicitly via their own beforeEach/afterAll.
    fileParallelism: false,
  },
});
