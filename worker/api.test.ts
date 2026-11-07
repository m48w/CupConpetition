import { env, exports } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { beforeAll, beforeEach, expect, test } from "vitest";
import type { Match, ServerMessage, TournamentState } from "../src/types";
import worker from "./index";
import { RegistrationStore } from "./registration";
import { encryptRoute } from "./route-token";

const BASE = "http://localhost";
const ROUTE_SECRET = "test-route-secret";
const validLogo = { logoContentType: "image/png", logoDataBase64: "iVBORw0KGgo=" };

const call = async (path: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  if (!headers.has("x-tournament-id")) headers.set("x-tournament-id", "test");
  const response = await exports.default.fetch(`${BASE}${path}`, { ...init, headers });
  // Unread bodies keep the Durable Object referenced, which blocks evictDurableObject.
  const body = await response.arrayBuffer();
  return new Response(body, { status: response.status, headers: response.headers });
};
const json = (method: string, body: unknown, cookie?: string): RequestInit => ({
  method,
  headers: { "content-type": "application/json", ...(cookie ? { cookie } : {}) },
  body: JSON.stringify(body),
});
const readState = async () => (await (await call("/api/state")).json()) as TournamentState;

async function loginAs(username: string, password: string): Promise<string> {
  const response = await call("/api/login", json("POST", { username, password }));
  expect(response.status).toBe(200);
  return response.headers.get("set-cookie")!.split(";")[0];
}

let superadmin: string;
let court1: string;

const patch = (id: string, body: Partial<Match>, cookie = superadmin) =>
  call(`/api/matches/${id}`, json("PATCH", body, cookie));
const reset = (cookie = superadmin) => call("/api/reset", json("POST", {}, cookie));
const firstOnCourt = (state: TournamentState, court: number) =>
  state.matches.find((m) => m.court === court)!;

async function connect() {
  // The 101 upgrade response carries a live `webSocket`; it must not be buffered like call() does.
  const response = await exports.default.fetch(`${BASE}/api/ws`, {
    headers: { Upgrade: "websocket", "x-tournament-id": "test" },
  });
  expect(response.status).toBe(101);
  const socket = response.webSocket!;
  const queue: string[] = [];
  const waiters: ((data: string) => void)[] = [];
  socket.addEventListener("message", (event) => {
    const data = event.data as string;
    const waiter = waiters.shift();
    if (waiter) waiter(data);
    else queue.push(data);
  });
  socket.accept();
  const nextRaw = () =>
    queue.length > 0
      ? Promise.resolve(queue.shift()!)
      : new Promise<string>((resolve) => waiters.push(resolve));
  const next = async () => JSON.parse(await nextRaw()) as ServerMessage;
  return { socket, next, nextRaw };
}

beforeAll(async () => {
  superadmin = await loginAs("superadmin", "superadmin1234");
  court1 = await loginAs("subadmin1", "subadmin1234");
});

beforeEach(async () => {
  expect((await reset()).status).toBe(200);
});

test("サイトルートは大会トップへ転送する（暗号化URLは作らない）", async () => {
  const response = await worker.fetch(new Request(`${BASE}/`), {
    SESSION_SECRET: ROUTE_SECRET,
  } as Env);
  expect(response.status).toBe(302);
  expect(response.headers.get("location")).toBe(`${BASE}/20261220/`);
});

test("以前の暗号化URLは、元の普通のURLへ301で戻す", async () => {
  const env = { SESSION_SECRET: ROUTE_SECRET } as Env;
  for (const route of ["/20261220/knockout", "/registration/20261220/members", "/"]) {
    const token = await encryptRoute(route, ROUTE_SECRET);
    const response = await worker.fetch(new Request(`${BASE}${token}`), env);
    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(`${BASE}${route === "/" ? "/20261220/" : route}`);
  }
});

test("有効でない暗号URLは404を返す", async () => {
  const response = await worker.fetch(new Request(`${BASE}/u/not-a-valid-token`), {
    SESSION_SECRET: ROUTE_SECRET,
  } as Env);
  expect(response.status).toBe(404);
});

test("暗号化URLを作るAPIは廃止した", async () => {
  const response = await call("/api/route-token", json("POST", { route: "/20261220/teams" }));
  expect(response.status).toBe(404);
});

