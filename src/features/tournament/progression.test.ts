import { expect, test } from "vitest";
import type { Match, Team } from "../../types";
import { dependentsOf, needsPenaltyWinner, progress, rankGroup, winnerOf } from "./progression";
import { buildTournamentSchedule, GROUP_IDS, TBD } from "./schedule";

const team = (id: string, groupId: string): Team => ({ id, name: id, groupId, color: "#000000" });

/** 各グループ n チームの大会と、その日程。 */
function tournament(size = 3) {
  const teams = GROUP_IDS.flatMap((groupId) =>
    Array.from({ length: size }, (_, index) => team(`${groupId}${index + 1}`, groupId)),
  );
  return { teams, matches: buildTournamentSchedule(teams) };
}

/** グループの試合を、ホームの番号が小さい方が勝つ形で全部終わらせる（1位=X1、2位=X2…）。 */
function finishGroup(
  matches: Match[],
  groupId: string,
  score: (match: Match) => number[] = () => [2, 0],
) {
  return matches.map((match) => {
    if (match.stage !== "GROUP" || match.groupId !== groupId) return match;
    const [home, away] = score(match);
    return { ...match, status: "FINISHED" as const, homeScore: home, awayScore: away };
  });
}

const play = (matches: Match[], id: string, home: number, away: number, extra = {}) =>
  matches.map((match) =>
    match.id === id
      ? { ...match, status: "FINISHED" as const, homeScore: home, awayScore: away, ...extra }
      : match,
  );

test("勝ち点 → 得失点差 → 総得点の順に並ぶ", () => {
  const { teams, matches } = tournament(3);
  const done = finishGroup(matches, "A");
  const { rows, complete, unresolved } = rankGroup("A", teams, done);
  expect(complete).toBe(true);
  expect(unresolved).toEqual([]);
  expect(rows.map((row) => row.team.id)).toEqual(["A1", "A2", "A3"]);
});

test("勝ち点・得失点差・総得点が同じなら、直接対決で決める", () => {
  const teams = [team("P", "A"), team("Q", "A"), team("R", "A"), team("S", "A")];
  const m = (id: string, home: string, away: string, h: number, a: number): Match => ({
    id,
    stage: "GROUP",
    groupId: "A",
    court: 1,
    scheduledStart: "2026-12-20T00:00:00.000Z",
    durationMinutes: 15,
    status: "FINISHED",
    homeTeamId: home,
    awayTeamId: away,
    homeScore: h,
    awayScore: a,
  });
  // P と Q は勝ち点6・得失点差+2・総得点4 で同じ。直接対決は Q の勝ち。
  const matches = [
    m("1", "Q", "P", 1, 0),
    m("2", "P", "R", 2, 0),
    m("3", "P", "S", 2, 1),
    m("4", "Q", "R", 1, 2),
    m("5", "Q", "S", 2, 0),
    m("6", "R", "S", 0, 0),
  ];
  const { rows, unresolved } = rankGroup("A", teams, matches);
  expect(rows.slice(0, 2).map((row) => row.team.id)).toEqual(["Q", "P"]);
  expect(unresolved).toEqual([]);
});

test("直接対決でも決まらず1〜3位の境目にかかる同点は、手で決める必要がある", () => {
  const { teams, matches } = tournament(3);
  // 3チームが1勝1敗・同じ点数（三すくみ）。
  const done = finishGroup(matches, "A", () => [1, 0]).map((match) =>
    match.groupId === "A" && match.homeTeamId === "A1" && match.awayTeamId === "A3"
      ? { ...match, homeScore: 0, awayScore: 1 }
      : match,
  );
  const result = rankGroup("A", teams, done);
  expect(result.unresolved).toEqual([expect.arrayContaining(["A1", "A2", "A3"])]);
  const manual = rankGroup("A", teams, done, ["A3", "A1", "A2"]);
  expect(manual.unresolved).toEqual([]);
  expect(manual.rows.map((row) => row.team.id)).toEqual(["A3", "A1", "A2"]);
});

test("4位と5位だけの同点は、手で決めなくてよい", () => {
  const { teams, matches } = tournament(5);
  // A1〜A3 が勝ち、A4 と A5 は全部負けて、A4 vs A5 は引き分け。
  const done = finishGroup(matches, "A", (match) =>
    match.homeTeamId === "A4" && match.awayTeamId === "A5" ? [0, 0] : [2, 0],
  );
  expect(rankGroup("A", teams, done).unresolved).toEqual([]);
});

