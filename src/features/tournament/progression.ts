import type { Match, Team } from "../../types";
import { R16_SEEDS, TBD } from "./schedule";

/**
 * 順位と決勝トーナメントへの進出の計算。画面とサーバー（Worker）の両方で使う。
 * React や保存の処理は入れない（テストしやすいように、純粋な関数だけ）。
 */

export interface Standing {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export interface GroupRanking {
  /** 決まった順番（1位から）。 */
  rows: Standing[];
  /** そのグループの試合がすべて FINISHED。 */
  complete: boolean;
  /** 手で順番を決める必要がある同点のチームID の組（1〜3位の境目にかかるものだけ）。 */
  unresolved: string[][];
}

/** グループごとの、手で決めた順番（チームIDの並び）。 */
export type GroupOrders = Record<string, string[]>;

/** 試合が始まっているか（状態が未開始でない、または点数が入っている）。 */
export const isStarted = (match: Match) =>
  match.status !== "SCHEDULED" || match.homeScore > 0 || match.awayScore > 0;

const groupMatches = (groupId: string, matches: Match[]) =>
  matches.filter((match) => match.stage === "GROUP" && match.groupId === groupId);

/** グループの結果を1つの文字列にしたもの。手で決めた順番が今の結果のものかを確かめるのに使う。 */
export function resultsKey(groupId: string, matches: Match[]): string {
  return groupMatches(groupId, matches)
    .map((match) => `${match.id}:${match.status}:${match.homeScore}-${match.awayScore}`)
    .sort()
    .join("|");
}

/** 終わった試合だけで、勝ち点・得失点などを数える。 */
function tally(teams: Team[], matches: Match[]): Standing[] {
  const rows = teams.map((team) => ({
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  const byId = new Map(rows.map((row) => [row.team.id, row]));
  for (const match of matches) {
    if (match.status !== "FINISHED") continue;
    const home = byId.get(match.homeTeamId);
    const away = byId.get(match.awayTeamId);
    if (!home || !away) continue;
    home.played += 1;
    away.played += 1;
    home.goalsFor += match.homeScore;
    home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore;
    away.goalsAgainst += match.homeScore;
    if (match.homeScore > match.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (match.homeScore < match.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }
  return rows;
}

const goalDiff = (row: Standing) => row.goalsFor - row.goalsAgainst;
/** 勝ち点 → 得失点差 → 総得点。0 なら同じ。 */
const compareBasic = (a: Standing, b: Standing) =>
  b.points - a.points || goalDiff(b) - goalDiff(a) || b.goalsFor - a.goalsFor;

/** 並びの中で、compare が 0 のものをまとめる。 */
function clusters<T>(items: T[], compare: (a: T, b: T) => number): T[][] {
  const result: T[][] = [];
  for (const item of items) {
    const last = result[result.length - 1];
    if (last && compare(last[0], item) === 0) last.push(item);
    else result.push([item]);
  }
  return result;
}

/** 1〜3位の境目（1位と2位の間、2位と3位の間）にかかるか。start・end は 0 から数えた順位。 */
const crossesQualifyingLine = (start: number, end: number) =>
  (start < 1 && end >= 1) || (start < 2 && end >= 2);

/**
 * グループの順位。勝ち点 → 得失点差 → 総得点 → 直接対決 → 手で決めた順番。
 * それでも決まらず、1〜3位の境目にかかる同点は `unresolved` に入れる（グループが終わっているときだけ）。
 */
export function rankGroup(
  groupId: string,
  teams: Team[],
  matches: Match[],
  manualOrder?: string[],
): GroupRanking {
  const groupTeams = teams.filter((team) => team.groupId === groupId);
  const fixtures = groupMatches(groupId, matches);
  const complete = fixtures.length > 0 && fixtures.every((match) => match.status === "FINISHED");
  const rows = tally(groupTeams, fixtures).sort(compareBasic);

  const ordered: Standing[] = [];
  const unresolved: string[][] = [];
  for (const tied of clusters(rows, compareBasic)) {
    if (tied.length === 1) {
      ordered.push(tied[0]);
      continue;
    }
    // 直接対決: 同じチーム同士の試合だけで、もう一度 勝ち点 → 得失点差 → 総得点。
    const ids = new Set(tied.map((row) => row.team.id));
    const headToHead = tally(
      tied.map((row) => row.team),
      fixtures.filter((match) => ids.has(match.homeTeamId) && ids.has(match.awayTeamId)),
    );
    const mini = new Map(headToHead.map((row) => [row.team.id, row]));
    const byHeadToHead = (a: Standing, b: Standing) =>
      compareBasic(mini.get(a.team.id)!, mini.get(b.team.id)!);
    const sorted = [...tied].sort(
      (a, b) => byHeadToHead(a, b) || a.team.name.localeCompare(b.team.name),
    );
    for (const still of clusters(sorted, byHeadToHead)) {
      const start = ordered.length;
      if (still.length > 1 && manualOrder && still.every((r) => manualOrder.includes(r.team.id))) {
        still.sort((a, b) => manualOrder.indexOf(a.team.id) - manualOrder.indexOf(b.team.id));
      } else if (
        still.length > 1 &&
        complete &&
        crossesQualifyingLine(start, start + still.length - 1)
      ) {
        unresolved.push(still.map((row) => row.team.id));
      }
      ordered.push(...still);
    }
  }
  return { rows: ordered, complete, unresolved };
}

/** 終わった試合の勝者。同点なら PK の勝者。決まらなければ null。 */
export function winnerOf(match: Match | undefined): string | null {
  if (!match || match.status !== "FINISHED") return null;
  if (match.homeTeamId === TBD || match.awayTeamId === TBD) return null;
  if (match.homeScore > match.awayScore) return match.homeTeamId;
  if (match.awayScore > match.homeScore) return match.awayTeamId;
  if (!match.isPenaltyShootout) return null;
  const home = match.penaltyHomeScore ?? 0;
  const away = match.penaltyAwayScore ?? 0;
  if (home === away) return null;
  return home > away ? match.homeTeamId : match.awayTeamId;
}

/** 決勝トーナメントで同点のまま終われない（PK の勝者が要る）か。 */
export const needsPenaltyWinner = (match: Match) =>
  match.stage !== "GROUP" && match.homeScore === match.awayScore && winnerOf(match) === null;

const seedOf = (match: Match): readonly [string, string] | undefined =>
  match.stage === "R16" ? R16_SEEDS[Number(match.id.split("-")[1]) - 1] : undefined;

/**
 * この試合の結果で、チームが決まる次の試合。
 * グループの試合 → そのグループの順位が入る Round of 16。決勝トーナメント → sourceMatchIds に含む試合。
 */
export function dependentsOf(match: Match, matches: Match[]): Match[] {
  if (match.stage === "GROUP") {
    return matches.filter((candidate) =>
      seedOf(candidate)?.some((seed) => seed[0] === match.groupId),
    );
  }
  return matches.filter((candidate) => candidate.sourceMatchIds?.includes(match.id));
}

/**
 * 決勝トーナメントのチームを埋める。
 * - Round of 16: グループが終わり、1〜3位の境目に未解決の同点がなければ、その順位のチーム。
 *   グループが終わっていないときは今の値をそのまま残す（テスト用の手動シードを消さないため）。
 * - 準々決勝〜決勝: 前の2試合の勝者。決まっていなければ TBD。
 * - 始まっている試合のチームは変えない。
 * 何も変わらなければ、同じ配列を返す。
 */
export function progress(teams: Team[], matches: Match[], groupOrders: GroupOrders = {}): Match[] {
  const rankings = new Map<string, GroupRanking>();
  const ranking = (groupId: string) => {
    if (!rankings.has(groupId)) {
      rankings.set(groupId, rankGroup(groupId, teams, matches, groupOrders[groupId]));
    }
    return rankings.get(groupId)!;
  };
  const resolveSeed = (seed: string, current: string) => {
    const result = ranking(seed[0]);
    if (!result.complete || result.unresolved.length > 0) return current;
    return result.rows[Number(seed[1]) - 1]?.team.id ?? TBD;
  };

  // QF は R16 の勝者を、SF は QF の勝者を使うので、順番に計算する。
  const byId = new Map(matches.map((match) => [match.id, match]));
  let changed = false;
  for (const stage of ["R16", "QF", "SF", "FINAL"] as const) {
    for (const match of matches.filter((candidate) => candidate.stage === stage)) {
      const current = byId.get(match.id)!;
      if (isStarted(current)) continue;
      let home = current.homeTeamId;
      let away = current.awayTeamId;
      const seed = seedOf(current);
      if (seed) {
        home = resolveSeed(seed[0], home);
        away = resolveSeed(seed[1], away);
      } else if (current.sourceMatchIds?.length === 2) {
        home = winnerOf(byId.get(current.sourceMatchIds[0])) ?? TBD;
        away = winnerOf(byId.get(current.sourceMatchIds[1])) ?? TBD;
      }
      if (home !== current.homeTeamId || away !== current.awayTeamId) {
        byId.set(match.id, { ...current, homeTeamId: home, awayTeamId: away });
        changed = true;
      }
    }
  }
  return changed ? matches.map((match) => byId.get(match.id)!) : matches;
}
