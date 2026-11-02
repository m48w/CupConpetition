import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "app",
          include: ["src/**/*.test.ts"],
          exclude: ["**/._*.test.ts"],
          environment: "node",
        },
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: { configPath: "./wrangler.jsonc" },
            miniflare: {
              bindings: {
                SUPERADMIN_PASSWORD: "superadmin1234",
                SUBADMIN_PASSWORD: "subadmin1234",
                SESSION_SECRET: "test-session-secret",
                // テストはサンプル大会（test）を使うので、テスト環境として動かす。
                // 本番の動きは api.test.ts で env を上書きして確認する。
                APP_ENV: "staging",
                REGISTRATION_LIMITS: "on",
              },
            },
          }),
        ],
        test: { name: "worker", include: ["worker/**/*.test.ts"], exclude: ["**/._*.test.ts"] },
      },
    ],
  },
});