test("グループが終わったら、ほかのグループを待たずに Round of 16 に入る", () => {
  const { teams, matches } = tournament(3);
  const next = progress(teams, finishGroup(matches, "A"));
  const r16 = (id: string) => next.find((match) => match.id === id)!;
  // R16-1 は A1 vs H2、R16-2 は H1 vs A2。H はまだ終わっていない。
  expect(r16("R16-1").homeTeamId).toBe("A1");
  expect(r16("R16-1").awayTeamId).toBe(TBD);
  expect(r16("R16-2").awayTeamId).toBe("A2");
});

test("勝者が準々決勝・準決勝・決勝へ進み、引き分けは PK の勝者が進む", () => {
  const { teams, matches } = tournament(2);
  let state = matches;
  for (const groupId of GROUP_IDS) state = finishGroup(state, groupId);
  state = progress(teams, state);
  expect(state.find((m) => m.id === "R16-1")).toMatchObject({ homeTeamId: "A1", awayTeamId: "H2" });

  state = progress(teams, play(state, "R16-1", 1, 0));
  state = progress(
    teams,
    play(state, "R16-2", 1, 1, {
      isPenaltyShootout: true,
      penaltyHomeScore: 3,
      penaltyAwayScore: 4,
    }),
  );
  expect(state.find((m) => m.id === "QF-1")).toMatchObject({ homeTeamId: "A1", awayTeamId: "A2" });

  for (const id of ["R16-3", "R16-4", "R16-5", "R16-6", "R16-7", "R16-8"]) {
    state = progress(teams, play(state, id, 2, 1));
  }
  for (const id of ["QF-1", "QF-2", "QF-3", "QF-4"]) state = progress(teams, play(state, id, 1, 0));
  for (const id of ["SF-1", "SF-2"]) state = progress(teams, play(state, id, 0, 1));
  const final = state.find((m) => m.id === "FINAL-1")!;
  expect(final.homeTeamId).not.toBe(TBD);
  expect(final.awayTeamId).not.toBe(TBD);
});

test("始まっている試合のチームは変えない。結果がなくなると次の試合は TBD に戻る", () => {
  const { teams, matches } = tournament(2);
  let state = matches;
  for (const groupId of GROUP_IDS) state = finishGroup(state, groupId);
  state = progress(teams, play(progress(teams, state), "R16-1", 1, 0));
  expect(state.find((m) => m.id === "QF-1")!.homeTeamId).toBe("A1");
  // R16-1 を未開始に戻すと、QF-1 は TBD に戻る。
  const undone = state.map((m) =>
    m.id === "R16-1" ? { ...m, status: "SCHEDULED" as const, homeScore: 0, awayScore: 0 } : m,
  );
  expect(progress(teams, undone).find((m) => m.id === "QF-1")!.homeTeamId).toBe(TBD);
  // QF-1 が始まっていれば変えない。
  const started = undone.map((m) => (m.id === "QF-1" ? { ...m, status: "LIVE" as const } : m));
  expect(progress(teams, started).find((m) => m.id === "QF-1")!.homeTeamId).toBe("A1");
});

test("何も変わらなければ同じ配列を返す", () => {
  const { teams, matches } = tournament(3);
  expect(progress(teams, matches)).toBe(matches);
});

test("勝者・PK・次の試合", () => {
  const base = tournament(2).matches;
  const r16 = base.find((m) => m.id === "R16-1")!;
  const filled = { ...r16, homeTeamId: "A1", awayTeamId: "H2", status: "FINISHED" as const };
  expect(winnerOf({ ...filled, homeScore: 0, awayScore: 1 })).toBe("H2");
  expect(winnerOf({ ...filled, homeScore: 1, awayScore: 1 })).toBeNull();
  expect(needsPenaltyWinner({ ...filled, homeScore: 1, awayScore: 1 })).toBe(true);
  expect(
    winnerOf({
      ...filled,
      homeScore: 1,
      awayScore: 1,
      isPenaltyShootout: true,
      penaltyHomeScore: 5,
      penaltyAwayScore: 4,
    }),
  ).toBe("A1");
  expect(dependentsOf(r16, base).map((m) => m.id)).toEqual(["QF-1"]);
  const groupA = base.find((m) => m.stage === "GROUP" && m.groupId === "A")!;
  expect(dependentsOf(groupA, base).map((m) => m.id)).toEqual(["R16-1", "R16-2"]);
});
