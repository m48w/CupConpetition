import type { Match, TournamentState } from "../src/types";
import type { Identity } from "./auth";
import { jsonResponse } from "./http";
import {
  clearRegistrationAccessCookie,
  type RegistrationVerificationService,
  registrationAccessToken,
  RegistrationError,
  type RegistrationStore,
} from "./registration";
import { StoreError, type Store } from "./store";

/** JSON リクエストボディが壊れている場合に投げる。400 にマップされる。 */
class BadRequestError extends Error {}

/** ログインしていない（401）か、その操作の権限がない（403）場合に投げる。 */
class AuthError extends Error {
  constructor(
    readonly status: 401 | 403,
    message: string,
    readonly code: "UNAUTHENTICATED" | "FORBIDDEN" | "WRONG_COURT",
  ) {
    super(message);
  }
}

async function readJsonBody(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text === "") return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequestError("request body must be valid JSON");
  }
}

function signedIn(identity: Identity | null): Identity {
  if (!identity) throw new AuthError(401, "sign in to change the tournament", "UNAUTHENTICATED");
  return identity;
}

function superadminOnly(identity: Identity | null): Identity {
  const who = signedIn(identity);
  if (who.role !== "superadmin") {
    throw new AuthError(403, "only the super-admin can do this", "FORBIDDEN");
  }
  return who;
}

/** SubAdmin は担当コートの試合だけを変更できる。存在しない試合は store が 404 にする。 */
function assertCourt(store: Store, who: Identity, matchId: string): void {
  if (who.role === "superadmin") return;
  const match = store.read().matches.find((m) => m.id === matchId);
  if (match && match.court !== who.court) {
    throw new AuthError(
      403,
      `court ${who.court} accounts cannot change a court ${match.court} match`,
      "WRONG_COURT",
    );
  }
}

