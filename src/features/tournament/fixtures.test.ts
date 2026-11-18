import { describe, expect, test } from "vitest";
import type { Match } from "../../types";
import {
  filterByTeam,
  filterUpcoming,
  groupSections,
  KNOCKOUT_SECTION,
  sortByTime,
} from "./fixtures";

const m = (
  id: string,
  stage: Match["stage"],
  start: string,
  court: number,
  home = "x",
  away = "y",
  groupId?: string,
): Match => ({
  id,
  stage,
  groupId,
  court,
  scheduledStart: `2026-12-20T${start}:00+09:00`,
  durationMinutes: 15,
  status: "SCHEDULED",
  homeTeamId: home,
  awayTeamId: away,
  homeScore: 0,
  awayScore: 0,
});

const matches = [
  m("R16-1", "R16", "17:03", 1),
  m("G-B-1", "GROUP", "09:00", 2, "b1", "b2", "B"),
  m("G-A-2", "GROUP", "09:15", 1, "a1", "a3", "A"),
  m("G-A-1", "GROUP", "09:00", 1, "a1", "a2", "A"),
  m("FINAL-1", "FINAL", "19:36", 1),
];

describe("fixtures", () => {
  test("時間の順、同じ時間はコートの順", () => {
    expect(sortByTime(matches).map((x) => x.id)).toEqual([
      "G-A-1",
      "G-B-1",
      "G-A-2",
      "R16-1",
      "FINAL-1",
    ]);
  });

  test("グループごと、決勝トーナメントは最後、空のグループは出さない", () => {
    const sections = groupSections(matches);
    expect(sections.map((s) => s.id)).toEqual(["A", "B", KNOCKOUT_SECTION]);
    expect(sections[0].matches.map((x) => x.id)).toEqual(["G-A-1", "G-A-2"]);
    expect(sections[2].matches.map((x) => x.id)).toEqual(["R16-1", "FINAL-1"]);
  });

  test("チームで絞り込む", () => {
    expect(filterByTeam(matches, "a1").map((x) => x.id)).toEqual(["G-A-2", "G-A-1"]);
    expect(filterByTeam(matches, "ALL")).toHaveLength(5);
    expect(groupSections(filterByTeam(matches, "b2")).map((s) => s.id)).toEqual(["B"]);
  });

  test("Upcoming は終わった試合を出さない", () => {
    const list = [
      { ...matches[0], status: "FINISHED" as const },
      matches[1],
      { ...matches[2], status: "LIVE" as const },
    ];
    expect(filterUpcoming(list).map((x) => x.id)).toEqual(["G-B-1", "G-A-2"]);
  });
});