test("旧管理URLは管理ログイン画面へ転送する", async () => {
  for (const pathname of ["/superadmin", "/subadmin"]) {
    const response = await worker.fetch(new Request(`${BASE}${pathname}`), {
      SESSION_SECRET: ROUTE_SECRET,
    } as Env);
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${BASE}/20261220/admin`);
  }
});

test("登録フォームのURLはSPAのHTMLを返す", async () => {
  let assetPath = "";
  const env = {
    SESSION_SECRET: ROUTE_SECRET,
    ASSETS: {
      fetch: async (request: Request) => {
        assetPath = new URL(request.url).pathname;
        return new Response("<!doctype html><head></head><body>app</body>", {
          headers: { "content-type": "text/html" },
        });
      },
    },
  } as Env;
  const page = await worker.fetch(new Request(`${BASE}/registration/20261220/members`), env);
  expect(page.status).toBe(200);
  expect(assetPath).toBe("/20261220/");
});

test("開発中の大会URLではViteのBase Pathを保って静的アセットを配信する", async () => {
  let assetPath: string | undefined;
  const env = {
    ASSETS: {
      fetch: async (request: Request) => {
        assetPath = new URL(request.url).pathname;
        return new Response("asset");
      },
    },
  } as Env;
  const response = await worker.fetch(new Request(`${BASE}/20261220/assets/app.js`), env);
  expect(response.status).toBe(200);
  expect(assetPath).toBe("/20261220/assets/app.js");
});

test("同じクラブの複数チームを登録でき、連絡先照合後のみチームのメンバーを扱える", async () => {
  const details = {
    clubName: "Brothers FC",
    representativeName: "Team Rep",
    email: "REP@example.com",
    phone: "090-1234-5678",
    ...validLogo,
  };
  const first = await call(
    "/api/registration/teams",
    json("POST", { ...details, teamName: "Brothers A FC" }),
  );
  const second = await call(
    "/api/registration/teams",
    json("POST", { ...details, teamName: "Brothers B FC" }),
  );
  expect(first.status).toBe(201);
  expect(second.status).toBe(201);
  const firstBody = (await first.json()) as { registration: { id: string; clubId: string } };
  const secondBody = (await second.json()) as { registration: { id: string; clubId: string } };
  const firstTeam = firstBody.registration;
  const secondTeam = secondBody.registration;
  expect(firstTeam.clubId).toBe(secondTeam.clubId);

  const unauthorized = await call(`/api/registration/members?teamId=${firstTeam.id}`);
  expect(unauthorized.status).toBe(401);

  const verified = await call(
    "/api/registration/verify",
    json("POST", { email: "rep@example.com", phone: "+81 90 1234 5678" }),
  );
  expect(verified.status).toBe(200);
  const verification = (await verified.json()) as { teams: { id: string }[] };
  const available = verification.teams;
  expect(available.map(({ id }) => id)).toEqual([firstTeam.id, secondTeam.id]);
  const registrationCookie = verified.headers.get("set-cookie")!.split(";")[0];

  const firstMember = await call(
    "/api/registration/members",
    json("POST", { teamId: firstTeam.id, name: "Player One", backNumber: 7 }, registrationCookie),
  );
  const sameNumberOnOtherTeam = await call(
    "/api/registration/members",
    json("POST", { teamId: secondTeam.id, name: "Player Two", backNumber: 7 }, registrationCookie),
  );
  expect(firstMember.status).toBe(201);
  expect(sameNumberOnOtherTeam.status).toBe(201);
  const adminRoster = await call("/api/admin/registrations", {
    headers: { cookie: superadmin },
  });
  const roster = (await adminRoster.json()) as {
    clubs: { name: string; teams: { teamName: string; members: { backNumber: number }[] }[] }[];
  };
  const registeredClub = roster.clubs.find((club) => club.name === "Brothers FC")!;
  expect(registeredClub.teams.find((team) => team.teamName === "Brothers A FC")?.members).toEqual([
    expect.objectContaining({ backNumber: 7 }),
  ]);

  const duplicateNumber = await call(
    "/api/registration/members",
    json(
      "POST",
      { teamId: firstTeam.id, name: "Player Duplicate", backNumber: 7 },
      registrationCookie,
    ),
  );
  expect(duplicateNumber.status).toBe(409);

  for (let backNumber = 8; backNumber <= 17; backNumber += 1) {
    const added = await call(
      "/api/registration/members",
      json(
        "POST",
        { teamId: firstTeam.id, name: `Player ${backNumber}`, backNumber },
        registrationCookie,
      ),
    );
    expect(added.status).toBe(201);
  }
  const twelfthMember = await call(
    "/api/registration/members",
    json(
      "POST",
      { teamId: firstTeam.id, name: "Player Twelve", backNumber: 18 },
      registrationCookie,
    ),
  );
  expect(twelfthMember.status).toBe(409);
});

test("チーム登録は必須連絡先を検証し、チーム名の重複を拒否する", async () => {
  const registration = {
    clubName: "Example FC",
    teamName: "Example A",
    representativeName: "Rep",
    email: "rep@example.com",
    phone: "09012345678",
    ...validLogo,
  };
  expect(
    (await call("/api/registration/teams", json("POST", { ...registration, email: "" }))).status,
  ).toBe(400);
  expect((await call("/api/registration/teams", json("POST", registration))).status).toBe(201);
  const duplicate = await call("/api/registration/teams", json("POST", registration));
  expect(duplicate.status).toBe(409);
});

test("チーム登録時のクラブロゴを検証して保存し、同クラブ内で共有する", async () => {
  const details = {
    clubName: "Shared Logo FC",
    representativeName: "Rep",
    email: "shared-logo@example.com",
    phone: "09012345678",
  };
  const first = await call(
    "/api/registration/teams",
    json("POST", {
      ...details,
      teamName: "Shared Logo A",
      logoContentType: "image/png",
      logoDataBase64: "iVBORw0KGgo=",
    }),
  );
  expect(first.status).toBe(201);
  const firstBody = (await first.json()) as {
    registration: { clubId: string; logoId: string | null };
  };
  expect(firstBody.registration.logoId).toBeTruthy();
  const second = await call(
    "/api/registration/teams",
    json("POST", {
      ...details,
      teamName: "Shared Logo B",
      logoContentType: "image/png",
      logoDataBase64: "iVBORw0KGgoAAQ==",
    }),
  );
  expect(second.status).toBe(201);
  const secondBody = (await second.json()) as {
    registration: { logoId: string | null };
  };
  expect(secondBody.registration.logoId).toBe(firstBody.registration.logoId);

  const third = await call(
    "/api/registration/teams",
    json("POST", {
      ...details,
      teamName: "Shared Logo C",
      ...validLogo,
    }),
  );
  expect(third.status).toBe(201);
  const thirdBody = (await third.json()) as {
    registration: { logoId: string | null };
  };
  expect(thirdBody.registration.logoId).toBe(firstBody.registration.logoId);
  const logo = await call(`/api/registration/clubs/${firstBody.registration.clubId}/logo`);
  expect(logo.status).toBe(200);

  const invalid = await call(
    "/api/registration/teams",
    json("POST", {
      ...details,
      teamName: "Invalid Logo Team",
      logoContentType: "image/png",
      logoDataBase64: "bm90LWltYWdl",
    }),
  );
  expect(invalid.status).toBe(400);
});

test("チーム・メンバーの個人情報はsuperadminのみが一覧できる", async () => {
  expect((await call("/api/admin/registrations")).status).toBe(401);
  expect((await call("/api/admin/registrations", { headers: { cookie: court1 } })).status).toBe(
    403,
  );
  const response = await call("/api/admin/registrations", { headers: { cookie: superadmin } });
  expect(response.status).toBe(200);
  expect(await response.json()).toHaveProperty("clubs");
});

test("登録チームを公開一覧に表示し、メンバー一括登録とSuper Admin管理を提供する", async () => {
  const registration = {
    clubName: "Batch Club",
    representativeName: "Representative",
    email: "batch@example.com",
    phone: "09012345678",
    ...validLogo,
  };
  const created = await call(
    "/api/registration/teams",
    json("POST", { ...registration, teamName: "Batch Team" }),
  );
  expect(created.status).toBe(201);
  const { registration: team } = (await created.json()) as {
    registration: { id: string; clubId: string };
  };

  const publicList = await call("/api/registration/teams");
  expect(publicList.status).toBe(200);
  const listed = (await publicList.json()) as {
    teams: Record<string, unknown>[];
  };
  const preexistingIds = listed.teams.map((listedTeam) => listedTeam.id);
  expect(listed.teams).toContainEqual(
    expect.objectContaining({ id: team.id, clubName: "Batch Club", teamName: "Batch Team" }),
  );
  expect(listed.teams[0]).not.toHaveProperty("email");
  expect(listed.teams[0]).toHaveProperty("members");

  const verified = await call(
    "/api/registration/verify",
    json("POST", { email: registration.email, phone: registration.phone }),
  );
  const registrationCookie = verified.headers.get("set-cookie")!.split(";")[0];
  const added = await call(
    "/api/registration/members",
    json(
      "POST",
      {
        teamId: team.id,
        members: [
          { name: "Player A", backNumber: 1 },
          { name: "Player B", backNumber: 2 },
        ],
      },
      registrationCookie,
    ),
  );
  expect(added.status).toBe(201);
  expect(((await added.json()) as { members: unknown[] }).members).toHaveLength(2);
  const publicRosterResponse = await call("/api/registration/teams");
  const publicRoster = (await publicRosterResponse.json()) as {
    teams: {
      id: string;
      members: { name: string; backNumber: number }[];
      email?: string;
      representativeName?: string;
    }[];
  };
  const listedTeam = publicRoster.teams.find((item) => item.id === team.id)!;
  expect(listedTeam.members).toEqual([
    expect.objectContaining({ name: "Player A", backNumber: 1 }),
    expect.objectContaining({ name: "Player B", backNumber: 2 }),
  ]);
  expect(listedTeam).not.toHaveProperty("email");
  expect(listedTeam).not.toHaveProperty("representativeName");

  const duplicate = await call(
    "/api/registration/members",
    json(
      "POST",
      {
        teamId: team.id,
        members: [
          { name: "Player C", backNumber: 3 },
          { name: "Player D", backNumber: 3 },
        ],
      },
      registrationCookie,
    ),
  );
  expect(duplicate.status).toBe(409);
  const afterDuplicate = await call(`/api/registration/members?teamId=${team.id}`, {
    headers: { cookie: registrationCookie },
  });
  expect(
    ((await afterDuplicate.json()) as { registration: { memberCount: number } }).registration
      .memberCount,
  ).toBe(2);

  expect(
    (
      await call(
        `/api/admin/registrations/teams/${team.id}`,
        json(
          "PATCH",
          {
            teamName: "Updated Batch Team",
            representativeName: "Updated Representative",
            email: "updated@example.com",
            phone: "09098765432",
          },
          superadmin,
        ),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await call(
        `/api/admin/registrations/clubs/${team.clubId}`,
        json("PATCH", { name: "Updated Batch Club" }, superadmin),
      )
    ).status,
  ).toBe(200);
  expect(
    (
      await call(
        `/api/admin/registrations/teams/${team.id}`,
        json("PATCH", { teamName: "Forbidden", ...registration }, court1),
      )
    ).status,
  ).toBe(403);

  const deleted = await call(
    `/api/admin/registrations/teams/${team.id}`,
    json("DELETE", {}, superadmin),
  );
  expect(deleted.status).toBe(200);
  const afterDelete = (await call("/api/registration/teams").then((response) =>
    response.json(),
  )) as { teams: unknown[] };
  expect(afterDelete.teams).toHaveLength(preexistingIds.length - 1);
  expect(afterDelete.teams).not.toContainEqual(expect.objectContaining({ id: team.id }));
});

test("メンバー登録締切はJSTの2026年12月12日23:59までで、サーバー側で拒否される", async () => {
  const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName("test"));
  await runInDurableObject(room, async (_instance, state) => {
    const registrations = new RegistrationStore(state.storage.sql, (callback) =>
      state.storage.transactionSync(callback),
    );
    const beforeDeadline = Date.parse("2026-12-12T14:59:59.999Z");
    // チーム登録は 12月6日までなので、その前に登録しておく。
    const team = registrations.registerTeam(
      {
        clubName: "Deadline FC",
        teamName: `Deadline ${crypto.randomUUID()}`,
        representativeName: "Rep",
        email: "deadline@example.com",
        phone: "09012345678",
        ...validLogo,
      },
      Date.parse("2026-12-01T00:00:00.000Z"),
    );
    const verified = await registrations.verifyContact(
      { email: "deadline@example.com", phone: "09012345678" },
      "test-ip",
      beforeDeadline,
    );
    expect(
      await registrations.addMember(
        team.id,
        { name: "On time", backNumber: 1 },
        verified.token,
        beforeDeadline,
      ),
    ).toMatchObject({ name: "On time", backNumber: 1 });
    await expect(
      registrations.listMembers(team.id, verified.token, beforeDeadline + 60 * 60 * 1000),
    ).rejects.toMatchObject({ code: "VERIFY_REQUIRED", status: 401 });
    await expect(
      registrations.addMember(
        team.id,
        { name: "Too late", backNumber: 2 },
        verified.token,
        Date.parse("2026-12-12T15:00:00.000Z"),
      ),
    ).rejects.toMatchObject({ code: "MEMBER_REGISTRATION_CLOSED", status: 403 });
  });
});

test("クラブロゴはsuperadminだけが画像形式を検証して登録できる", async () => {
  const registered = await call(
    "/api/registration/teams",
    json("POST", {
      clubName: "Logo FC",
      teamName: "Logo Team",
      representativeName: "Rep",
      email: "logo@example.com",
      phone: "09012345678",
      ...validLogo,
    }),
  );
  const registeredBody = (await registered.json()) as {
    registration: { clubId: string };
  };
  const invalid = await call(
    `/api/admin/registrations/clubs/${registeredBody.registration.clubId}/logo`,
    json("PUT", { contentType: "image/png", dataBase64: "bm90LWltYWdl" }, superadmin),
  );
  expect(invalid.status).toBe(400);
  const uploaded = await call(
    `/api/admin/registrations/clubs/${registeredBody.registration.clubId}/logo`,
    json("PUT", { contentType: "image/png", dataBase64: "iVBORw0KGgo=" }, superadmin),
  );
  expect(uploaded.status).toBe(200);
  const sharedLogo = await call(
    `/api/registration/clubs/${registeredBody.registration.clubId}/logo`,
  );
  expect(sharedLogo.status).toBe(200);
  expect(sharedLogo.headers.get("content-type")).toBe("image/png");
  const forbidden = await call(
    `/api/admin/registrations/clubs/${registeredBody.registration.clubId}/logo`,
    json("PUT", { contentType: "image/png", dataBase64: "iVBORw0KGgo=" }, court1),
  );
  expect(forbidden.status).toBe(403);
});

test("本人確認エラーは登録の有無を区別せず、接続元単位で試行を制限する", async () => {
  const ip = "198.51.100.24";
  const verify = () =>
    call("/api/registration/verify", {
      ...json("POST", { email: "unknown@example.com", phone: "09012345678" }),
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": ip,
      },
    });
  const first = await verify();
  const firstBody = await first.text();
  expect(first.status).toBe(401);
  expect(firstBody).not.toContain("unknown@example.com");
  for (let attempt = 1; attempt < 5; attempt += 1) {
    expect((await verify()).status).toBe(401);
  }
  const limited = await verify();
  expect(limited.status).toBe(429);
  expect(await limited.text()).not.toContain("unknown@example.com");
});

test("代表者が別チームへ切り替えると現在の本人確認セッションを失効できる", async () => {
  const teamResponse = await call(
    "/api/registration/teams",
    json("POST", {
      clubName: "Revoke FC",
      teamName: `Revoke ${crypto.randomUUID()}`,
      representativeName: "Rep",
      email: "revoke@example.com",
      phone: "09012345678",
      ...validLogo,
    }),
  );
  const teamBody = (await teamResponse.json()) as {
    registration: { id: string };
  };
  const verified = await call(
    "/api/registration/verify",
    json("POST", { email: "revoke@example.com", phone: "09012345678" }),
  );
  const cookie = verified.headers.get("set-cookie")!.split(";")[0];
  const revokeResponse = await call("/api/registration/verify", json("DELETE", {}, cookie));
  expect(revokeResponse.status).toBe(200);
  const afterRevoke = await call(`/api/registration/members?teamId=${teamBody.registration.id}`, {
    headers: { cookie },
  });
  expect(afterRevoke.status).toBe(401);
});

test("GET /api/state は未ログインでも全95試合を返す", async () => {
  const state = await readState();
  expect(state.matches).toHaveLength(95);
  expect(state.teams).toHaveLength(40);
});

test("GET /api/logos/:id はSQLiteのロゴ画像を返す", async () => {
  const logoId = `test-${crypto.randomUUID()}`;
  const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName("20261220"));
  await runInDurableObject(room, (_instance, state) => {
    state.storage.sql.exec(
      "INSERT INTO logos (id, content_type, data_base64, created_at) VALUES (?, ?, ?, ?)",
      logoId,
      "image/png",
      "AQID",
      new Date().toISOString(),
    );
  });

  const response = await call(`/api/logos/${encodeURIComponent(logoId)}`, {
    headers: { "x-tournament-id": "20261220" },
  });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("image/png");
  expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([1, 2, 3]);
});

test("PATCH /api/matches/:id がスコアを更新する", async () => {
  const [first] = (await readState()).matches;
  const response = await patch(first.id, { homeScore: 4 });
  expect(response.status).toBe(200);
  const state = (await response.json()) as TournamentState;
  expect(state.matches.find((m) => m.id === first.id)?.homeScore).toBe(4);
});

test("存在しない試合IDに 404 を返す", async () => {
  const response = await patch("NOPE", { homeScore: 1 });
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ code: "UNKNOWN_MATCH" });
});

test("許可外フィールドに 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await patch(first.id, { court: 2 });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "FIELD_NOT_PATCHABLE" });
});

test("型が不正な値に 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await patch(first.id, { homeScore: "x" as unknown as number });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_FIELD_VALUE" });
});

test("不正なJSONボディに 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await call(`/api/matches/${first.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", cookie: superadmin },
    body: "{not json",
  });
  expect(response.status).toBe(400);
});

