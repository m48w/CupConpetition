import type { Match, TournamentState } from "../src/types";
import { jsonResponse } from "./http";
import { StoreError, type Store } from "./store";

/** JSON リクエストボディが壊れている場合に投げる。400 にマップされる。 */
class BadRequestError extends Error {}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError("request body must be valid JSON");
  }
}

/** `/api/*`（WebSocket 以外）を処理する。変更が成功したら broadcast を呼ぶ。 */
export async function handleApi(
  request: Request,
  store: Store,
  broadcast: (state: TournamentState) => void,
): Promise<Response> {
  const path = new URL(request.url).pathname;
  const mutated = (state: TournamentState) => {
    broadcast(state);
    return jsonResponse(200, state);
  };

  try {
    if (path === "/api/state" && request.method === "GET") {
      return jsonResponse(200, store.read());
    }

    if (path === "/api/reset" && request.method === "POST") {
      return mutated(store.reset());
    }

    if (path === "/api/matches" && request.method === "PUT") {
      const body = (await readJsonBody(request)) as { matches?: Match[] };
      if (!Array.isArray(body.matches)) {
        return jsonResponse(400, { error: "matches must be an array" });
      }
      return mutated(store.replaceMatches(body.matches));
    }

    const patchTarget = path.match(/^\/api\/matches\/(.+)$/);
    if (patchTarget && request.method === "PATCH") {
      const patch = (await readJsonBody(request)) as Partial<Match>;
      return mutated(store.patchMatch(decodeURIComponent(patchTarget[1]), patch));
    }

    return jsonResponse(404, { error: `no route for ${request.method} ${path}` });
  } catch (error) {
    if (error instanceof StoreError) {
      return jsonResponse(error.code === "UNKNOWN_MATCH" ? 404 : 400, {
        error: error.message,
        code: error.code,
      });
    }
    if (error instanceof BadRequestError) {
      return jsonResponse(400, { error: error.message });
    }
    console.error("[api] failed while handling a request", error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
}
