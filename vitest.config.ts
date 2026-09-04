import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@verbia/shared": path.resolve("packages/shared/src/index.ts") } },
  test: { globals: false }
});
