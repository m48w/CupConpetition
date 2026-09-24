import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { teams } from "../src/data";
import { buildTournamentSchedule } from "../src/schedule";
import type { Match, TournamentState } from "../src/types";

const FILE_NAME = "matches.json";

/** PATCH で変更を許可するフィールド。スケジュール項目は含めない。 */
export const PATCHABLE_FIELDS = [
  "status",
  "homeScore",
  "awayScore",
  "timerServerStartedAt",
  "timerElapsedSecondsAtPause",
  "penaltyHomeScore",
  "penaltyAwayScore",
  "isPenaltyShootout",
] as const;

export interface Store {
  read(): Promise<TournamentState>;
  patchMatch(id: string, patch: Partial<Match>): Promise<TournamentState>;
  replaceMatches(matches: Match[]): Promise<TournamentState>;
  reset(): Promise<TournamentState>;
  subscribe(listener: (state: TournamentState) => void): () => void;
}

function freshState(): TournamentState {
  return { version: 1, updatedAt: new Date().toISOString(), matches: buildTournamentSchedule(teams) };
}

export function createStore(dataDir: string): Store {
  const filePath = join(dataDir, FILE_NAME);
  const listeners = new Set<(state: TournamentState) => void>();
  let queue: Promise<unknown> = Promise.resolve();

  async function quarantine(): Promise<void> {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await rename(filePath, join(dataDir, `matches.corrupt-${stamp}.json`));
  }

  async function write(state: TournamentState): Promise<TournamentState> {
    await mkdir(dataDir, { recursive: true });
    const temporaryPath = `${filePath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
    await rename(temporaryPath, filePath);
    return state;
  }

  async function load(): Promise<TournamentState> {
    let raw: string;
    try {
      raw = await readFile(filePath, "utf8");
    } catch {
      return write(freshState());
    }

    try {
      const parsed = JSON.parse(raw) as TournamentState;
      if (!Array.isArray(parsed.matches) || typeof parsed.version !== "number") {
        throw new Error("unexpected shape");
      }
      return parsed;
    } catch {
      await quarantine();
      return write(freshState());
    }
  }

  /** 読み取り→変更→書き込みを1件ずつ処理して lost update を防ぐ。 */
  function enqueue<T>(work: () => Promise<T>): Promise<T> {
    const result = queue.then(work, work);
    queue = result.catch(() => undefined);
    return result;
  }

  function publish(state: TournamentState): TournamentState {
    for (const listener of listeners) listener(state);
    return state;
  }

  async function commit(matches: Match[]): Promise<TournamentState> {
    const current = await load();
    const next = { version: current.version + 1, updatedAt: new Date().toISOString(), matches };
    await write(next);
    return publish(next);
  }

  return {
    read: () => enqueue(load),

    patchMatch: (id, patch) =>
      enqueue(async () => {
        const unknownField = Object.keys(patch).find(
          (field) => !PATCHABLE_FIELDS.includes(field as (typeof PATCHABLE_FIELDS)[number]),
        );
        if (unknownField) throw new Error(`field is not patchable: ${unknownField}`);

        const current = await load();
        if (!current.matches.some((match) => match.id === id)) {
          throw new Error(`unknown match: ${id}`);
        }
        return commit(
          current.matches.map((match) => (match.id === id ? { ...match, ...patch } : match)),
        );
      }),

    replaceMatches: (matches) => enqueue(() => commit(matches)),

    reset: () => enqueue(() => commit(buildTournamentSchedule(teams))),

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
