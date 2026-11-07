import { teams } from "../src/features/tournament/data";
import {
  dependentsOf,
  isStarted,
  needsPenaltyWinner,
  progress,
  resultsKey,
  type GroupOrders,
} from "../src/features/tournament/progression";
import { buildTournamentSchedule, GROUP_IDS } from "../src/features/tournament/schedule";
import type {
  Announcement,
  AnnouncementLevel,
  Match,
  MatchStatus,
  Team,
  TournamentState,
} from "../src/types";

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
  | "TEAM_IN_USE"
  | "INVALID_GROUPS"
  | "RESULT_LOCKED"
  | "PENALTIES_REQUIRED"
  | "INVALID_ORDER"
  | "GROUP_TOO_LARGE"
  | "INVALID_ANNOUNCEMENT"
  | "UNKNOWN_ANNOUNCEMENT";

/** 公開するお知らせの最大件数。 */
export const MAX_PUBLIC_ANNOUNCEMENTS = 3;
const MAX_ANNOUNCEMENT_LENGTH = 300;
const ANNOUNCEMENT_LEVELS: readonly AnnouncementLevel[] = ["info", "warning"];

/** 1グループに入れられるチーム数。2チーム未満のグループがあると試合を作れない。 */
export const MIN_TEAMS_PER_GROUP = 2;
export const MAX_TEAMS_PER_GROUP = 5;

/** グループ分けで作る試合用チーム（登録チームから作る）。 */
export interface GroupedTeamInput {
  registrationTeamId: string;
  name: string;
  logoId: string | null;
  groupId: string;
}

/** グループごとの見分けやすい色（A〜H）。 */
const GROUP_COLORS: Record<string, string> = {
  A: "#f97316",
  B: "#22c55e",
  C: "#38bdf8",
  D: "#a78bfa",
  E: "#f43f5e",
  F: "#eab308",
  G: "#14b8a6",
  H: "#ec4899",
};

/** 試合を作れないときの理由（例: "Group H needs at least 2 teams"）。空なら作れる。 */
export function scheduleProblems(groupCounts: Record<string, number>): string[] {
  const problems: string[] = [];
  for (const groupId of GROUP_IDS) {
    const count = groupCounts[groupId] ?? 0;
    if (count < MIN_TEAMS_PER_GROUP) {
      problems.push(`Group ${groupId} needs at least ${MIN_TEAMS_PER_GROUP} teams`);
    } else if (count > MAX_TEAMS_PER_GROUP) {
      problems.push(`Group ${groupId} can have at most ${MAX_TEAMS_PER_GROUP} teams`);
    }
  }
  return problems;
}

export interface AnnouncementInput {
  bodyEn?: unknown;
  bodyMy?: unknown;
  level?: unknown;
  active?: unknown;
}

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
  /** グループ分けを保存する。試合用チームを作り直し、試合は消す（試合開始後はできない）。 */
  setGroups(teams: GroupedTeamInput[], sampleData?: boolean): TournamentState;
  /** 同点のチームの順番を手で決める（そのグループの全チームの並び）。 */
  setGroupOrder(groupId: string, teamIds: string[], sampleData?: boolean): TournamentState;
  /** 試合が始まっているか（グループ分けを変えられないか）。 */
  hasStartedMatch(sampleData?: boolean): boolean;
  /** 非表示も含めた全部のお知らせ（管理画面用）。 */
  listAnnouncements(): Announcement[];
  createAnnouncement(input: AnnouncementInput, sampleData?: boolean): TournamentState;
  updateAnnouncement(id: string, input: AnnouncementInput, sampleData?: boolean): TournamentState;
  deleteAnnouncement(id: string, sampleData?: boolean): TournamentState;
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
  `CREATE TABLE IF NOT EXISTS group_orders (
     group_id TEXT PRIMARY KEY,
     team_ids TEXT NOT NULL,
     results_key TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS announcements (
     id TEXT PRIMARY KEY,
     body_en TEXT NOT NULL,
     body_my TEXT NOT NULL DEFAULT '',
     level TEXT NOT NULL CHECK (level IN ('info', 'warning')),
     active INTEGER NOT NULL DEFAULT 1,
     created_at TEXT NOT NULL,
     updated_at TEXT NOT NULL
   )`,
];

type AnnouncementRow = {
  id: string;
  body_en: string;
  body_my: string;
  level: AnnouncementLevel;
  active: number;
  created_at: string;
  updated_at: string;
};

