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
import { decryptRoute, encryptRoute, isEncryptedRoute, isPublicRoute } from "./route-token";

export { TournamentRoom };

const EVENT_BASE_PATH = "/20261220";
const REGISTRATION_BASE_PATH = "/registration/20261220";
const DEFAULT_TOURNAMENT_ID = "20261220";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** HTML フォームは application/json を送れないので、これが他サイトからの書き込み（CSRF）を防ぐ。 */
const isJson = (request: Request) =>
  request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    if (isEncryptedRoute(url.pathname)) {
      const route = await decryptRoute(url.pathname.slice("/u/".length), env.SESSION_SECRET);
      if (!route || !isPublicRoute(route)) return new Response(null, { status: 404 });
      const routeUrl = new URL(route, url.origin);
      const assetUrl = new URL(`${EVENT_BASE_PATH}/`, url.origin);
      const shell = await env.ASSETS.fetch(new Request(assetUrl, request));
      if (!shell.ok || !shell.headers.get("content-type")?.includes("text/html")) return shell;
      const html = await shell.text();
      const injectedRoute = JSON.stringify(
        `${routeUrl.pathname}${routeUrl.search}${routeUrl.hash}`,
      ).replace(/</g, "\\u003c");
      const headers = new Headers(shell.headers);
      headers.delete("content-length");
      headers.delete("content-encoding");
      headers.delete("etag");
      headers.set("cache-control", "no-store");
      return new Response(
        html.replace("</head>", `<script>window.__APP_ROUTE__=${injectedRoute}</script></head>`),
        {
          status: shell.status,
          statusText: shell.statusText,
          headers,
        },
      );
    }
    const isAssetRequest =
      url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith(`${EVENT_BASE_PATH}/assets/`) ||
      /^\/[^/]+\.[^/]+$/.test(url.pathname);
    if (!isAssetRequest && isPublicRoute(`${url.pathname}${url.search}${url.hash}`)) {
      const encryptedPath = await encryptRoute(
        `${url.pathname}${url.search}${url.hash}`,
        env.SESSION_SECRET,
      );
      return Response.redirect(`${url.origin}${encryptedPath}`, 302);
    }
    if (url.pathname === "/") {
      // Serve the participant portal shell while leaving `/` in the browser URL.
      url.pathname = `${EVENT_BASE_PATH}/`;
      return env.ASSETS.fetch(new Request(url, request));
    }
    if (url.pathname === "/test") {
      return Response.redirect(`${url.origin}/test/${url.search}`, 308);
    }
    if (url.pathname.startsWith("/test/")) {
      url.pathname = `${EVENT_BASE_PATH}/`;
      return env.ASSETS.fetch(new Request(url, request));
    }
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

    const tournamentId =
      request.headers.get("x-tournament-id") ??
      url.searchParams.get("tournamentId") ??
      DEFAULT_TOURNAMENT_ID;
    if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(tournamentId)) {
      return jsonResponse(400, { error: "invalid tournament id", code: "INVALID_TOURNAMENT_ID" });
    }
    if (url.pathname === "/api/route-token" && request.method === "POST") {
      let body: { route?: unknown };
      try {
        body = (await request.json()) as { route?: unknown };
      } catch {
        return jsonResponse(400, { error: "invalid route", code: "INVALID_ROUTE" });
      }
      if (typeof body.route !== "string" || !isPublicRoute(body.route)) {
        return jsonResponse(400, { error: "invalid route", code: "INVALID_ROUTE" });
      }
      return jsonResponse(200, { url: await encryptRoute(body.route, env.SESSION_SECRET) });
    }
    const token = readSessionToken(request.headers.get("cookie"));
    const session = token ? await verifySession(token, env.SESSION_SECRET, Date.now()) : null;

    if (url.pathname === "/api/session" && request.method === "GET") {
      return jsonResponse(200, { session: session && publicSession(session) });
    }
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return jsonResponse(200, { session: null }, { "set-cookie": CLEARED_SESSION_COOKIE });
    }

    const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName(tournamentId));
    const headers = new Headers(request.headers);
    headers.set("x-tournament-id", tournamentId);
    return room.fetch(withIdentity(new Request(request, { headers }), session));
  },
} satisfies ExportedHandler<Env>;
