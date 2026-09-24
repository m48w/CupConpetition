import { mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { beforeEach, describe, expect, test } from "vitest";
import { createStore } from "./store";

let dataDir: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), "velocity-store-"));
});

describe("createStore", () => {
  test("ファイルが無ければ初期スケジュールを作って保存する", async () => {
    const store = createStore(dataDir);
    const state = await store.read();

    expect(state.matches).toHaveLength(95);
    expect(state.matches.every((match) => match.status === "SCHEDULED")).toBe(true);
    expect(state.version).toBe(1);

    const saved = JSON.parse(await readFile(join(dataDir, "matches.json"), "utf8"));
    expect(saved.matches).toHaveLength(95);
  });

  test("patchMatch は対象の試合だけを書き換える", async () => {
    const store = createStore(dataDir);
    const before = await store.read();
    const target = before.matches[0];

    const after = await store.patchMatch(target.id, { status: "LIVE", homeScore: 2 });
    const updated = after.matches.find((match) => match.id === target.id);

    expect(updated?.status).toBe("LIVE");
    expect(updated?.homeScore).toBe(2);
    expect(after.version).toBe(before.version + 1);
    expect(after.matches.filter((match) => match.id !== target.id)).toEqual(
      before.matches.filter((match) => match.id !== target.id),
    );
  });

  test("並行した patchMatch がどちらも失われない", async () => {
    const store = createStore(dataDir);
    const state = await store.read();
    const [first, second] = state.matches;

    await Promise.all([
      store.patchMatch(first.id, { homeScore: 3 }),
      store.patchMatch(second.id, { awayScore: 5 }),
    ]);

    const final = await store.read();
    expect(final.matches.find((match) => match.id === first.id)?.homeScore).toBe(3);
    expect(final.matches.find((match) => match.id === second.id)?.awayScore).toBe(5);
  });

  test("許可外フィールドの更新を拒否する", async () => {
    const store = createStore(dataDir);
    const state = await store.read();

    await expect(
      store.patchMatch(state.matches[0].id, { court: 99 } as never),
    ).rejects.toThrow(/court/);
  });

  test("存在しない試合IDを拒否する", async () => {
    const store = createStore(dataDir);
    await store.read();

    await expect(store.patchMatch("NOPE-1", { homeScore: 1 })).rejects.toThrow(/NOPE-1/);
  });

  test("壊れた JSON を退避して初期データで復旧する", async () => {
    await writeFile(join(dataDir, "matches.json"), "{ not json", "utf8");
    const store = createStore(dataDir);
    const state = await store.read();

    expect(state.matches).toHaveLength(95);
    const files = await readdir(dataDir);
    expect(files.some((name) => name.startsWith("matches.corrupt-"))).toBe(true);
  });

  test("reset は全試合を未開始に戻す", async () => {
    const store = createStore(dataDir);
    const state = await store.read();
    await store.patchMatch(state.matches[0].id, { status: "FINISHED", homeScore: 4 });

    const reset = await store.reset();
    expect(reset.matches.every((match) => match.status === "SCHEDULED")).toBe(true);
    expect(reset.matches.every((match) => match.homeScore === 0)).toBe(true);
  });

  test("subscribe が書き込みごとに通知し、解除できる", async () => {
    const store = createStore(dataDir);
    const state = await store.read();
    const seen: number[] = [];
    const unsubscribe = store.subscribe((next) => seen.push(next.version));

    await store.patchMatch(state.matches[0].id, { homeScore: 1 });
    unsubscribe();
    await store.patchMatch(state.matches[0].id, { homeScore: 2 });

    expect(seen).toEqual([2]);
  });
});
