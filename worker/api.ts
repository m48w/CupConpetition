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
function assertCourt(store: Store, who: Identity, matchId: string, sampleData: boolean): void {
  if (who.role === "superadmin") return;
  const match = store.read(sampleData).matches.find((m) => m.id === matchId);
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
  const sampleData = (request.headers.get("x-tournament-id") ?? "test") === "test";
  const mutated = (state: TournamentState, status = 200) => {
    broadcast(state);
    return jsonResponse(status, state);
  };

  try {
    if (path === "/api/registration/teams" && request.method === "GET") {
      return jsonResponse(200, { teams: registrations.listPublicTeams() });
    }

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
      const token = registrationAccessToken(request.headers.get("cookie"));
      if (Array.isArray(body.members)) {
        const members = await registrations.addMembers(
          body.teamId,
          body.members,
          token,
          Date.now(),
        );
        return jsonResponse(201, { members });
      }
      const member = await registrations.addMember(body.teamId, body, token, Date.now());
      return jsonResponse(201, { member });
    }

    if (path === "/api/admin/registrations" && request.method === "GET") {
      superadminOnly(identity);
      return jsonResponse(200, registrations.listClubs(Date.now()));
    }

    const adminRegistrationTeam = path.match(/^\/api\/admin\/registrations\/teams\/([^/]+)$/);
    if (adminRegistrationTeam && ["PATCH", "DELETE"].includes(request.method)) {
      superadminOnly(identity);
      let teamId: string;
      try {
        teamId = decodeURIComponent(adminRegistrationTeam[1]);
      } catch {
        throw new BadRequestError("team id must be URL encoded");
      }
      if (request.method === "PATCH") {
        registrations.updateTeam(teamId, await readJsonBody(request), Date.now());
      } else {
        registrations.deleteTeam(teamId);
      }
      return jsonResponse(200, registrations.listClubs(Date.now()));
    }

    const adminRegistrationClub = path.match(/^\/api\/admin\/registrations\/clubs\/([^/]+)$/);
    if (adminRegistrationClub && request.method === "PATCH") {
      superadminOnly(identity);
      let clubId: string;
      try {
        clubId = decodeURIComponent(adminRegistrationClub[1]);
      } catch {
        throw new BadRequestError("club id must be URL encoded");
      }
      registrations.updateClub(clubId, await readJsonBody(request), Date.now());
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

    if (path === "/api/teams" && request.method === "POST") {
      superadminOnly(identity);
      const body = (await readJsonBody(request)) as {
        name?: unknown;
        groupId?: unknown;
        color?: unknown;
      };
      return mutated(
        store.addTeam(
          {
            name: String(body.name ?? ""),
            groupId: String(body.groupId ?? ""),
            color: String(body.color ?? ""),
          },
          sampleData,
        ),
        201,
      );
    }

    const teamTarget = path.match(/^\/api\/teams\/([^/]+)$/);
    if (teamTarget && request.method === "PATCH") {
      superadminOnly(identity);
      const body = (await readJsonBody(request)) as {
        name?: unknown;
        groupId?: unknown;
        color?: unknown;
      };
      return mutated(
        store.updateTeam(
          decodeURIComponent(teamTarget[1]),
          {
            name: String(body.name ?? ""),
            groupId: String(body.groupId ?? ""),
            color: String(body.color ?? ""),
          },
          sampleData,
        ),
      );
    }

    if (teamTarget && request.method === "DELETE") {
      superadminOnly(identity);
      return mutated(store.deleteTeam(decodeURIComponent(teamTarget[1]), sampleData));
    }

    if (path === "/api/initialize" && request.method === "POST") {
      superadminOnly(identity);
      return mutated(store.initialize(sampleData));
    }

    if (path === "/api/schedule" && request.method === "POST") {
      superadminOnly(identity);
      return mutated(store.generateSchedule(sampleData));
    }

    if (path === "/api/state" && request.method === "GET") {
      return jsonResponse(200, store.read(sampleData));
    }

    if (path === "/api/reset" && request.method === "POST") {
      superadminOnly(identity);
      return mutated(store.reset(sampleData));
    }

    if (path === "/api/matches" && request.method === "PUT") {
      superadminOnly(identity);
      const body = (await readJsonBody(request)) as { matches?: Match[] };
      if (!Array.isArray(body.matches)) {
        return jsonResponse(400, { error: "matches must be an array" });
      }
      return mutated(store.replaceMatches(body.matches, sampleData));
    }

    const patchTarget = path.match(/^\/api\/matches\/(.+)$/);
    if (patchTarget && request.method === "PATCH") {
      const who = signedIn(identity);
      const id = decodeURIComponent(patchTarget[1]);
      assertCourt(store, who, id, sampleData);
      const patch = (await readJsonBody(request)) as Partial<Match>;
      return mutated(store.patchMatch(id, patch, sampleData));
    }

    return jsonResponse(404, { error: `no route for ${request.method} ${path}` });
  } catch (error) {
    if (error instanceof AuthError) {
      return jsonResponse(error.status, { error: error.message, code: error.code });
    }
    if (error instanceof StoreError) {
      const status =
        error.code === "UNKNOWN_MATCH" || error.code === "UNKNOWN_TEAM"
          ? 404
          : error.code === "DUPLICATE_TEAM" || error.code === "TEAM_IN_USE"
            ? 409
            : 400;
      return jsonResponse(status, {
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
