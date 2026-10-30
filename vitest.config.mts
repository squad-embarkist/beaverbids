import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const alias = {
  "@": fileURLToPath(new URL("./src", import.meta.url)),
};

// Two projects: unit tests run in parallel first, then the integration
// tests (*.int.test.ts) run one file at a time, because they share the
// fixture rows in the local database.
export default defineConfig({
  resolve: { alias },
  test: {
    environment: "node",
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "src/**/*.test.tsx", "e2e/**/*.test.ts"],
          exclude: ["src/**/*.int.test.ts"],
          sequence: { groupOrder: 0 },
        },
      },
      {
        extends: true,
        test: {
          name: "int",
          include: ["src/**/*.int.test.ts"],
          fileParallelism: false,
          sequence: { groupOrder: 1 },
        },
      },
    ],
  },
});
