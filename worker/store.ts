import { teams } from "../src/features/tournament/data";
import { buildTournamentSchedule } from "../src/features/tournament/schedule";
import type { Match, MatchStatus, Team, TournamentState } from "../src/types";

const MATCH_STATUSES: readonly MatchStatus[] = ["SCHEDULED", "LIVE", "PAUSED", "FINISHED"];

const isMatchStatus = (value: unknown) =>
  typeof value === "string" && (MATCH_STATUSES as readonly string[]).includes(value);
const isNonNegativeInteger = (value: unknown) =>
  typeof value === "number" && Number.isInteger(value) && value >= 0;
const isOptionalNonNegativeNumber = (value: unknown) =>
  value === undefined || (typeof value === "number" && Number.isFinite(value) && value >= 0);
const isOptionalDateString = (value: unknown) =>
  value === undefined || (typeof value === "string" && !Number.isNaN(Date.parse(value)));
const isBoolean = (value: unknown) => typeof value === "boolean";

/** PATCH で変更を許可するフィールドと、その値の型を検証する述語。スケジュール項目は含めない。 */
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

export type StoreErrorCode =
  "UNKNOWN_MATCH" | "FIELD_NOT_PATCHABLE" | "INVALID_FIELD_VALUE" | "INVALID_MATCHES";

export class StoreError extends Error {
  constructor(
    message: string,
    readonly code: StoreErrorCode,
  ) {
    super(message);
    this.name = "StoreError";
  }
}

export interface Store {
  read(): TournamentState;
  readLogo(id: string): { contentType: string; dataBase64: string } | undefined;
  patchMatch(id: string, patch: Partial<Match>): TournamentState;
  replaceMatches(matches: Match[]): TournamentState;
  reset(): TournamentState;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS logos (
     id TEXT PRIMARY KEY,
     content_type TEXT NOT NULL,
     data_base64 TEXT NOT NULL,
     created_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS teams (
     id TEXT PRIMARY KEY,
     position INTEGER NOT NULL UNIQUE,
     name TEXT NOT NULL,
     group_id TEXT NOT NULL,
     color TEXT NOT NULL,
     logo_id TEXT REFERENCES logos(id) ON DELETE SET NULL
   )`,
  `CREATE TABLE IF NOT EXISTS meta (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     version INTEGER NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS matches (
     position INTEGER PRIMARY KEY,
     id TEXT NOT NULL UNIQUE,
     data TEXT NOT NULL
   )`,
];

/**
 * Durable Object の SQLite に大会の state を持つ。メモリにはキャッシュしないので、
 * 休止や退避から戻っても常に保存済みの内容を返す。
 */
export function createSqlStore(storage: DurableObjectStorage): Store {
  const sql = storage.sql;
  for (const statement of SCHEMA) sql.exec(statement);

  const teamCount = sql
    .exec<{ count: number }>("SELECT COUNT(*) AS count FROM teams")
    .toArray()[0].count;
  if (teamCount === 0) {
    storage.transactionSync(() => {
      teams.forEach((team, position) =>
        sql.exec(
          "INSERT INTO teams (id, position, name, group_id, color, logo_id) VALUES (?, ?, ?, ?, ?, NULL)",
          team.id,
          position,
          team.name,
          team.groupId,
          team.color,
        ),
      );
    });
  }

  const readMeta = () =>
    sql
      .exec<{ version: number; updated_at: string }>(
        "SELECT version, updated_at FROM meta WHERE id = 1",
      )
      .toArray()[0];

  const readMatches = () =>
    sql
      .exec<{ data: string }>("SELECT data FROM matches ORDER BY position")
      .toArray()
      .map((row) => JSON.parse(row.data) as Match);

  const readTeams = () =>
    sql
      .exec<{
        id: string;
        name: string;
        group_id: string;
        color: string;
        logo_id: string | null;
      }>("SELECT id, name, group_id, color, logo_id FROM teams ORDER BY position")
      .toArray()
      .map((row): Team => ({
        id: row.id,
        name: row.name,
        groupId: row.group_id,
        color: row.color,
        logoId: row.logo_id,
      }));

  const readLogo = (id: string) =>
    sql
      .exec<{ content_type: string; data_base64: string }>(
        "SELECT content_type, data_base64 FROM logos WHERE id = ?",
        id,
      )
      .toArray()[0];

  /** version を1つ進める。呼び出し側のトランザクションの中で使う。 */
  const bumpVersion = () => {
    const version = (readMeta()?.version ?? 0) + 1;
    sql.exec(
      `INSERT INTO meta (id, version, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET version = excluded.version, updated_at = excluded.updated_at`,
      version,
      new Date().toISOString(),
    );
  };

  const writeAll = (matches: Match[]) => {
    const ids = new Set(matches.map((match) => match.id));
    if (ids.size !== matches.length) {
      throw new StoreError("match ids must be unique", "INVALID_MATCHES");
    }
    storage.transactionSync(() => {
      sql.exec("DELETE FROM matches");
      matches.forEach((match, position) =>
        sql.exec(
          "INSERT INTO matches (position, id, data) VALUES (?, ?, ?)",
          position,
          match.id,
          JSON.stringify(match),
        ),
      );
      bumpVersion();
    });
    return snapshot();
  };

  const snapshot = (): TournamentState => {
    const meta = readMeta();
    return {
      version: meta.version,
      updatedAt: meta.updated_at,
      teams: readTeams(),
      matches: readMatches(),
    };
  };

  return {
    read() {
      return readMeta() ? snapshot() : writeAll(buildTournamentSchedule(teams));
    },

    readLogo(id) {
      const logo = readLogo(id);
      return logo ? { contentType: logo.content_type, dataBase64: logo.data_base64 } : undefined;
    },

    patchMatch(id, patch) {
      const unknownField = Object.keys(patch).find((field) => !(field in PATCH_FIELD_VALIDATORS));
      if (unknownField) {
        throw new StoreError(`field is not patchable: ${unknownField}`, "FIELD_NOT_PATCHABLE");
      }
      const invalidField = Object.entries(patch).find(
        ([field, value]) => !PATCH_FIELD_VALIDATORS[field](value),
      );
      if (invalidField) {
        throw new StoreError(`invalid value for field: ${invalidField[0]}`, "INVALID_FIELD_VALUE");
      }

      this.read();
      const row = sql
        .exec<{ data: string }>("SELECT data FROM matches WHERE id = ?", id)
        .toArray()[0];
      if (!row) throw new StoreError(`unknown match: ${id}`, "UNKNOWN_MATCH");

      const next = { ...(JSON.parse(row.data) as Match), ...patch };
      storage.transactionSync(() => {
        sql.exec("UPDATE matches SET data = ? WHERE id = ?", JSON.stringify(next), id);
        bumpVersion();
      });
      return snapshot();
    },

    replaceMatches(matches) {
      return writeAll(matches);
    },

    reset() {
      return writeAll(buildTournamentSchedule(teams));
    },
  };
}
