import {
  CLEARED_SESSION_COOKIE,
  publicSession,
  readSessionToken,
  verifySession,
  withIdentity,
} from "./auth";
import { jsonResponse } from "./http";
import { TournamentRoom } from "./room";

export { TournamentRoom };

const EVENT_BASE_PATH = "/20261220";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** HTML フォームは application/json を送れないので、これが他サイトからの書き込み（CSRF）を防ぐ。 */
const isJson = (request: Request) =>
  request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === "/") return new Response(null, { status: 404 });
    if (url.pathname === "/superadmin" || url.pathname === "/subadmin") {
      return Response.redirect(`${url.origin}${EVENT_BASE_PATH}/admin${url.search}`, 308);
    }
    if (url.pathname === EVENT_BASE_PATH) {
      return Response.redirect(`${url.origin}${EVENT_BASE_PATH}/`, 308);
    }
    if (url.pathname.startsWith(`${EVENT_BASE_PATH}/`)) {
      url.pathname = url.pathname.slice(EVENT_BASE_PATH.length) || "/";
      return env.ASSETS.fetch(new Request(url, request));
    }
    if (!url.pathname.startsWith("/api/")) return new Response(null, { status: 404 });

    if (MUTATING_METHODS.has(request.method) && !isJson(request)) {
      return jsonResponse(415, {
        error: "requests that change data must send content-type: application/json",
        code: "UNSUPPORTED_MEDIA_TYPE",
      });
    }

    const token = readSessionToken(request.headers.get("cookie"));
    const session = token ? await verifySession(token, env.SESSION_SECRET, Date.now()) : null;

    if (url.pathname === "/api/session" && request.method === "GET") {
      return jsonResponse(200, { session: session && publicSession(session) });
    }
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return jsonResponse(200, { session: null }, { "set-cookie": CLEARED_SESSION_COOKIE });
    }

    const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName("main"));
    return room.fetch(withIdentity(request, session));
  },
} satisfies ExportedHandler<Env>;