test("POST /api/reset が全試合を未開始に戻す", async () => {
  const [first] = (await readState()).matches;
  await patch(first.id, { status: "FINISHED", homeScore: 2 });
  const state = (await (await reset()).json()) as TournamentState;
  expect(state.matches.every((m) => m.status === "SCHEDULED" && m.homeScore === 0)).toBe(true);
});

test("PUT /api/matches が全試合を置き換える", async () => {
  const replaced = (await readState()).matches.map((m) => ({ ...m, awayScore: 5 }));
  const response = await call("/api/matches", json("PUT", { matches: replaced }, superadmin));
  expect(response.status).toBe(200);
  expect((await readState()).matches.every((m) => m.awayScore === 5)).toBe(true);
});

test("PUT /api/matches の matches が配列でない場合 400 を返す", async () => {
  const response = await call("/api/matches", json("PUT", { matches: "nope" }, superadmin));
  expect(response.status).toBe(400);
});

test("PUT /api/matches の試合IDが重複していたら 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await call("/api/matches", json("PUT", { matches: [first, first] }, superadmin));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_MATCHES" });
});

test("未ログインの変更は 401 で、試合は変わらない", async () => {
  const [first] = (await readState()).matches;
  const responses = [
    await call(`/api/matches/${first.id}`, json("PATCH", { homeScore: 9 })),
    await call("/api/matches", json("PUT", { matches: [] })),
    await call("/api/reset", json("POST", {})),
  ];
  for (const response of responses) {
    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ code: "UNAUTHENTICATED" });
  }
  expect((await readState()).matches[0].homeScore).toBe(0);
});

