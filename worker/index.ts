/// <reference types="vite/client" />

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
const REGISTRATION_BASE_PATH = "/registration/20261220";
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
    if (url.pathname === REGISTRATION_BASE_PATH) {
      return Response.redirect(`${url.origin}${REGISTRATION_BASE_PATH}/`, 308);
    }
    if (url.pathname.startsWith(`${REGISTRATION_BASE_PATH}/`)) {
      // The dev server's Vite base is EVENT_BASE_PATH, so request its app shell
      // while keeping the original registration URL in the browser.
      url.pathname = `${EVENT_BASE_PATH}/`;
      return env.ASSETS.fetch(new Request(url, request));
    }
    if (url.pathname.startsWith(`${EVENT_BASE_PATH}/`)) {
      const assetPath = url.pathname.slice(EVENT_BASE_PATH.length);
      // Keep SPA routes under Vite's configured base path. Built assets live at
      // the root of the ASSETS binding, so strip the event prefix for files.
      if (
        !import.meta.env.DEV &&
        (assetPath.startsWith("/assets/") || /^\/[^/]+\.[^/]+$/.test(assetPath))
      ) {
        url.pathname = assetPath;
      }
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
