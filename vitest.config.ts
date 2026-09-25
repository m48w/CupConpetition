import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "app",
          include: ["src/**/*.test.ts", "server/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [cloudflareTest({ wrangler: { configPath: "./wrangler.jsonc" } })],
        test: { name: "worker", include: ["worker/**/*.test.ts"] },
      },
    ],
  },
});
