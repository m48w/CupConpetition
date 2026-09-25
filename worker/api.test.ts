import { env, exports } from "cloudflare:workers";
import { evictDurableObject } from "cloudflare:test";
import { beforeEach, expect, test } from "vitest";
import type { ServerMessage, TournamentState } from "../src/types";

const BASE = "http://localhost";

const call = async (path: string, init?: RequestInit) => {
  const response = await exports.default.fetch(`${BASE}${path}`, init);
  // Unread bodies keep the Durable Object referenced, which blocks evictDurableObject.
  const body = await response.arrayBuffer();
  return new Response(body, { status: response.status, headers: response.headers });
};
const json = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
const readState = async () => (await (await call("/api/state")).json()) as TournamentState;

async function connect() {
  // The 101 upgrade response carries a live `webSocket`; it must not be buffered like call() does.
  const response = await exports.default.fetch(`${BASE}/api/ws`, {
    headers: { Upgrade: "websocket" },
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

beforeEach(async () => {
  await call("/api/reset", { method: "POST" });
});

test("GET /api/state が全95試合を返す", async () => {
  const state = await readState();
  expect(state.matches).toHaveLength(95);
});

test("PATCH /api/matches/:id がスコアを更新する", async () => {
  const [first] = (await readState()).matches;
  const response = await call(`/api/matches/${first.id}`, json("PATCH", { homeScore: 4 }));
  expect(response.status).toBe(200);
  const state = (await response.json()) as TournamentState;
  expect(state.matches.find((m) => m.id === first.id)?.homeScore).toBe(4);
});

test("存在しない試合IDに 404 を返す", async () => {
  const response = await call("/api/matches/NOPE", json("PATCH", { homeScore: 1 }));
  expect(response.status).toBe(404);
  expect(await response.json()).toMatchObject({ code: "UNKNOWN_MATCH" });
});

test("許可外フィールドに 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await call(`/api/matches/${first.id}`, json("PATCH", { court: 2 }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "FIELD_NOT_PATCHABLE" });
});

test("型が不正な値に 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await call(`/api/matches/${first.id}`, json("PATCH", { homeScore: "x" }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_FIELD_VALUE" });
});

test("不正なJSONボディに 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await call(`/api/matches/${first.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: "{not json",
  });
  expect(response.status).toBe(400);
});

test("POST /api/reset が全試合を未開始に戻す", async () => {
  const [first] = (await readState()).matches;
  await call(`/api/matches/${first.id}`, json("PATCH", { status: "FINISHED", homeScore: 2 }));
  const response = await call("/api/reset", { method: "POST" });
  const state = (await response.json()) as TournamentState;
  expect(state.matches.every((m) => m.status === "SCHEDULED" && m.homeScore === 0)).toBe(true);
});

test("PUT /api/matches が全試合を置き換える", async () => {
  const replaced = (await readState()).matches.map((m) => ({ ...m, awayScore: 5 }));
  const response = await call("/api/matches", json("PUT", { matches: replaced }));
  expect(response.status).toBe(200);
  expect((await readState()).matches.every((m) => m.awayScore === 5)).toBe(true);
});

test("PUT /api/matches の matches が配列でない場合 400 を返す", async () => {
  const response = await call("/api/matches", json("PUT", { matches: "nope" }));
  expect(response.status).toBe(400);
});

test("PUT /api/matches の試合IDが重複していたら 400 を返す", async () => {
  const [first] = (await readState()).matches;
  const response = await call("/api/matches", json("PUT", { matches: [first, first] }));
  expect(response.status).toBe(400);
  expect(await response.json()).toMatchObject({ code: "INVALID_MATCHES" });
});

test("GET /api/ws は Upgrade ヘッダーが無ければ 426 を返す", async () => {
  expect((await call("/api/ws")).status).toBe(426);
});

test("WebSocket は接続時に全stateを送り、更新のたびに push する", async () => {
  const client = await connect();
  const initial = await client.next();
  expect(initial.type).toBe("state");
  expect(initial.state.matches).toHaveLength(95);

  const first = initial.state.matches[0];
  await call(`/api/matches/${first.id}`, json("PATCH", { homeScore: 2 }));
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
  const response = await call(`/api/matches/${first.id}`, json("PATCH", { awayScore: 3 }));
  expect(response.status).toBe(200);
  expect((await open.next()).state.matches[0].awayScore).toBe(3);
  open.socket.close();
});

test("並行した PATCH がどちらも失われない", async () => {
  const [a, b] = (await readState()).matches;
  await Promise.all([
    call(`/api/matches/${a.id}`, json("PATCH", { homeScore: 1 })),
    call(`/api/matches/${b.id}`, json("PATCH", { awayScore: 1 })),
  ]);
  const state = await readState();
  expect(state.matches.find((m) => m.id === a.id)?.homeScore).toBe(1);
  expect(state.matches.find((m) => m.id === b.id)?.awayScore).toBe(1);
});

test("Durable Object が退避されても更新済みのスコアを返す", async () => {
  const [first] = (await readState()).matches;
  await call(`/api/matches/${first.id}`, json("PATCH", { homeScore: 6 }));
  await evictDurableObject(env.TOURNAMENT.get(env.TOURNAMENT.idFromName("main")));
  expect((await readState()).matches[0].homeScore).toBe(6);
});

test("未定義のルートには 404 を返す", async () => {
  expect((await call("/api/nope")).status).toBe(404);
});
