import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { EventEmitter } from "node:events";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, test } from "vitest";
import { createApiHandler } from "./api";
import { createStore, type Store } from "./store";
import type { TournamentState } from "../src/types";

const readState = async (response: Response): Promise<TournamentState> =>
  (await response.json()) as TournamentState;

const readError = async (response: Response): Promise<{ error: string; code?: string }> =>
  (await response.json()) as { error: string; code?: string };

/** `next()` が呼ばれたことを、ハンドラ自身の catch-all 404 と区別できる形で示す。 */
const NEXT_FALLBACK_HEADER = "x-next-called";

/** WHATWG SSE の仕様（と EventSource）どおりに1フレームをパースする。 */
function parseSseFrame(block: string): { event: string; data: string } {
  let event = "";
  let data = "";
  for (const line of block.split("\n")) {
    if (line.startsWith(":")) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "data") data += (data ? "\n" : "") + value;
    else if (field === "event") event = value;
  }
  return { event, data };
}

let server: Server;
let origin: string;

beforeEach(async () => {
  const dataDir = await mkdtemp(join(tmpdir(), "velocity-api-"));
  const handler = createApiHandler(createStore(dataDir));
  server = createServer((req, res) =>
    handler(req, res, () => {
      res.setHeader(NEXT_FALLBACK_HEADER, "1");
      res.writeHead(404).end("next() fallback");
    }),
  );
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

  const state = await readState(response);
  expect(state.matches).toHaveLength(95);
  expect(state.version).toBe(1);
});

test("PATCH /api/matches/:id がスコアを更新する", async () => {
  const before = await readState(await fetch(`${origin}/api/state`));
  const target = before.matches[0];

  const response = await fetch(`${origin}/api/matches/${target.id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "LIVE", homeScore: 1 }),
  });

  expect(response.status).toBe(200);
  const state = await readState(response);
  expect(state.matches.find((match) => match.id === target.id)?.homeScore).toBe(1);
});

test("存在しない試合IDに 404 を返す", async () => {
  const response = await fetch(`${origin}/api/matches/NOPE-1`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ homeScore: 1 }),
  });
  expect(response.status).toBe(404);
  const body = await readError(response);
  expect(body.code).toBe("UNKNOWN_MATCH");
});

test("許可外フィールドに 400 を返す", async () => {
  const before = await readState(await fetch(`${origin}/api/state`));
  const response = await fetch(`${origin}/api/matches/${before.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ court: 99 }),
  });
  expect(response.status).toBe(400);
  const body = await readError(response);
  expect(body.code).toBe("FIELD_NOT_PATCHABLE");
});

test("型が不正な値に 400 を返す", async () => {
  const before = await readState(await fetch(`${origin}/api/state`));
  const response = await fetch(`${origin}/api/matches/${before.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ homeScore: "banana" }),
  });
  expect(response.status).toBe(400);
  const body = await readError(response);
  expect(body.code).toBe("INVALID_FIELD_VALUE");
});

test("不正なJSONボディに 400 を返す", async () => {
  const before = await readState(await fetch(`${origin}/api/state`));
  const response = await fetch(`${origin}/api/matches/${before.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: "{not valid json",
  });
  expect(response.status).toBe(400);
});