/** `/api/*`（WebSocket とログイン以外）を処理する。変更が成功したら broadcast を呼ぶ。 */
export async function handleApi(
  request: Request,
  store: Store,
  identity: Identity | null,
  broadcast: (state: TournamentState) => void,
  registrations: RegistrationStore,
  verification: RegistrationVerificationService,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  const mutated = (state: TournamentState) => {
    broadcast(state);
    return jsonResponse(200, state);
  };

  try {
    if (path === "/api/registration/teams" && request.method === "POST") {
      const registeredTeams = registrations.registerTeams(await readJsonBody(request), Date.now());
      return jsonResponse(
        201,
        registeredTeams.length === 1
          ? { registration: registeredTeams[0] }
          : { registrations: registeredTeams },
      );
    }

    if (path === "/api/registration/verify" && request.method === "POST") {
      const verified = await verification.verify(
        await readJsonBody(request),
        request.headers.get("cf-connecting-ip") ?? "unknown",
        Date.now(),
      );
      return jsonResponse(
        200,
        { teams: verified.teams },
        { "set-cookie": registrations.accessCookie(verified.token) },
      );
    }

    if (path === "/api/registration/verify" && request.method === "DELETE") {
      await registrations.revokeAccess(registrationAccessToken(request.headers.get("cookie")));
      return jsonResponse(
        200,
        { verified: false },
        { "set-cookie": clearRegistrationAccessCookie() },
      );
    }

    if (path === "/api/registration/members" && request.method === "GET") {
      const teamId = url.searchParams.get("teamId") ?? "";
      if (!teamId) throw new BadRequestError("teamId is required");
      const registration = await registrations.listMembers(
        teamId,
        registrationAccessToken(request.headers.get("cookie")),
        Date.now(),
      );
      return jsonResponse(200, { registration });
    }

    if (path === "/api/registration/members" && request.method === "POST") {
      const body = (await readJsonBody(request)) as Record<string, unknown>;
      if (typeof body.teamId !== "string") throw new BadRequestError("teamId is required");
      const member = await registrations.addMember(
        body.teamId,
        body,
        registrationAccessToken(request.headers.get("cookie")),
        Date.now(),
      );
      return jsonResponse(201, { member });
    }

    if (path === "/api/admin/registrations" && request.method === "GET") {
      superadminOnly(identity);
      return jsonResponse(200, registrations.listClubs(Date.now()));
    }

    const logoUpload = path.match(/^\/api\/admin\/registrations\/clubs\/([^/]+)\/logo$/);
    if (logoUpload && request.method === "PUT") {
      superadminOnly(identity);
      const body = (await readJsonBody(request)) as {
        contentType?: unknown;
        dataBase64?: unknown;
      };
      if (typeof body.contentType !== "string" || typeof body.dataBase64 !== "string") {
        throw new BadRequestError("contentType and dataBase64 are required");
      }
      let clubId: string;
      try {
        clubId = decodeURIComponent(logoUpload[1]);
      } catch {
        throw new BadRequestError("club id must be URL encoded");
      }
      const logoId = registrations.setClubLogo(
        clubId,
        body.contentType,
        body.dataBase64,
        Date.now(),
      );
      return jsonResponse(200, { logoId });
    }

    const clubLogo = path.match(/^\/api\/registration\/clubs\/([^/]+)\/logo$/);
    if (clubLogo && request.method === "GET") {
      let clubId: string;
      try {
        clubId = decodeURIComponent(clubLogo[1]);
      } catch {
        throw new BadRequestError("club id must be URL encoded");
      }
      const logo = registrations.readClubLogo(clubId);
      if (!logo) return jsonResponse(404, { error: "club logo not found" });
      const binary = atob(logo.dataBase64);
      return new Response(
        Uint8Array.from(binary, (character) => character.charCodeAt(0)),
        {
          headers: {
            "content-type": logo.contentType,
            "cache-control": "public, max-age=3600",
            "x-content-type-options": "nosniff",
          },
        },
      );
    }

    const logoTarget = path.match(/^\/api\/logos\/([^/]+)$/);
    if (logoTarget && request.method === "GET") {
      let id: string;
      try {
        id = decodeURIComponent(logoTarget[1]);
      } catch {
        throw new BadRequestError("logo id must be URL encoded");
      }
      const logo = store.readLogo(id);
      if (!logo) return jsonResponse(404, { error: "logo not found" });

      const binary = atob(logo.dataBase64);
      const data = Uint8Array.from(binary, (character) => character.charCodeAt(0));
      return new Response(data, {
        headers: {
          "content-type": logo.contentType,
          "cache-control": "public, max-age=3600",
          "x-content-type-options": "nosniff",
        },
      });
    }

    if (path === "/api/state" && request.method === "GET") {
      return jsonResponse(200, store.read());
    }

    if (path === "/api/reset" && request.method === "POST") {
      superadminOnly(identity);
      return mutated(store.reset());
    }

    if (path === "/api/matches" && request.method === "PUT") {
      superadminOnly(identity);
      const body = (await readJsonBody(request)) as { matches?: Match[] };
      if (!Array.isArray(body.matches)) {
        return jsonResponse(400, { error: "matches must be an array" });
      }
      return mutated(store.replaceMatches(body.matches));
    }

    const patchTarget = path.match(/^\/api\/matches\/(.+)$/);
    if (patchTarget && request.method === "PATCH") {
      const who = signedIn(identity);
      const id = decodeURIComponent(patchTarget[1]);
      assertCourt(store, who, id);
      const patch = (await readJsonBody(request)) as Partial<Match>;
      return mutated(store.patchMatch(id, patch));
    }

    return jsonResponse(404, { error: `no route for ${request.method} ${path}` });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse(error.status, { error: error.message, code: error.code });
    }
    if (error instanceof StoreError) {
      return jsonResponse(error.code === "UNKNOWN_MATCH" ? 404 : 400, {
        error: error.message,
        code: error.code,
      });
    }
    if (error instanceof BadRequestError) {
      return jsonResponse(400, { error: error.message });
    }
    if (error instanceof RegistrationError) {
      return jsonResponse(error.status, { error: error.message, code: error.code });
    }
    console.error("[api] failed while handling a request", error);
    return jsonResponse(500, { error: error instanceof Error ? error.message : String(error) });
  }
}
