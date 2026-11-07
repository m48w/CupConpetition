import { describe, expect, test } from "vitest";
import type { Goal, Match } from "../../types";
import { goalMinute, goalsOf, topScorers, tracksScorers } from "./goals";

const match = (id: string, stage: Match["stage"]): Match => ({
  id,
  stage,
  court: 1,
  scheduledStart: "2026-12-20T00:00:00.000Z",
  durationMinutes: 20,
  status: "LIVE",
  homeTeamId: "a",
  awayTeamId: "b",
  homeScore: 0,
  awayScore: 0,
});

let seq = 0;
const goal = (matchId: string, teamId: string, memberId: string | null, name = memberId): Goal => ({
  id: `g${(seq += 1)}`,
  matchId,
  teamId,
  memberId,
  playerName: name,
  backNumber: memberId ? 10 : null,
  minute: 5,
  createdAt: `2026-12-20T00:00:${String(seq).padStart(2, "0")}.000Z`,
});

describe("goals", () => {
  test("QF・SF・決勝だけ記録する", () => {
    expect(tracksScorers({ stage: "QF" })).toBe(true);
    expect(tracksScorers({ stage: "FINAL" })).toBe(true);
    expect(tracksScorers({ stage: "R16" })).toBe(false);
    expect(tracksScorers({ stage: "GROUP" })).toBe(false);
  });

  test("分は切り上げ、0秒でも 1'", () => {
    expect(goalMinute(0)).toBe(1);
    expect(goalMinute(60)).toBe(1);
    expect(goalMinute(61)).toBe(2);
    expect(goalMinute(750)).toBe(13);
  });

  test("ランキング: QF 以降だけ、Unknown は除く、同じ数は同じ順位", () => {
    const matches = [match("R16-1", "R16"), match("QF-1", "QF"), match("SF-1", "SF")];
    const goals = [
      goal("R16-1", "a", "p1", "Aung"),
      goal("QF-1", "a", "p1", "Aung"),
      goal("QF-1", "a", "p2", "Bo"),
      goal("SF-1", "a", "p2", "Bo"),
      goal("SF-1", "b", "p3", "Chit"),
      goal("SF-1", "b", null, null),
    ];
    expect(topScorers(goals, matches).map((row) => [row.rank, row.playerName, row.goals])).toEqual([
      [1, "Bo", 2],
      [2, "Aung", 1],
      [2, "Chit", 1],
    ]);
    expect(goalsOf(goals, "SF-1")).toHaveLength(3);
  });
});
