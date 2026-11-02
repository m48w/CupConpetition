/// <reference types="vite/client" />

import {
  CLEARED_SESSION_COOKIE,
  publicSession,
  readSessionToken,
  verifySession,
  withIdentity,
} from "./auth";
import { jsonResponse, withSecurityHeaders } from "./http";
import { TournamentRoom } from "./room";
import { decryptRoute, isEncryptedRoute, isPublicRoute } from "./route-token";

export { TournamentRoom };

const EVENT_BASE_PATH = "/20261220";
const REGISTRATION_BASE_PATH = "/registration/20261220";
const DEFAULT_TOURNAMENT_ID = "20261220";
const TEST_TOURNAMENT_ID = "test";

/** 本番か。`APP_ENV` が無い・不明なときも本番として扱う（安全な方に倒す）。 */
const isProduction = (env: Env) => env.APP_ENV !== "staging";

/**
 * 使ってよい大会ID。ほかのIDで新しい部屋（Durable Object）を作らせない。
 * 確認用の `test` 大会はテスト環境だけで使える。
 */
/** 確認用のサンプル大会のパスか。 */
function isTestRoute(route: string): boolean {
  const path = route.split(/[?#]/, 1)[0];
  return path === "/test" || path.startsWith("/test/");
}

function isAllowedTournamentId(id: string, env: Env): boolean {
  if (id === DEFAULT_TOURNAMENT_ID) return true;
  return id === TEST_TOURNAMENT_ID && !isProduction(env);
}
/**
 * ログインの失敗回数を数える部屋。大会IDごとに分けると、
 * x-tournament-id を変えるだけで回数制限をすり抜けられるので、1つに固定する。
 */
const AUTH_ROOM_NAME = "auth";
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** HTML フォームは application/json を送れないので、これが他サイトからの書き込み（CSRF）を防ぐ。 */
const isJson = (request: Request) =>
  request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() === "application/json";

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    // 確認用のサンプル大会は本番では公開しない。テスト環境で確認する。
    if (isProduction(env) && isTestRoute(url.pathname)) return new Response(null, { status: 404 });
    if (isEncryptedRoute(url.pathname)) {
      // 以前の暗号化URL（/u/<token>）は、ブックマークやシェア済みのリンクのために
      // 復号して普通のURLへ戻す。新しい暗号化URLはもう作らない。
      const route = await decryptRoute(url.pathname.slice("/u/".length), env.SESSION_SECRET);
      if (!route || !isPublicRoute(route)) return new Response(null, { status: 404 });
      if (isProduction(env) && isTestRoute(route)) return new Response(null, { status: 404 });
      const target = new URL(route === "/" ? `${EVENT_BASE_PATH}/` : route, url.origin);
      return Response.redirect(target.toString(), 301);
    }
    if (url.pathname === "/") {
      return Response.redirect(`${url.origin}${EVENT_BASE_PATH}/`, 302);
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
    if (url.pathname === "/api/env" && request.method === "GET") {
      return jsonResponse(200, { environment: isProduction(env) ? "production" : "staging" });
    }
    if (!isAllowedTournamentId(tournamentId, env)) {
      return jsonResponse(400, { error: "invalid tournament id", code: "INVALID_TOURNAMENT_ID" });
    }
    const token = readSessionToken(request.headers.get("cookie"));
    const session = token ? await verifySession(token, env.SESSION_SECRET, Date.now()) : null;

    if (url.pathname === "/api/session" && request.method === "GET") {
      return jsonResponse(200, { session: session && publicSession(session) });
    }
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return jsonResponse(200, { session: null }, { "set-cookie": CLEARED_SESSION_COOKIE });
    }

    const roomName =
      url.pathname === "/api/login" && request.method === "POST" ? AUTH_ROOM_NAME : tournamentId;
    const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName(roomName));
    const headers = new Headers(request.headers);
    headers.set("x-tournament-id", tournamentId);
    return withSecurityHeaders(
      await room.fetch(withIdentity(new Request(request, { headers }), session)),
    );
  },
} satisfies ExportedHandler<Env>;
