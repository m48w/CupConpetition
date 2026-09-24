import type { IncomingMessage, ServerResponse } from "node:http";
import { StoreError, type Store } from "./store";
import type { Match, TournamentState } from "../src/types";

const KEEPALIVE_MS = 15_000;

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function streamState(res: ServerResponse, state: TournamentState): void {
  res.write(`event: state\ndata: ${JSON.stringify(state, null, 2)}\n\n`);
}

/**
 * `/api/*` を処理し、それ以外は next() へ渡す。
 * next() を呼ばないと Vite の HMR と静的配信が止まる。
 */
export function createApiHandler(store: Store) {
  return function handle(req: IncomingMessage, res: ServerResponse, next: () => void): void {
    const url = new URL(req.url ?? "/", "http://localhost");
    const path = url.pathname;

    if (!path.startsWith("/api/")) {
      next();
      return;
    }

    void (async () => {
      try {
        if (path === "/api/state" && req.method === "GET") {
          sendJson(res, 200, await store.read());
          return;
        }

        if (path === "/api/stream" && req.method === "GET") {
          res.writeHead(200, {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-store",
            connection: "keep-alive",
          });
          streamState(res, await store.read());

          const unsubscribe = store.subscribe((state) => streamState(res, state));
          const keepalive = setInterval(() => res.write(":keepalive\n\n"), KEEPALIVE_MS);
          req.on("close", () => {
            clearInterval(keepalive);
            unsubscribe();
          });
          return;
        }

        if (path === "/api/reset" && req.method === "POST") {
          sendJson(res, 200, await store.reset());
          return;
        }

        if (path === "/api/matches" && req.method === "PUT") {
          const body = (await readJsonBody(req)) as { matches?: Match[] };
          if (!Array.isArray(body.matches)) {
            sendJson(res, 400, { error: "matches must be an array" });
            return;
          }
          sendJson(res, 200, await store.replaceMatches(body.matches));
          return;
        }

        const patchTarget = path.match(/^\/api\/matches\/(.+)$/);
        if (patchTarget && req.method === "PATCH") {
          const patch = (await readJsonBody(req)) as Partial<Match>;
          try {
            sendJson(res, 200, await store.patchMatch(decodeURIComponent(patchTarget[1]), patch));
          } catch (error) {
            if (error instanceof StoreError) {
              sendJson(res, error.code === "UNKNOWN_MATCH" ? 404 : 400, { error: error.message, code: error.code });
              return;
            }
            throw error;
          }
          return;
        }

        sendJson(res, 404, { error: `no route for ${req.method} ${path}` });
      } catch (error) {
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
    })();
  };
}
