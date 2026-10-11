import { teams } from "../src/features/tournament/data";
import { buildTournamentSchedule, GROUP_IDS } from "../src/features/tournament/schedule";
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
  | "UNKNOWN_MATCH"
  | "FIELD_NOT_PATCHABLE"
  | "INVALID_FIELD_VALUE"
  | "INVALID_MATCHES"
  | "INVALID_TEAM"
  | "DUPLICATE_TEAM"
  | "UNKNOWN_TEAM"
  | "TEAM_IN_USE";

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
  setTournamentId(id: string): void;
  read(sampleData?: boolean): TournamentState;
  readLogo(id: string): { contentType: string; dataBase64: string } | undefined;
  patchMatch(id: string, patch: Partial<Match>, sampleData?: boolean): TournamentState;
  replaceMatches(matches: Match[], sampleData?: boolean): TournamentState;
  reset(sampleData?: boolean): TournamentState;
  addTeam(team: Omit<Team, "id">, sampleData?: boolean): TournamentState;
  updateTeam(id: string, team: Omit<Team, "id">, sampleData?: boolean): TournamentState;
  deleteTeam(id: string, sampleData?: boolean): TournamentState;
  initialize(sampleData?: boolean): TournamentState;
  generateSchedule(sampleData?: boolean): TournamentState;
}

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS store_migrations (
     id TEXT PRIMARY KEY,
     applied_at TEXT NOT NULL
   )`,
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
  `CREATE TABLE IF NOT EXISTS tournament_info (
     id INTEGER PRIMARY KEY CHECK (id = 1),
     tournament_id TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS matches (
     position INTEGER PRIMARY KEY,
     id TEXT NOT NULL UNIQUE,
     data TEXT NOT NULL
   )`,
];

const SCHEDULE_DATE_MIGRATION = "schedule-date-2026-12-20";
const SCHEDULE_DATE_SHIFT_MS = 85 * 24 * 60 * 60 * 1_000;
const PREVIOUS_EVENT_START_MS = Date.parse("2026-09-25T15:00:00.000Z");
const NEXT_EVENT_START_MS = Date.parse("2026-09-26T15:00:00.000Z");

/**
 * Durable Object の SQLite に大会の state を持つ。メモリにはキャッシュしないので、
 * 休止や退避から戻っても常に保存済みの内容を返す。
 */
export function createSqlStore(storage: DurableObjectStorage, defaultSampleData = false): Store {
  const sql = storage.sql;
  for (const statement of SCHEMA) sql.exec(statement);

  const dateMigration = sql
    .exec<{ id: string }>("SELECT id FROM store_migrations WHERE id = ?", SCHEDULE_DATE_MIGRATION)
    .toArray()[0];
  if (!dateMigration) {
    storage.transactionSync(() => {
      const rows = sql.exec<{ id: string; data: string }>("SELECT id, data FROM matches").toArray();
      let migrated = 0;
      for (const row of rows) {
        const match = JSON.parse(row.data) as Match;
        const startMs = Date.parse(match.scheduledStart);
        if (startMs < PREVIOUS_EVENT_START_MS || startMs >= NEXT_EVENT_START_MS) continue;
        match.scheduledStart = new Date(startMs + SCHEDULE_DATE_SHIFT_MS).toISOString();
        sql.exec("UPDATE matches SET data = ? WHERE id = ?", JSON.stringify(match), row.id);
        migrated += 1;
      }
      if (migrated > 0) {
        sql.exec(
          `UPDATE meta
           SET version = version + 1, updated_at = ?
           WHERE id = 1`,
          new Date().toISOString(),
        );
      }
      sql.exec(
        "INSERT INTO store_migrations (id, applied_at) VALUES (?, ?)",
        SCHEDULE_DATE_MIGRATION,
        new Date().toISOString(),
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

  const insertTeams = (nextTeams: Team[]) =>
    nextTeams.forEach((team, position) =>
      sql.exec(
        "INSERT INTO teams (id, position, name, group_id, color, logo_id) VALUES (?, ?, ?, ?, ?, ?)",
        team.id,
        position,
        team.name,
        team.groupId,
        team.color,
        team.logoId ?? null,
      ),
    );

  const insertMatches = (matches: Match[]) =>
    matches.forEach((match, position) =>
      sql.exec(
        "INSERT INTO matches (position, id, data) VALUES (?, ?, ?)",
        position,
        match.id,
        JSON.stringify(match),
      ),
    );

  const ensureInitialized = (sampleData: boolean) => {
    if (readMeta()) return;
    const startingTeams = sampleData ? teams : [];
    const startingMatches = sampleData ? buildTournamentSchedule(startingTeams) : [];
    storage.transactionSync(() => {
      insertTeams(startingTeams);
      insertMatches(startingMatches);
      sql.exec(
        "INSERT INTO meta (id, version, updated_at) VALUES (1, 1, ?)",
        new Date().toISOString(),
      );
    });
  };

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

  const writeAll = (matches: Match[], sampleData: boolean) => {
    ensureInitialized(sampleData);
    const ids = new Set(matches.map((match) => match.id));
    if (ids.size !== matches.length) {
      throw new StoreError("match ids must be unique", "INVALID_MATCHES");
    }
    storage.transactionSync(() => {
      sql.exec("DELETE FROM matches");
      insertMatches(matches);
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

  const ensureTeamsEditable = (sampleData: boolean) => {
    ensureInitialized(sampleData);
    const activeMatch = readMatches().find(
      (match) => match.status !== "SCHEDULED" || match.homeScore > 0 || match.awayScore > 0,
    );
    if (activeMatch) {
      throw new StoreError(
        "teams cannot be changed after a match has started; initialize the tournament first",
        "TEAM_IN_USE",
      );
    }
  };

  const replaceTeamsAndSchedule = (nextTeams: Team[], sampleData: boolean) => {
    ensureTeamsEditable(sampleData);
    storage.transactionSync(() => {
      sql.exec("DELETE FROM matches");
      sql.exec("DELETE FROM teams");
      insertTeams(nextTeams);
      bumpVersion();
    });
    return snapshot();
  };

  const validateTeam = (team: Omit<Team, "id">) => {
    const name = typeof team.name === "string" ? team.name.trim() : "";
    if (
      !name ||
      name.length > 120 ||
      !GROUP_IDS.includes(team.groupId as (typeof GROUP_IDS)[number]) ||
      typeof team.color !== "string" ||
      !/^#[\da-f]{6}$/i.test(team.color)
    ) {
      throw new StoreError("team name, group, or color is invalid", "INVALID_TEAM");
    }
    return { ...team, name, groupId: team.groupId, color: team.color.toLowerCase() };
  };

  return {
    setTournamentId(id) {
      sql.exec(
        `INSERT INTO tournament_info (id, tournament_id) VALUES (1, ?)
         ON CONFLICT(id) DO UPDATE SET tournament_id = excluded.tournament_id`,
        id,
      );
    },
    read(sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      return snapshot();
    },

    readLogo(id) {
      const logo = readLogo(id);
      return logo ? { contentType: logo.content_type, dataBase64: logo.data_base64 } : undefined;
    },

    patchMatch(id, patch, sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
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

    replaceMatches(matches, sampleData = defaultSampleData) {
      return writeAll(matches, sampleData);
    },

    reset(sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      const currentTeams = readTeams();
      const groupCounts = new Map<string, number>();
      for (const team of currentTeams) {
        groupCounts.set(team.groupId, (groupCounts.get(team.groupId) ?? 0) + 1);
      }
      const scheduleReady =
        currentTeams.length === 40 && GROUP_IDS.every((groupId) => groupCounts.get(groupId) === 5);
      return writeAll(scheduleReady ? buildTournamentSchedule(currentTeams) : [], sampleData);
    },

    addTeam(team, sampleData = defaultSampleData) {
      ensureTeamsEditable(sampleData);
      const valid = validateTeam(team);
      const duplicate = sql
        .exec<{ id: string }>("SELECT id FROM teams WHERE lower(name) = lower(?)", valid.name)
        .toArray()[0];
      if (duplicate) throw new StoreError("team name is already in use", "DUPLICATE_TEAM");
      const nextTeams = readTeams();
      nextTeams.push({ ...valid, id: crypto.randomUUID() });
      return replaceTeamsAndSchedule(nextTeams, sampleData);
    },

    updateTeam(id, team, sampleData = defaultSampleData) {
      ensureTeamsEditable(sampleData);
      const valid = validateTeam(team);
      const current = readTeams();
      if (!current.some((item) => item.id === id)) {
        throw new StoreError(`unknown team: ${id}`, "UNKNOWN_TEAM");
      }
      if (
        current.some(
          (item) => item.id !== id && item.name.toLowerCase() === valid.name.toLowerCase(),
        )
      ) {
        throw new StoreError("team name is already in use", "DUPLICATE_TEAM");
      }
      return replaceTeamsAndSchedule(
        current.map((item) => (item.id === id ? { ...valid, id, logoId: item.logoId } : item)),
        sampleData,
      );
    },

    deleteTeam(id, sampleData = defaultSampleData) {
      ensureTeamsEditable(sampleData);
      const current = readTeams();
      if (!current.some((item) => item.id === id)) {
        throw new StoreError(`unknown team: ${id}`, "UNKNOWN_TEAM");
      }
      return replaceTeamsAndSchedule(
        current.filter((item) => item.id !== id),
        sampleData,
      );
    },

    initialize(sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      storage.transactionSync(() => {
        sql.exec("DELETE FROM matches");
        sql.exec("DELETE FROM teams");
        bumpVersion();
      });
      return snapshot();
    },

    generateSchedule(sampleData = defaultSampleData) {
      ensureTeamsEditable(sampleData);
      const currentTeams = readTeams();
      const groupCounts = new Map<string, number>();
      for (const team of currentTeams) {
        groupCounts.set(team.groupId, (groupCounts.get(team.groupId) ?? 0) + 1);
      }
      if (
        currentTeams.length !== 40 ||
        GROUP_IDS.some((groupId) => groupCounts.get(groupId) !== 5)
      ) {
        throw new StoreError(
          "the schedule requires 40 teams with exactly 5 teams in each group",
          "INVALID_TEAM",
        );
      }
      return writeAll(buildTournamentSchedule(currentTeams), sampleData);
    },
  };
}
