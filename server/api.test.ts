import { createServer, type Server } from "node:http";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createApiHandler } from "./api";
import { createStore } from "./store";

let server: Server;
let origin: string;

beforeEach(async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "velocity-api-"));
  const handler = createApiHandler(createStore(dataDir));
  server = createServer((req, res) => handler(req, res, () => res.writeHead(404).end()));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  origin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;
});

afterEach(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test("GET /api/state が全95試合を返す", async () => {
  const response = await fetch(`${origin}/api/state`);
  expect(response.status).toBe(200);

  const state = await response.json();
  expect(state.matches).toHaveLength(95);
  expect(state.version).toBe(1);
});

test("PATCH /api/matches/:id がスコアを更新する", async () => {
  const before = await (await fetch(`${origin}/api/state`)).json();
  const target = before.matches[0];

  const response = await fetch(`${origin}/api/matches/${target.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "LIVE", homeScore: 1 }),
  });

  expect(response.status).toBe(200);
  const state = await response.json();
  expect(state.matches.find((match: { id: string }) => match.id === target.id).homeScore).toBe(1);
});

test("存在しない試合IDに 404 を返す", async () => {
  const response = await fetch(`${origin}/api/matches/NOPE-1`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ homeScore: 1 }),
  });
  expect(response.status).toBe(404);
  const body = await response.json();
  expect(body.code).toBe("UNKNOWN_MATCH");
});

test("許可外フィールドに 400 を返す", async () => {
  const before = await (await fetch(`${origin}/api/state`)).json();
  const response = await fetch(`${origin}/api/matches/${before.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ court: 99 }),
  });
  expect(response.status).toBe(400);
  const body = await response.json();
  expect(body.code).toBe("FIELD_NOT_PATCHABLE");
});

test("POST /api/reset が全試合を未開始に戻す", async () => {
  const before = await (await fetch(`${origin}/api/state`)).json();
  await fetch(`${origin}/api/matches/${before.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "FINISHED" }),
  });

  const state = await (await fetch(`${origin}/api/reset`, { method: "POST" })).json();
  expect(state.matches.every((match: { status: string }) => match.status === "SCHEDULED")).toBe(true);
});

test("GET /api/stream が接続時に全stateを流し、更新を push する", async () => {
  const controller = new AbortController();
  const response = await fetch(`${origin}/api/stream`, { signal: controller.signal });
  expect(response.headers.get("content-type")).toContain("text/event-stream");

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  const readEvent = async () => {
    let buffer = "";
    while (!buffer.includes("\n\n")) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
    }
    return buffer;
  };

  const first = await readEvent();
  expect(first).toContain("event: state");

  const state = await (await fetch(`${origin}/api/state`)).json();
  await fetch(`${origin}/api/matches/${state.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ homeScore: 7 }),
  });

  const pushed = await readEvent();
  expect(pushed).toContain('"homeScore": 7');

  controller.abort();
});

test("/api 以外は next() へ渡す", async () => {
  const response = await fetch(`${origin}/matches`);
  expect(response.status).toBe(404);
});
