import { expect, test } from "vitest";
import type { MatchCard } from "../../types";
import { cardRows } from "./cards";

const card = (
  id: string,
  color: "YELLOW" | "RED",
  sourceCardId: string | null = null,
): MatchCard => ({
  id,
  matchId: "G-A-1",
  teamId: "A1",
  memberId: "m1",
  playerName: "Player 1",
  backNumber: 1,
  color,
  minute: 3,
  createdAt: "2026-12-20T00:00:00.000Z",
  sourceCardId,
});

test("2枚目のイエローと自動のレッドを1行にまとめる", () => {
  const rows = cardRows([card("y1", "YELLOW"), card("y2", "YELLOW"), card("r2", "RED", "y2")]);
  expect(rows.map((row) => [row.card.id, row.mark])).toEqual([
    ["y1", "YELLOW"],
    ["y2", "SECOND_YELLOW"],
  ]);
});

test("普通のレッドと、元のイエローが無い自動のレッドはそのまま出す", () => {
  const rows = cardRows([card("r1", "RED"), card("r9", "RED", "gone")]);
  expect(rows.map((row) => [row.card.id, row.mark])).toEqual([
    ["r1", "RED"],
    ["r9", "RED"],
  ]);
});
