import { expect, test } from "vitest";
import { initialMatches } from "./data";
import type { Match } from "../../types";
import { applyMatchPatch, isOnPitch, nextMatchFor } from "./logic";

test("applyMatchPatch は指定した試合だけに変更を重ね、元の配列は変えない", () => {
  const [first, second] = initialMatches;
  const next = applyMatchPatch(initialMatches, first.id, { homeScore: 2, status: "LIVE" });

  expect(next.find((m) => m.id === first.id)).toEqual({ ...first, homeScore: 2, status: "LIVE" });
  expect(next.find((m) => m.id === second.id)).toBe(second);
  expect(initialMatches[0]).toBe(first);
  expect(first.homeScore).toBe(0);
});

test("applyMatchPatch は存在しない試合IDなら何も変えない", () => {
  expect(applyMatchPatch(initialMatches, "NOPE", { homeScore: 1 })).toEqual(initialMatches);
});

test("isOnPitch は試合中と一時停止中の試合だけを Live に残す", () => {
  const [match] = initialMatches;
  expect(isOnPitch({ ...match, status: "LIVE" })).toBe(true);
  expect(isOnPitch({ ...match, status: "PAUSED" })).toBe(true);
  expect(isOnPitch({ ...match, status: "SCHEDULED" })).toBe(false);
  expect(isOnPitch({ ...match, status: "FINISHED" })).toBe(false);
});

test("マイチームの次の試合: 試合中の試合を優先し、なければ一番早い未開始の試合", () => {
  const base = {
    stage: "GROUP" as const,
    groupId: "A",
    court: 1,
    durationMinutes: 15,
    homeScore: 0,
    awayScore: 0,
  };
  const matches: Match[] = [
    {
      ...base,
      id: "M1",
      homeTeamId: "A1",
      awayTeamId: "A2",
      status: "FINISHED",
      scheduledStart: "2026-12-20T00:00:00.000Z",
    },
    {
      ...base,
      id: "M2",
      homeTeamId: "A3",
      awayTeamId: "A1",
      status: "SCHEDULED",
      scheduledStart: "2026-12-20T03:00:00.000Z",
    },
    {
      ...base,
      id: "M3",
      homeTeamId: "A1",
      awayTeamId: "A4",
      status: "SCHEDULED",
      scheduledStart: "2026-12-20T02:00:00.000Z",
    },
    {
      ...base,
      id: "M4",
      homeTeamId: "A2",
      awayTeamId: "A3",
      status: "SCHEDULED",
      scheduledStart: "2026-12-20T01:00:00.000Z",
    },
  ];
  expect(nextMatchFor("A1", matches)?.id).toBe("M3");
  const playing = matches.map((match) =>
    match.id === "M2" ? { ...match, status: "PAUSED" as const } : match,
  );
  expect(nextMatchFor("A1", playing)?.id).toBe("M2");
  expect(nextMatchFor("A5", matches)).toBeUndefined();
});