test("x-auth-* ヘッダーを偽装しても Super-admin にはなれない", async () => {
  const response = await call("/api/reset", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-auth-username": "superadmin",
      "x-auth-device": "spoofed",
    },
    body: "{}",
  });
  expect(response.status).toBe(401);
});

test("SubAdmin は担当コートの試合を変更できる", async () => {
  const match = firstOnCourt(await readState(), 1);
  const response = await patch(match.id, { homeScore: 1 }, court1);
  expect(response.status).toBe(200);
});

test("SubAdmin が担当外コートの試合を変更すると 403 WRONG_COURT", async () => {
  const match = firstOnCourt(await readState(), 2);
  const response = await patch(match.id, { homeScore: 1 }, court1);
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "WRONG_COURT" });
  expect((await readState()).matches.find((m) => m.id === match.id)?.homeScore).toBe(0);
});

test("SubAdmin は全体リセットと全置換ができない（403 FORBIDDEN）", async () => {
  const state = await readState();
  const responses = [
    await reset(court1),
    await call("/api/matches", json("PUT", { matches: state.matches }, court1)),
  ];
  for (const response of responses) {
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ code: "FORBIDDEN" });
  }
});

test("GET /api/ws は Upgrade ヘッダーが無ければ 426 を返す", async () => {
  expect((await call("/api/ws")).status).toBe(426);
});

test("WebSocket は未ログインでも接続でき、接続時に全stateを送り、更新のたびに push する", async () => {
  const client = await connect();
  const initial = await client.next();
  expect(initial.type).toBe("state");
  expect(initial.state.matches).toHaveLength(95);

  const first = initial.state.matches[0];
  await patch(first.id, { homeScore: 2 });
  const pushed = await client.next();
  expect(pushed.state.version).toBe(initial.state.version + 1);
  expect(pushed.state.matches[0].homeScore).toBe(2);
  client.socket.close();
});

test("WebSocket で ping を送ると pong が返る", async () => {
  const client = await connect();
  await client.next();
  client.socket.send("ping");
  expect(await client.nextRaw()).toBe("pong");
  client.socket.close();
});

test("閉じた接続があっても更新は成功し、他の接続には届く", async () => {
  const closed = await connect();
  await closed.next();
  closed.socket.close();
  const open = await connect();
  const initial = await open.next();

  const first = initial.state.matches[0];
  const response = await patch(first.id, { awayScore: 3 });
  expect(response.status).toBe(200);
  expect((await open.next()).state.matches[0].awayScore).toBe(3);
  open.socket.close();
});

test("並行した PATCH がどちらも失われない", async () => {
  const [a, b] = (await readState()).matches;
  await Promise.all([patch(a.id, { homeScore: 1 }), patch(b.id, { awayScore: 1 })]);
  const state = await readState();
  expect(state.matches.find((m) => m.id === a.id)?.homeScore).toBe(1);
  expect(state.matches.find((m) => m.id === b.id)?.awayScore).toBe(1);
});