const toAnnouncement = (row: AnnouncementRow): Announcement => ({
  id: row.id,
  bodyEn: row.body_en,
  bodyMy: row.body_my,
  level: row.level,
  active: row.active === 1,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/** お知らせの入力を確かめる。`partial` なら送られた項目だけ確かめる（PATCH 用）。 */
function validateAnnouncement(input: AnnouncementInput, partial: boolean) {
  const invalid = (message: string) => new StoreError(message, "INVALID_ANNOUNCEMENT");
  const result: { bodyEn?: string; bodyMy?: string; level?: AnnouncementLevel; active?: boolean } =
    {};
  if (!partial || input.bodyEn !== undefined) {
    const bodyEn = typeof input.bodyEn === "string" ? input.bodyEn.trim() : "";
    if (!bodyEn || bodyEn.length > MAX_ANNOUNCEMENT_LENGTH) {
      throw invalid(`the English text is required (1–${MAX_ANNOUNCEMENT_LENGTH} characters)`);
    }
    result.bodyEn = bodyEn;
  }
  if (!partial || input.bodyMy !== undefined) {
    if (input.bodyMy !== undefined && typeof input.bodyMy !== "string") {
      throw invalid("the Myanmar text must be text");
    }
    const bodyMy = typeof input.bodyMy === "string" ? input.bodyMy.trim() : "";
    if (bodyMy.length > MAX_ANNOUNCEMENT_LENGTH) {
      throw invalid(`the Myanmar text must be ${MAX_ANNOUNCEMENT_LENGTH} characters or fewer`);
    }
    result.bodyMy = bodyMy;
  }
  if (!partial || input.level !== undefined) {
    const level = input.level ?? "info";
    if (!ANNOUNCEMENT_LEVELS.includes(level as AnnouncementLevel)) {
      throw invalid("level must be info or warning");
    }
    result.level = level as AnnouncementLevel;
  }
  if (input.active !== undefined) {
    if (typeof input.active !== "boolean") throw invalid("active must be true or false");
    result.active = input.active;
  } else if (!partial) {
    result.active = true;
  }
  return result;
}

const SCHEDULE_DATE_MIGRATION = "schedule-date-2026-12-20";
const TEAM_REGISTRATION_ID_MIGRATION = "teams-registration-team-id";
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

  const teamMigration = sql
    .exec<{ id: string }>(
      "SELECT id FROM store_migrations WHERE id = ?",
      TEAM_REGISTRATION_ID_MIGRATION,
    )
    .toArray()[0];
  if (!teamMigration) {
    storage.transactionSync(() => {
      const hasColumn = sql
        .exec<{ name: string }>("PRAGMA table_info(teams)")
        .toArray()
        .some((column) => column.name === "registration_team_id");
      if (!hasColumn) sql.exec("ALTER TABLE teams ADD COLUMN registration_team_id TEXT");
      sql.exec(
        "INSERT INTO store_migrations (id, applied_at) VALUES (?, ?)",
        TEAM_REGISTRATION_ID_MIGRATION,
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
        registration_team_id: string | null;
      }>(
        "SELECT id, name, group_id, color, logo_id, registration_team_id FROM teams ORDER BY position",
      )
      .toArray()
      .map((row): Team => ({
        id: row.id,
        name: row.name,
        groupId: row.group_id,
        color: row.color,
        logoId: row.logo_id,
        registrationTeamId: row.registration_team_id,
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
        `INSERT INTO teams (id, position, name, group_id, color, logo_id, registration_team_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        team.id,
        position,
        team.name,
        team.groupId,
        team.color,
        team.logoId ?? null,
        team.registrationTeamId ?? null,
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

  /** 今の結果に合う、手で決めた順番だけ（結果が変わったものは使わない）。 */
  const readGroupOrders = (matches: Match[]): GroupOrders => {
    const orders: GroupOrders = {};
    for (const row of sql
      .exec<{ group_id: string; team_ids: string; results_key: string }>(
        "SELECT group_id, team_ids, results_key FROM group_orders",
      )
      .toArray()) {
      if (row.results_key !== resultsKey(row.group_id, matches)) continue;
      try {
        const ids = JSON.parse(row.team_ids) as unknown;
        if (Array.isArray(ids)) orders[row.group_id] = ids.map(String);
      } catch {
        // 壊れた行は使わない。
      }
    }
    return orders;
  };

  /** 決勝トーナメントのチームを埋めてから保存する（グループの順位・勝者の進出）。 */
  const withProgress = (matches: Match[]) =>
    progress(readTeams(), matches, readGroupOrders(matches));

  const writeAll = (input: Match[], sampleData: boolean) => {
    ensureInitialized(sampleData);
    const ids = new Set(input.map((match) => match.id));
    if (ids.size !== input.length) {
      throw new StoreError("match ids must be unique", "INVALID_MATCHES");
    }
    const matches = withProgress(input);
    storage.transactionSync(() => {
      sql.exec("DELETE FROM matches");
      insertMatches(matches);
      bumpVersion();
    });
    return snapshot();
  };

  const readAnnouncements = (activeOnly: boolean) =>
    sql
      .exec<AnnouncementRow>(
        `SELECT id, body_en, body_my, level, active, created_at, updated_at
         FROM announcements ${activeOnly ? "WHERE active = 1" : ""}
         ORDER BY created_at DESC, id DESC
         ${activeOnly ? `LIMIT ${MAX_PUBLIC_ANNOUNCEMENTS}` : ""}`,
      )
      .toArray()
      .map(toAnnouncement);

  const snapshot = (): TournamentState => {
    const meta = readMeta();
    return {
      version: meta.version,
      updatedAt: meta.updated_at,
      teams: readTeams(),
      matches: readMatches(),
      announcements: readAnnouncements(true),
      groupOrders: readGroupOrders(readMatches()),
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
      // チームが変わったら、手で決めた順番も使えないので消す。
      sql.exec("DELETE FROM group_orders");
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

      const current = JSON.parse(row.data) as Match;
      const next = { ...current, ...patch };
      const touchesPenalties = Object.keys(patch).some((field) =>
        ["isPenaltyShootout", "penaltyHomeScore", "penaltyAwayScore"].includes(field),
      );
      if (current.stage === "GROUP" && touchesPenalties) {
        throw new StoreError("group matches have no penalty shoot-out", "FIELD_NOT_PATCHABLE");
      }
      const touchesResult =
        touchesPenalties ||
        ["status", "homeScore", "awayScore"].some(
          (field) =>
            field in patch && patch[field as keyof Match] !== current[field as keyof Match],
        );
      const all = readMatches();
      // 終わった試合の結果は、その結果でチームが決まる次の試合が始まったら変えられない。
      if (current.status === "FINISHED" && touchesResult) {
        const started = dependentsOf(current, all).find(isStarted);
        if (started) {
          throw new StoreError(
            `the next match (${started.id}) has already started; this result can no longer be changed`,
            "RESULT_LOCKED",
          );
        }
      }
      if (next.status === "FINISHED" && needsPenaltyWinner(next)) {
        throw new StoreError(
          "enter the penalty shoot-out result before finishing a drawn knockout match",
          "PENALTIES_REQUIRED",
        );
      }
      const before = all.map((match) => (match.id === id ? next : match));
      const after = withProgress(before);
      storage.transactionSync(() => {
        for (const match of after) {
          const original = all.find((candidate) => candidate.id === match.id);
          if (match !== original) {
            sql.exec("UPDATE matches SET data = ? WHERE id = ?", JSON.stringify(match), match.id);
          }
        }
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
      const groupCounts: Record<string, number> = {};
      for (const team of currentTeams) {
        groupCounts[team.groupId] = (groupCounts[team.groupId] ?? 0) + 1;
      }
      const scheduleReady = scheduleProblems(groupCounts).length === 0;
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
        sql.exec("DELETE FROM group_orders");
        bumpVersion();
      });
      return snapshot();
    },

    generateSchedule(sampleData = defaultSampleData) {
      ensureTeamsEditable(sampleData);
      const currentTeams = readTeams();
      const groupCounts: Record<string, number> = {};
      for (const team of currentTeams) {
        groupCounts[team.groupId] = (groupCounts[team.groupId] ?? 0) + 1;
      }
      const problems = scheduleProblems(groupCounts);
      if (problems.length > 0) {
        throw new StoreError(
          `the schedule needs 8 groups of ${MIN_TEAMS_PER_GROUP}–${MAX_TEAMS_PER_GROUP} teams: ${problems.join("; ")}`,
          "INVALID_TEAM",
        );
      }
      return writeAll(buildTournamentSchedule(currentTeams), sampleData);
    },

    hasStartedMatch(sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      return readMatches().some(
        (match) => match.status !== "SCHEDULED" || match.homeScore > 0 || match.awayScore > 0,
      );
    },

    setGroups(input, sampleData = defaultSampleData) {
      const counts: Record<string, number> = {};
      for (const team of input) {
        if (!GROUP_IDS.includes(team.groupId as (typeof GROUP_IDS)[number])) {
          throw new StoreError(`unknown group: ${team.groupId}`, "INVALID_GROUPS");
        }
        counts[team.groupId] = (counts[team.groupId] ?? 0) + 1;
        if (counts[team.groupId] > MAX_TEAMS_PER_GROUP) {
          throw new StoreError(
            `group ${team.groupId} can have at most ${MAX_TEAMS_PER_GROUP} teams`,
            "GROUP_TOO_LARGE",
          );
        }
      }
      const ids = new Set(input.map((team) => team.registrationTeamId));
      if (ids.size !== input.length) {
        throw new StoreError("a team appears in more than one place", "DUPLICATE_TEAM");
      }
      // グループ順・入れた順に並べる（画面と同じ順）。
      const ordered = GROUP_IDS.flatMap((groupId) =>
        input.filter((team) => team.groupId === groupId),
      );
      return replaceTeamsAndSchedule(
        ordered.map((team) => ({
          // 登録チームの ID をそのまま使う（保存し直しても同じ ID なので、マイチームが消えない）。
          id: team.registrationTeamId,
          name: team.name,
          groupId: team.groupId,
          color: GROUP_COLORS[team.groupId],
          logoId: team.logoId,
          registrationTeamId: team.registrationTeamId,
        })),
        sampleData,
      );
    },

    setGroupOrder(groupId, teamIds, sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      const inGroup = readTeams()
        .filter((team) => team.groupId === groupId)
        .map((team) => team.id);
      if (
        !GROUP_IDS.includes(groupId as (typeof GROUP_IDS)[number]) ||
        teamIds.length !== inGroup.length ||
        new Set(teamIds).size !== teamIds.length ||
        teamIds.some((id) => !inGroup.includes(id))
      ) {
        throw new StoreError("teamIds must list every team in the group once", "INVALID_ORDER");
      }
      const matches = readMatches();
      storage.transactionSync(() => {
        sql.exec(
          `INSERT INTO group_orders (group_id, team_ids, results_key, updated_at) VALUES (?, ?, ?, ?)
           ON CONFLICT(group_id) DO UPDATE SET team_ids = excluded.team_ids,
             results_key = excluded.results_key, updated_at = excluded.updated_at`,
          groupId,
          JSON.stringify(teamIds),
          resultsKey(groupId, matches),
          new Date().toISOString(),
        );
      });
      return writeAll(matches, sampleData);
    },

    listAnnouncements() {
      return readAnnouncements(false);
    },

    createAnnouncement(input, sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      const value = validateAnnouncement(input, false);
      const now = new Date().toISOString();
      storage.transactionSync(() => {
        sql.exec(
          `INSERT INTO announcements (id, body_en, body_my, level, active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          crypto.randomUUID(),
          value.bodyEn!,
          value.bodyMy ?? "",
          value.level ?? "info",
          value.active === false ? 0 : 1,
          now,
          now,
        );
        bumpVersion();
      });
      return snapshot();
    },

    updateAnnouncement(id, input, sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      const row = sql
        .exec<AnnouncementRow>("SELECT * FROM announcements WHERE id = ?", id)
        .toArray()[0];
      if (!row) throw new StoreError(`unknown announcement: ${id}`, "UNKNOWN_ANNOUNCEMENT");
      const value = validateAnnouncement(input, true);
      storage.transactionSync(() => {
        sql.exec(
          `UPDATE announcements
           SET body_en = ?, body_my = ?, level = ?, active = ?, updated_at = ?
           WHERE id = ?`,
          value.bodyEn ?? row.body_en,
          value.bodyMy ?? row.body_my,
          value.level ?? row.level,
          value.active === undefined ? row.active : value.active ? 1 : 0,
          new Date().toISOString(),
          id,
        );
        bumpVersion();
      });
      return snapshot();
    },

    deleteAnnouncement(id, sampleData = defaultSampleData) {
      ensureInitialized(sampleData);
      const exists = sql
        .exec<{ id: string }>("SELECT id FROM announcements WHERE id = ?", id)
        .toArray()[0];
      if (!exists) throw new StoreError(`unknown announcement: ${id}`, "UNKNOWN_ANNOUNCEMENT");
      storage.transactionSync(() => {
        sql.exec("DELETE FROM announcements WHERE id = ?", id);
        bumpVersion();
      });
      return snapshot();
    },
  };
}
