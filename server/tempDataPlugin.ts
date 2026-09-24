import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";
import { createApiHandler } from "./api";
import { createStore } from "./store";

const DATA_DIR = fileURLToPath(new URL("../TempServerData", import.meta.url));

/** 開発サーバーに TempServerData の読み書き API を差し込む。 */
export function tempDataPlugin(): Plugin {
  return {
    name: "velocity-cup-temp-data",
    configureServer(server) {
      const handler = createApiHandler(createStore(DATA_DIR));
      server.middlewares.use((req, res, next) => handler(req, res, next));
    },
  };
}