test("Durable Object が退避されても更新済みのスコアを返し、セッションも有効なまま", async () => {
  const [first] = (await readState()).matches;
  await patch(first.id, { homeScore: 6 });
  await evictDurableObject(env.TOURNAMENT.get(env.TOURNAMENT.idFromName("test")));
  expect((await readState()).matches[0].homeScore).toBe(6);
  expect((await patch(first.id, { homeScore: 7 })).status).toBe(200);
});

test("未定義のルートには 404 を返す", async () => {
  expect((await call("/api/nope")).status).toBe(404);
});

test("許可されていない大会IDには 400 を返す（新しい部屋を作らせない）", async () => {
  for (const id of ["u", "other-room"]) {
    const response = await call("/api/registration/teams", { headers: { "x-tournament-id": id } });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_TOURNAMENT_ID" });
  }
});

test("大会IDを変えても、ログインの回数制限はすり抜けられない", async () => {
  const wrong = (id: string) =>
    call("/api/login", {
      ...json("POST", { username: "subadmin2", password: "wrong" }),
      headers: { "content-type": "application/json", "x-tournament-id": id },
    });
  for (let i = 0; i < 5; i += 1) await wrong(i % 2 === 0 ? "test" : "20261220");
  const locked = await wrong("20261220");
  expect(locked.status).toBe(429);
});

const productionEnv = () => ({ ...env, APP_ENV: "production" }) as Env;
const fetchAs = (environment: Env, path: string, init?: RequestInit) =>
  worker.fetch(
    new Request(`${BASE}${path}`, init) as Request<unknown, IncomingRequestCfProperties>,
    environment,
  );

test("本番では /test/ のページを公開しない", async () => {
  for (const path of ["/test", "/test/", "/test/matches"]) {
    expect((await fetchAs(productionEnv(), path)).status).toBe(404);
  }
});

test("本番では test 大会のAPIを使えない", async () => {
  const response = await fetchAs(productionEnv(), "/api/state", {
    headers: { "x-tournament-id": "test" },
  });
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_TOURNAMENT_ID" });
});

test("本番では /test の古い暗号化URLも404にする", async () => {
  const token = await encryptRoute("/test/", env.SESSION_SECRET);
  expect((await fetchAs(productionEnv(), token)).status).toBe(404);
});

test("GET /api/env は本番かテスト環境かを返す", async () => {
  const production = await fetchAs(productionEnv(), "/api/env");
  expect(await production.json()).toEqual({ environment: "production" });
  const staging = await call("/api/env");
  expect(await staging.json()).toEqual({ environment: "staging" });
});

test("APP_ENV が無いときは本番として扱う", async () => {
  const withoutEnv = { ...env, APP_ENV: undefined } as unknown as Env;
  expect((await fetchAs(withoutEnv, "/test/")).status).toBe(404);
});

test("テスト環境（limitsEnabled: false）では締め切り後もメンバーを登録できる", async () => {
  const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName("test"));
  await runInDurableObject(room, async (_instance, state) => {
    const registrations = new RegistrationStore(
      state.storage.sql,
      (callback) => state.storage.transactionSync(callback),
      { limitsEnabled: false },
    );
    const afterDeadline = Date.parse("2026-12-13T00:00:00.000Z");
    const email = `staging-${crypto.randomUUID()}@example.com`;
    const team = registrations.registerTeam(
      {
        clubName: "Staging FC",
        teamName: `Staging ${crypto.randomUUID()}`,
        representativeName: "Rep",
        email,
        phone: "09087654321",
        ...validLogo,
      },
      afterDeadline,
    );
    const verified = await registrations.verifyContact(
      { email, phone: "09087654321" },
      `staging-ip-${crypto.randomUUID()}`,
      afterDeadline,
    );
    expect(
      await registrations.addMember(
        team.id,
        { name: "Tester", backNumber: 1 },
        verified.token,
        afterDeadline,
      ),
    ).toMatchObject({ name: "Tester", backNumber: 1 });
  });
});

test("APIの応答にセキュリティ用のヘッダーが付く", async () => {
  for (const path of ["/api/session", "/api/state"]) {
    const response = await call(path);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-frame-options")).toBe("DENY");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
  }
});

const teamInput = (overrides: Record<string, unknown> = {}) => ({
  clubName: `Club ${crypto.randomUUID()}`,
  teamName: `Team ${crypto.randomUUID()}`,
  representativeName: "Rep",
  email: `rep-${crypto.randomUUID()}@example.com`,
  phone: "09011112222",
  ...validLogo,
  ...overrides,
});

/** 空の部屋（毎回新しい Durable Object）でチーム登録を試す。 */
async function inFreshRoom(
  run: (registrations: RegistrationStore) => void | Promise<void>,
  limitsEnabled = true,
) {
  const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName(`fresh-${crypto.randomUUID()}`));
  await runInDurableObject(room, async (_instance, state) => {
    await run(
      new RegistrationStore(
        state.storage.sql,
        (callback) => state.storage.transactionSync(callback),
        { limitsEnabled },
      ),
    );
  });
}

test("チーム登録は 2026年12月6日 23:59:59 JST まで受け付け、そのあとは 409 REGISTRATION_CLOSED", async () => {
  await inFreshRoom((registrations) => {
    const lastMoment = Date.parse("2026-12-06T14:59:59.999Z");
    expect(registrations.registerTeam(teamInput(), lastMoment).teamName).toMatch(/^Team /);
    expect(() =>
      registrations.registerTeam(teamInput(), Date.parse("2026-12-06T15:00:00.000Z")),
    ).toThrow(expect.objectContaining({ code: "REGISTRATION_CLOSED", status: 409 }));
    expect(registrations.status(Date.parse("2026-12-06T15:00:00.000Z"))).toMatchObject({
      teamRegistrationClosed: true,
      teamDeadline: "2026-12-06T23:59:59+09:00",
    });
  });
});

test("40チームを超える申請は全部断る（一部だけ登録しない）", async () => {
  await inFreshRoom((registrations) => {
    const now = Date.parse("2026-11-10T00:00:00.000Z");
    const names = (count: number) =>
      Array.from({ length: count }, () => `Team ${crypto.randomUUID()}`);
    registrations.registerTeams(teamInput({ teamNames: names(38) }), now);
    expect(registrations.status(now)).toMatchObject({ registeredTeams: 38, isFull: false });
    expect(() => registrations.registerTeams(teamInput({ teamNames: names(3) }), now)).toThrow(
      expect.objectContaining({ code: "REGISTRATION_FULL", status: 409 }),
    );
    expect(registrations.status(now).registeredTeams).toBe(38);
    registrations.registerTeams(teamInput({ teamNames: names(2) }), now);
    expect(registrations.status(now)).toMatchObject({
      registeredTeams: 40,
      capacity: 40,
      isFull: true,
    });
    expect(() => registrations.registerTeam(teamInput(), now)).toThrow(
      expect.objectContaining({ code: "REGISTRATION_FULL" }),
    );
  });
});

