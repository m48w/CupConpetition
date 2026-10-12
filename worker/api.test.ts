import { env, exports } from "cloudflare:workers";
import { evictDurableObject, runInDurableObject } from "cloudflare:test";
import { beforeAll, beforeEach, expect, test } from "vitest";
import type { Match, ServerMessage, TournamentState } from "../src/types";
import worker from "./index";
import { RegistrationStore } from "./registration";

const BASE = "http://localhost";
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

test("ルートURLには大会アプリを表示せず404を返す", async () => {
  expect((await call("/")).status).toBe(404);
});

test("大会URLを正規の末尾スラッシュ付きURLに転送する", async () => {
  const response = await worker.fetch(new Request(`${BASE}/20261220`), {} as Env);
  expect(response.status).toBe(308);
  expect(response.headers.get("location")).toBe(`${BASE}/20261220/`);
});

test("旧管理URLを大会URL配下の管理ログインへ転送する", async () => {
  for (const pathname of ["/superadmin", "/subadmin"]) {
    const response = await worker.fetch(new Request(`${BASE}${pathname}`), {} as Env);
    expect(response.status).toBe(308);
    expect(response.headers.get("location")).toBe(`${BASE}/20261220/admin`);
  }
});

test("登録フォームの全URLをSPAへフォールバックする", async () => {
  let assetPath = "";
  const env = {
    ASSETS: {
      fetch: async (request: Request) => {
        assetPath = new URL(request.url).pathname;
        return new Response("app");
      },
    },
  } as Env;
  const response = await worker.fetch(new Request(`${BASE}/registration/20261220/members`), env);
  expect(response.status).toBe(200);
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
    const team = registrations.registerTeam(
      {
        clubName: "Deadline FC",
        teamName: `Deadline ${crypto.randomUUID()}`,
        representativeName: "Rep",
        email: "deadline@example.com",
        phone: "09012345678",
        ...validLogo,
      },
      beforeDeadline,
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
