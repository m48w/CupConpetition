import { describe, expect, test } from "vitest";
import type { Match } from "../../types";
import { nextMatchOnCourt } from "./nextMatch";

const m = (
  id: string,
  start: string,
  court: number,
  status: Match["status"] = "SCHEDULED",
): Match => ({
  id,
  stage: "GROUP",
  groupId: "A",
  court,
  scheduledStart: `2026-12-20T${start}:00+09:00`,
  durationMinutes: 15,
  status,
  homeTeamId: "a",
  awayTeamId: "b",
  homeScore: 0,
  awayScore: 0,
});

describe("nextMatchOnCourt", () => {
  const done = m("G-1", "09:15", 1, "FINISHED");
  test("同じコートの、後の時間の、終わっていない試合", () => {
    const list = [
      done,
      m("G-0", "09:00", 1),
      m("G-2", "09:15", 2),
      m("G-3", "09:30", 1, "FINISHED"),
      m("G-4", "09:45", 1),
    ];
    expect(nextMatchOnCourt(list, done)?.id).toBe("G-4");
  });
  test("後に無ければ、そのコートで一番早い終わっていない試合", () => {
    expect(nextMatchOnCourt([done, m("G-0", "09:00", 1), m("G-2", "10:00", 2)], done)?.id).toBe(
      "G-0",
    );
  });
  test("無ければ null", () => {
    expect(nextMatchOnCourt([done, m("G-2", "10:00", 2)], done)).toBeNull();
  });
});