test("テスト環境（limitsEnabled: false）では締め切り・定員をチェックしない", async () => {
  await inFreshRoom((registrations) => {
    const afterDeadline = Date.parse("2026-12-20T00:00:00.000Z");
    const names = Array.from({ length: 40 }, () => `Team ${crypto.randomUUID()}`);
    registrations.registerTeams(teamInput({ teamNames: names }), afterDeadline);
    registrations.registerTeam(teamInput(), afterDeadline);
    expect(registrations.status(afterDeadline)).toMatchObject({
      registeredTeams: 41,
      isFull: false,
      teamRegistrationClosed: false,
    });
  }, false);
});

test("GET /api/registration/status は登録数と締め切りを返す", async () => {
  const response = await call("/api/registration/status");
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({
    capacity: 40,
    teamDeadline: "2026-12-06T23:59:59+09:00",
    memberDeadline: "2026-12-12T23:59:59+09:00",
  });
});

test("お知らせ: Super Admin だけが作成・変更・削除でき、state で配信される", async () => {
  const body = { bodyEn: "Kick-off is 30 minutes late.", bodyMy: "", level: "warning" };
  expect((await call("/api/admin/announcements", json("POST", body))).status).toBe(401);
  expect((await call("/api/admin/announcements", json("POST", body, court1))).status).toBe(403);

  const created = await call("/api/admin/announcements", json("POST", body, superadmin));
  expect(created.status).toBe(201);
  const state = (await created.json()) as TournamentState;
  const announcement = state.announcements?.find((item) => item.bodyEn === body.bodyEn);
  expect(announcement).toMatchObject({ level: "warning", active: true, bodyMy: "" });

  const publicList = (await (await call("/api/announcements")).json()) as {
    announcements: { id: string }[];
  };
  expect(publicList.announcements.map((item) => item.id)).toContain(announcement!.id);

  const hidden = await call(
    `/api/admin/announcements/${announcement!.id}`,
    json("PATCH", { active: false }, superadmin),
  );
  expect(hidden.status).toBe(200);
  expect(
    ((await hidden.json()) as TournamentState).announcements?.some(
      (item) => item.id === announcement!.id,
    ),
  ).toBe(false);
  const all = (await (
    await call("/api/admin/announcements", { headers: { cookie: superadmin } })
  ).json()) as { announcements: { id: string; active: boolean }[] };
  expect(all.announcements.find((item) => item.id === announcement!.id)?.active).toBe(false);

  const removed = await call(
    `/api/admin/announcements/${announcement!.id}`,
    json("DELETE", {}, superadmin),
  );
  expect(removed.status).toBe(200);
  const missing = await call(
    `/api/admin/announcements/${announcement!.id}`,
    json("DELETE", {}, superadmin),
  );
  expect(missing.status).toBe(404);
});

test("お知らせ: 英語の本文は必須、300文字まで", async () => {
  for (const body of [
    { bodyEn: "" },
    { bodyEn: "x".repeat(301) },
    { bodyEn: "ok", level: "red" },
  ]) {
    const response = await call("/api/admin/announcements", json("POST", body, superadmin));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_ANNOUNCEMENT" });
  }
});

test("お知らせ: 公開するのは表示中の新しい3件まで", async () => {
  for (let index = 0; index < 4; index += 1) {
    await call("/api/admin/announcements", json("POST", { bodyEn: `Notice ${index}` }, superadmin));
  }
  const state = await readState();
  expect(state.announcements?.length).toBeLessThanOrEqual(3);
});

