import type { IncomingMessage, ServerResponse } from "node:http";
import { StoreError, type Store } from "./store";
import type { Match, TournamentState } from "../src/types";

const KEEPALIVE_MS = 15_000;

/** JSON リクエストボディが壊れている場合に投げる。400 にマップされる。 */
class BadRequestError extends Error {}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
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
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new BadRequestError("request body must be valid JSON");
  }
}

function streamState(res: ServerResponse, state: TournamentState): void {
  res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
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

          let closed = false;
          let unsubscribe: (() => void) | undefined;
          let keepalive: ReturnType<typeof setInterval> | undefined;

          req.on("close", () => {
            closed = true;
            if (keepalive !== undefined) clearInterval(keepalive);
            unsubscribe?.();
            keepalive = undefined;
            unsubscribe = undefined;
          });

          const initial = await store.read();
          if (closed) return;

          streamState(res, initial);
          unsubscribe = store.subscribe((state) => streamState(res, state));
          keepalive = setInterval(() => res.write(":keepalive\n\n"), KEEPALIVE_MS);
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
              sendJson(res, error.code === "UNKNOWN_MATCH" ? 404 : 400, {
                error: error.message,
                code: error.code,
              });
              return;
            }
            throw error;
          }
          return;
        }

        sendJson(res, 404, { error: `no route for ${req.method} ${path}` });
      } catch (error) {
        if (res.headersSent) {
          res.end();
          return;
        }
        if (error instanceof BadRequestError) {
          sendJson(res, 400, { error: error.message });
          return;
        }
        sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
      }
    })().catch((error) => {
      // Without this, a throw in the error path above becomes an unhandled
      // rejection and takes the whole dev server down with it.
      console.error("[api] failed while handling a request", error);
      res.destroy();
    });
  };
}