test("POST /api/reset が全試合を未開始に戻す", async () => {
  const before = await readState(await fetch(`${origin}/api/state`));
  await fetch(`${origin}/api/matches/${before.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "FINISHED" }),
  });

  const state = await readState(await fetch(`${origin}/api/reset`, { method: "POST" }));
  expect(state.matches.every((match) => match.status === "SCHEDULED")).toBe(true);
});

test("PUT /api/matches が全試合を置き換える", async () => {
  const before = await readState(await fetch(`${origin}/api/state`));
  const updatedMatches = before.matches.map((match, index) =>
    index === 0 ? { ...match, homeScore: 3, awayScore: 1 } : match,
  );

  const response = await fetch(`${origin}/api/matches`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ matches: updatedMatches }),
  });

  expect(response.status).toBe(200);
  const state = await readState(response);
  expect(state.matches.find((match) => match.id === before.matches[0].id)?.homeScore).toBe(3);
  expect(state.version).toBe(before.version + 1);
});

test("PUT /api/matches の matches が配列でない場合 400 を返す", async () => {
  const response = await fetch(`${origin}/api/matches`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ matches: "not-an-array" }),
  });
  expect(response.status).toBe(400);
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

  const first = parseSseFrame(await readEvent());
  expect(first.event).toBe("state");
  const initialState = JSON.parse(first.data) as TournamentState;
  expect(initialState.matches).toHaveLength(95);

  const state = await readState(await fetch(`${origin}/api/state`));
  await fetch(`${origin}/api/matches/${state.matches[0].id}`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ homeScore: 7 }),
  });

  const pushed = parseSseFrame(await readEvent());
  expect(pushed.event).toBe("state");
  const pushedState = JSON.parse(pushed.data) as TournamentState;
  expect(pushedState.matches.find((match) => match.id === state.matches[0].id)?.homeScore).toBe(7);

  controller.abort();
});

test("/api 以外は next() へ渡す", async () => {
  const response = await fetch(`${origin}/matches`);
  expect(response.status).toBe(404);
  // next() 経由の 404 であることを、ハンドラ自身の catch-all 404 と区別して確認する。
  // ハンドラの catch-all は JSON を返し、この見出しを一切設定しない。
  expect(response.headers.get(NEXT_FALLBACK_HEADER)).toBe("1");
});

/** `Store` のうち、テストで使わないメソッドは呼ばれたら失敗させておく。 */
function unimplementedStoreMethods(): Pick<Store, "patchMatch" | "replaceMatches" | "reset"> {
  return {
    patchMatch: async () => {
      throw new Error("patchMatch should not be called in this test");
    },
    replaceMatches: async () => {
      throw new Error("replaceMatches should not be called in this test");
    },
    reset: async () => {
      throw new Error("reset should not be called in this test");
    },
  };
}

test("SSE中にstore.read()が失敗してもサーバープロセスは落ちず、以後のリクエストにも応答し続ける", async () => {
  let readCalls = 0;
  const fallbackState: TournamentState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    matches: [],
  };

  // 最初の呼び出し（/api/stream から）だけ失敗させ、以降は成功させる。
  // これにより「クラッシュしない」だけでなく「サーバーが生き続けて次のリクエストも処理できる」ことまで確認する。
  const flakyStore: Store = {
    read: () => {
      readCalls += 1;
      if (readCalls === 1) return Promise.reject(new Error("simulated read failure"));
      return Promise.resolve(fallbackState);
    },
    subscribe: () => () => {},
    ...unimplementedStoreMethods(),
  };

  const handler = createApiHandler(flakyStore);
  const flakyServer = createServer((req, res) => handler(req, res, () => res.writeHead(404).end()));
  await new Promise<void>((resolve) => flakyServer.listen(0, "127.0.0.1", resolve));
  const address = flakyServer.address();
  const flakyOrigin = `http://127.0.0.1:${typeof address === "object" && address ? address.port : 0}`;

  try {
    // /api/stream already sends 200 headers before awaiting store.read(), so the failure
    // happens after headers are sent. The fetch must still resolve (not hang), proving the
    // process didn't crash trying to send a second response.
    const streamResponse = await fetch(`${flakyOrigin}/api/stream`);
    await streamResponse.body?.cancel();

    // The real assertion: the server is still alive and can serve a normal follow-up request.
    const followUp = await fetch(`${flakyOrigin}/api/state`);
    expect(followUp.status).toBe(200);
    const state = await readState(followUp);
    expect(state).toEqual(fallbackState);
  } finally {
    await new Promise((resolve) => flakyServer.close(resolve));
  }
});

test("SSE接続が最初のread完了前に切断されると、subscribeもintervalも残さない", async () => {
  let resolveRead!: (state: TournamentState) => void;
  const pendingRead = new Promise<TournamentState>((resolve) => {
    resolveRead = resolve;
  });

  let subscribeCalls = 0;
  let unsubscribeCalls = 0;
  const controlledStore: Store = {
    read: () => pendingRead,
    subscribe: () => {
      subscribeCalls += 1;
      return () => {
        unsubscribeCalls += 1;
      };
    },
    ...unimplementedStoreMethods(),
  };

  const handler = createApiHandler(controlledStore);

  // A minimal fake req/res, driven synchronously, so the timing between "client disconnects"
  // and "store.read() resolves" is exact rather than approximated with real sockets and sleeps.
  const req = new EventEmitter() as EventEmitter & { url: string; method: string };
  req.url = "/api/stream";
  req.method = "GET";

  let headersSent = false;
  const writes: string[] = [];
  const res = {
    writeHead() {
      headersSent = true;
      return res;
    },
    write(chunk: string) {
      writes.push(chunk);
      return true;
    },
    end(chunk?: string) {
      if (typeof chunk === "string") writes.push(chunk);
      headersSent = true;
    },
    destroy() {
      // no-op for the fake
    },
    get headersSent() {
      return headersSent;
    },
  };

  handler(req as unknown as IncomingMessage, res as unknown as ServerResponse, () => {
    throw new Error("next() should not be called for /api/stream");
  });

  // By the time handler() returns synchronously, the SSE branch has already run
  // `res.writeHead` and `req.on("close", ...)`, and is suspended on `await store.read()`.
  // Emitting "close" now simulates the client disconnecting while that read is still pending.
  req.emit("close");

  // Resolving the read after the disconnect is the reproduction: without the `closed` guard,
  // the handler would call subscribe() and set a keepalive interval on a connection that's
  // already gone, leaking both for the life of the process.
  resolveRead({ version: 1, updatedAt: new Date().toISOString(), matches: [] });

  // Flush the microtask queue so the resumed async function body runs to completion.
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();

  expect(subscribeCalls).toBe(0);
  expect(unsubscribeCalls).toBe(0);
  // Nothing was streamed to the dead connection either — the initial state write is
  // skipped by the same `closed` guard that prevents subscribe().
  expect(writes).toHaveLength(0);
});