test("登録データのCSVは Super Admin だけがダウンロードでき、BOM付き", async () => {
  expect((await call("/api/admin/registrations.csv")).status).toBe(401);
  expect((await call("/api/admin/registrations.csv", { headers: { cookie: court1 } })).status).toBe(
    403,
  );
  const response = await call("/api/admin/registrations.csv", { headers: { cookie: superadmin } });
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(response.headers.get("content-disposition")).toContain("attachment");
  const bytes = new Uint8Array(await response.arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  expect(new TextDecoder().decode(bytes)).toContain("Club,Team,Representative,Email,Phone");
});

/** 登録チームを作って、その ID を返す（グループ分けのテスト用）。 */
async function registerSampleTeams(count: number, tournamentId = "20261220"): Promise<string[]> {
  const names = Array.from({ length: count }, (_, index) => `Grp ${index} ${crypto.randomUUID()}`);
  const response = await call("/api/registration/teams", {
    ...json("POST", {
      clubName: `Group Club ${crypto.randomUUID()}`,
      teamNames: names,
      representativeName: "Rep",
      email: `grp-${crypto.randomUUID()}@example.com`,
      phone: "09033334444",
      ...validLogo,
    }),
    headers: { "content-type": "application/json", "x-tournament-id": tournamentId },
  });
  expect(response.status).toBe(201);
  const body = (await response.json()) as {
    registrations?: { id: string }[];
    registration?: { id: string };
  };
  return (body.registrations ?? [body.registration!]).map((team) => team.id);
}

const asTournament = (tournamentId: string, init: RequestInit) => ({
  ...init,
  headers: { ...(init.headers as Record<string, string>), "x-tournament-id": tournamentId },
});

test("グループ分け: Super Admin だけが保存でき、登録チームの名前・ロゴで試合用チームができる", async () => {
  // 20261220 の部屋はほかのテストと共有しないよう、まず初期化する。
  await call("/api/initialize", asTournament("20261220", json("POST", {}, superadmin)));
  const ids = await registerSampleTeams(16);
  const groups = Object.fromEntries(
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((groupId, index) => [
      groupId,
      ids.slice(index * 2, index * 2 + 2),
    ]),
  );
  const put = (cookie?: string) =>
    call("/api/teams/groups", asTournament("20261220", json("PUT", { groups }, cookie)));
  expect((await put()).status).toBe(401);
  expect((await put(court1)).status).toBe(403);

  const saved = await put(superadmin);
  expect(saved.status).toBe(200);
  const state = (await saved.json()) as TournamentState;
  expect(state.teams).toHaveLength(16);
  expect(state.matches).toHaveLength(0);
  const first = state.teams[0];
  expect(first).toMatchObject({ id: ids[0], registrationTeamId: ids[0], groupId: "A" });
  expect(first.name).toMatch(/^Grp 0 /);
  expect(first.logoId).toBeTruthy();

  const draft = (await (
    await call(
      "/api/admin/group-draft",
      asTournament("20261220", { headers: { cookie: superadmin } }),
    )
  ).json()) as { groups: Record<string, string[]>; locked: boolean; candidates: unknown[] };
  expect(draft.groups.A).toEqual(ids.slice(0, 2));
  expect(draft.locked).toBe(false);
  expect(draft.candidates.length).toBeGreaterThanOrEqual(16);

  // 16チーム（各グループ2チーム）でも試合を作れる: グループ戦8試合 + 決勝トーナメント15試合。
  const schedule = await call(
    "/api/schedule",
    asTournament("20261220", json("POST", {}, superadmin)),
  );
  expect(schedule.status).toBe(200);
  const scheduled = (await schedule.json()) as TournamentState;
  expect(scheduled.matches).toHaveLength(8 + 15);

  // グループに入っている登録チームは削除できない。
  const removed = await call(
    `/api/admin/registrations/teams/${ids[0]}`,
    asTournament("20261220", json("DELETE", {}, superadmin)),
  );
  expect(removed.status).toBe(409);
  expect(await removed.json()).toMatchObject({ code: "TEAM_IN_GROUP" });

  await call("/api/initialize", asTournament("20261220", json("POST", {}, superadmin)));
});

test("グループ分け: 1グループ6チーム以上・知らないチーム・重複は保存できない", async () => {
  const ids = await registerSampleTeams(6);
  const save = (groups: Record<string, string[]>) =>
    call("/api/teams/groups", asTournament("20261220", json("PUT", { groups }, superadmin)));
  const tooLarge = await save({ A: ids });
  expect(tooLarge.status).toBe(400);
  expect(await tooLarge.json()).toMatchObject({ code: "GROUP_TOO_LARGE" });
  const unknown = await save({ A: ["no-such-team"] });
  expect(await unknown.json()).toMatchObject({ code: "UNKNOWN_REGISTRATION_TEAM" });
  const duplicate = await save({ A: [ids[0]], B: [ids[0]] });
  expect(await duplicate.json()).toMatchObject({ code: "DUPLICATE_TEAM" });
  const badShape = await save({ Z: [ids[0]] });
  expect(await badShape.json()).toMatchObject({ code: "INVALID_GROUPS" });
});

test("グループ分け: 1チームしかないグループがあると試合を作れない", async () => {
  await call("/api/initialize", asTournament("20261220", json("POST", {}, superadmin)));
  const ids = await registerSampleTeams(15);
  const groups: Record<string, string[]> = {};
  ["A", "B", "C", "D", "E", "F", "G"].forEach((groupId, index) => {
    groups[groupId] = ids.slice(index * 2, index * 2 + 2);
  });
  groups.H = [ids[14]];
  const saved = await call(
    "/api/teams/groups",
    asTournament("20261220", json("PUT", { groups }, superadmin)),
  );
  expect(saved.status).toBe(200);
  const schedule = await call(
    "/api/schedule",
    asTournament("20261220", json("POST", {}, superadmin)),
  );
  expect(schedule.status).toBe(400);
  expect(((await schedule.json()) as { error: string }).error).toContain(
    "Group H needs at least 2 teams",
  );
  await call("/api/initialize", asTournament("20261220", json("POST", {}, superadmin)));
});

// 20261220 の部屋は前のテストで登録が定員に近いので、ここからは test の部屋を使う。
test("試合の進行: グループが終わると R16 に入り、次の試合が始まったら前の結果は直せない", async () => {
  await call("/api/initialize", asTournament("test", json("POST", {}, superadmin)));
  const ids = await registerSampleTeams(16, "test");
  const groups = Object.fromEntries(
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((groupId, index) => [
      groupId,
      ids.slice(index * 2, index * 2 + 2),
    ]),
  );
  await call("/api/teams/groups", asTournament("test", json("PUT", { groups }, superadmin)));
  const state = (await (
    await call("/api/schedule", asTournament("test", json("POST", {}, superadmin)))
  ).json()) as TournamentState;
  const patchIn = (id: string, body: Partial<Match>) =>
    call(`/api/matches/${id}`, asTournament("test", json("PATCH", body, superadmin)));

  // Group A の1試合（2チームなので1試合だけ）を終わらせると、R16-1 と R16-2 に入る。
  const groupA = state.matches.find((m) => m.stage === "GROUP" && m.groupId === "A")!;
  await patchIn(groupA.id, { status: "LIVE" });
  await patchIn(groupA.id, { homeScore: 2 });
  const finished = (await (
    await patchIn(groupA.id, { status: "FINISHED" })
  ).json()) as TournamentState;
  const r16 = (id: string) => finished.matches.find((m) => m.id === id)!;
  expect(r16("R16-1").homeTeamId).toBe(groupA.homeTeamId);
  expect(r16("R16-2").awayTeamId).toBe(groupA.awayTeamId);

  // ほかのグループも終わらせると、R16-1 は A1 vs H2 になる。
  for (const match of finished.matches.filter((m) => m.stage === "GROUP" && m.groupId !== "A")) {
    await patchIn(match.id, { status: "LIVE" });
    await patchIn(match.id, { homeScore: 1 });
    await patchIn(match.id, { status: "FINISHED" });
  }

  // グループの試合に PK は入れられない。
  expect((await patchIn(groupA.id, { penaltyHomeScore: 1 })).status).toBe(400);

  // R16-1 が始まったら、Group A の結果は直せない。
  await patchIn("R16-1", { status: "LIVE" });
  const locked = await patchIn(groupA.id, { homeScore: 3 });
  expect(locked.status).toBe(409);
  expect(await locked.json()).toMatchObject({ code: "RESULT_LOCKED" });

  // 決勝トーナメントの同点は、PK の勝者がないと終われない。
  const draw = await patchIn("R16-1", { status: "FINISHED" });
  expect(draw.status).toBe(400);
  expect(await draw.json()).toMatchObject({ code: "PENALTIES_REQUIRED" });
  const pk = await patchIn("R16-1", {
    isPenaltyShootout: true,
    penaltyHomeScore: 4,
    penaltyAwayScore: 3,
  });
  expect(pk.status).toBe(200);
  expect((await patchIn("R16-1", { status: "FINISHED" })).status).toBe(200);

  await call("/api/initialize", asTournament("test", json("POST", {}, superadmin)));
});

test("同点の順番を手で決める: Super Admin だけ、グループの全チームを1回ずつ", async () => {
  await call("/api/initialize", asTournament("test", json("POST", {}, superadmin)));
  // 前のテストで登録したチームを使う（部屋の定員のため）。
  const draft = (await (
    await call("/api/admin/group-draft", asTournament("test", { headers: { cookie: superadmin } }))
  ).json()) as { candidates: { id: string }[] };
  const ids = draft.candidates.slice(0, 16).map((candidate) => candidate.id);
  const groups = Object.fromEntries(
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((groupId, index) => [
      groupId,
      ids.slice(index * 2, index * 2 + 2),
    ]),
  );
  await call("/api/teams/groups", asTournament("test", json("PUT", { groups }, superadmin)));
  const order = (teamIds: string[], cookie?: string) =>
    call("/api/groups/A/order", asTournament("test", json("PUT", { teamIds }, cookie)));
  expect((await order([ids[1], ids[0]], court1)).status).toBe(403);
  expect((await order([ids[1]], superadmin)).status).toBe(400);
  const saved = await order([ids[1], ids[0]], superadmin);
  expect(saved.status).toBe(200);
  expect(((await saved.json()) as TournamentState).groupOrders?.A).toEqual([ids[1], ids[0]]);
  await call("/api/initialize", asTournament("test", json("POST", {}, superadmin)));
});

test("得点者: QF から記録でき、点数とゴールの数が合い、Reset で消える", async () => {
  await call("/api/initialize", asTournament("test", json("POST", {}, superadmin)));
  // 前のテストで登録したチームを使う（部屋の定員のため）。
  const draft = (await (
    await call("/api/admin/group-draft", asTournament("test", { headers: { cookie: superadmin } }))
  ).json()) as { candidates: { id: string }[] };
  const ids = draft.candidates.slice(0, 16).map((candidate) => candidate.id);
  expect(ids).toHaveLength(16);
  const groups = Object.fromEntries(
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((groupId, index) => [
      groupId,
      ids.slice(index * 2, index * 2 + 2),
    ]),
  );
  await call("/api/teams/groups", asTournament("test", json("PUT", { groups }, superadmin)));
  let state = (await (
    await call("/api/schedule", asTournament("test", json("POST", {}, superadmin)))
  ).json()) as TournamentState;

  // ids[0] のチームに選手を2人入れる。
  const room = env.TOURNAMENT.get(env.TOURNAMENT.idFromName("test"));
  const memberIds = [crypto.randomUUID(), crypto.randomUUID()];
  await runInDurableObject(room, (_instance, storage) => {
    storage.storage.sql.exec("DELETE FROM registration_members WHERE team_id = ?", ids[0]);
    memberIds.forEach((memberId, index) =>
      storage.storage.sql.exec(
        `INSERT INTO registration_members (id, team_id, name, back_number, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        memberId,
        ids[0],
        `Player ${index + 1}`,
        index + 9,
        new Date().toISOString(),
      ),
    );
  });

  const patchIn = (id: string, body: Partial<Match>) =>
    call(`/api/matches/${id}`, asTournament("test", json("PATCH", body, superadmin)));
  const playHomeWin = async (id: string) => {
    await patchIn(id, { status: "LIVE" });
    await patchIn(id, { homeScore: 1 });
    return (await (await patchIn(id, { status: "FINISHED" })).json()) as TournamentState;
  };
  for (const match of state.matches.filter((m) => m.stage === "GROUP")) {
    state = await playHomeWin(match.id);
  }
  for (const match of state.matches.filter((m) => m.stage === "R16")) {
    state = await playHomeWin(match.id);
  }
  const qf = state.matches.find(
    (m) => m.stage === "QF" && (m.homeTeamId === ids[0] || m.awayTeamId === ids[0]),
  )!;
  expect(qf).toBeDefined();
  const other = qf.homeTeamId === ids[0] ? qf.awayTeamId : qf.homeTeamId;
  const addGoal = (matchId: string, body: unknown, cookie = superadmin) =>
    call(`/api/matches/${matchId}/goals`, asTournament("test", json("POST", body, cookie)));

  // R16 は得点者を記録しない。QF も始まる前は記録できない。
  const r16 = await addGoal("R16-1", { teamId: state.matches[0].homeTeamId, memberId: null });
  expect(await r16.json()).toMatchObject({ code: "GOALS_NOT_TRACKED" });
  const early = await addGoal(qf.id, { teamId: ids[0], memberId: null });
  expect(await early.json()).toMatchObject({ code: "MATCH_NOT_STARTED" });

  await patchIn(qf.id, { status: "LIVE" });
  // QF の点数は PATCH で直接変えられない。
  expect((await patchIn(qf.id, { homeScore: 1 })).status).toBe(400);

  const players = (await (
    await call(
      `/api/matches/${qf.id}/players`,
      asTournament("test", { headers: { cookie: superadmin } }),
    )
  ).json()) as { home: { id: string }[]; away: { id: string }[] };
  const mine = qf.homeTeamId === ids[0] ? players.home : players.away;
  expect(mine.map((player) => player.id)).toEqual(memberIds);

  const scored = await addGoal(qf.id, { teamId: ids[0], memberId: memberIds[0] });
  expect(scored.status).toBe(200);
  state = (await scored.json()) as TournamentState;
  const side = qf.homeTeamId === ids[0] ? "homeScore" : "awayScore";
  expect(state.matches.find((m) => m.id === qf.id)![side]).toBe(1);
  expect(state.goals).toHaveLength(1);
  expect(state.goals![0]).toMatchObject({ playerName: "Player 1", backNumber: 9, minute: 1 });

  const wrongPlayer = await addGoal(qf.id, { teamId: other, memberId: memberIds[0] });
  expect(await wrongPlayer.json()).toMatchObject({ code: "INVALID_PLAYER" });
  expect((await addGoal(qf.id, { teamId: other, memberId: null })).status).toBe(200);
  if (qf.court !== 1) {
    expect((await addGoal(qf.id, { teamId: other, memberId: null }, court1)).status).toBe(403);
  }

  // 得点者を変えても点数は変わらない。
  const goalId = state.goals![0].id;
  const changed = (await (
    await call(
      `/api/goals/${goalId}`,
      asTournament("test", json("PATCH", { memberId: memberIds[1] }, superadmin)),
    )
  ).json()) as TournamentState;
  expect(changed.goals!.find((goal) => goal.id === goalId)).toMatchObject({
    playerName: "Player 2",
  });
  expect(changed.matches.find((m) => m.id === qf.id)![side]).toBe(1);

  // 「−」は最後のゴールを消す。もう無ければ NO_GOAL。
  const removeLast = () =>
    call(
      `/api/matches/${qf.id}/goals/last?team=${ids[0]}`,
      asTournament("test", json("DELETE", {}, superadmin)),
    );
  const removed = (await (await removeLast()).json()) as TournamentState;
  expect(removed.matches.find((m) => m.id === qf.id)![side]).toBe(0);
  expect(removed.goals).toHaveLength(1);
  expect(await (await removeLast()).json()).toMatchObject({ code: "NO_GOAL" });

  const reset = (await (
    await call("/api/reset", asTournament("test", json("POST", {}, superadmin)))
  ).json()) as TournamentState;
  expect(reset.goals).toEqual([]);
  await call("/api/initialize", asTournament("test", json("POST", {}, superadmin)));
});
