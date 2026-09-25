import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { teams } from "../src/features/tournament/data";
import { buildTournamentSchedule } from "../src/features/tournament/schedule";
import type { Match, MatchStatus, TournamentState } from "../src/types";

const FILE_NAME = "matches.json";

const MATCH_STATUSES: readonly MatchStatus[] = ["SCHEDULED", "LIVE", "PAUSED", "FINISHED"];

function isMatchStatus(value: unknown): boolean {
  return typeof value === "string" && (MATCH_STATUSES as readonly string[]).includes(value);
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isOptionalNonNegativeNumber(value: unknown): boolean {
  return value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
}

function isOptionalDateString(value: unknown): boolean {
  return value === undefined || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
}

function isBoolean(value: unknown): boolean {
  return typeof value === "boolean";
}

/** PATCH で変更を許可するフィールドと、その値の型を検証する述語。
 *  スケジュール項目は含めない。 */
export const PATCH_FIELD_VALIDATORS: Record<string, (value: unknown) => boolean> = {
  status: isMatchStatus,
  homeScore: isNonNegativeInteger,
  awayScore: isNonNegativeInteger,
  timerServerStartedAt: isOptionalDateString,
  timerElapsedSecondsAtPause: isOptionalNonNegativeNumber,
  penaltyHomeScore: isNonNegativeInteger,
  penaltyAwayScore: isNonNegativeInteger,
  isPenaltyShootout: isBoolean,
};

export interface Store {
  read(): Promise<TournamentState>;
  patchMatch(id: string, patch: Partial<Match>): Promise<TournamentState>;
  replaceMatches(matches: Match[]): Promise<TournamentState>;
  reset(): Promise<TournamentState>;
  subscribe(listener: (state: TournamentState) => void): () => void;
}

export type StoreErrorCode = "UNKNOWN_MATCH" | "FIELD_NOT_PATCHABLE" | "INVALID_FIELD_VALUE";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly code: StoreErrorCode,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

function freshState(): TournamentState {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    matches: buildTournamentSchedule(teams),
  };
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
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
      return write(freshState());
    }

    try {
      const parsed = JSON.parse(raw) as TournamentState;
      if (!Array.isArray(parsed.matches) || typeof parsed.version !== "number") {
        throw new Error("unexpected shape");
      }
      return parsed;
    } catch (error) {
      console.error("[store] matches.json is unreadable; quarantining", error);
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
    for (const listener of listeners) {
      try {
        listener(state);
      } catch (error) {
        console.error("[store] a subscriber threw; continuing", error);
      }
    }
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
        const unknownField = Object.keys(patch).find((field) => !(field in PATCH_FIELD_VALIDATORS));
        if (unknownField) {
          throw new StoreError(`field is not patchable: ${unknownField}`, "FIELD_NOT_PATCHABLE");
        }

        const invalidField = Object.entries(patch).find(
          ([field, value]) => !PATCH_FIELD_VALIDATORS[field](value),
        );
        if (invalidField) {
          throw new StoreError(
            `invalid value for field: ${invalidField[0]}`,
            "INVALID_FIELD_VALUE",
          );
        }

        const current = await load();
        if (!current.matches.some((match) => match.id === id)) {
          throw new StoreError(`unknown match: ${id}`, "UNKNOWN_MATCH");
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
