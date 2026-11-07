import { expect, test } from "vitest";
import {
  canMove,
  emptyDraft,
  isDirty,
  moveTeam,
  scheduleProblems,
  toDraft,
  UNASSIGNED,
  unassignedTeams,
  zoneOf,
} from "./draft";

const candidate = (id: string) => ({ id, teamName: id, clubName: id, logoId: null });

test("チームをグループへ動かし、別のグループへ移し、外せる", () => {
  let draft = moveTeam(emptyDraft(), "t1", "A");
  expect(draft.A).toEqual(["t1"]);
  draft = moveTeam(draft, "t1", "B");
  expect(draft.A).toEqual([]);
  expect(draft.B).toEqual(["t1"]);
  expect(zoneOf(draft, "t1")).toBe("B");
  draft = moveTeam(draft, "t1", UNASSIGNED);
  expect(zoneOf(draft, "t1")).toBe(UNASSIGNED);
});

test("1グループ5チームまで。満員のグループには入らない", () => {
  let draft = emptyDraft();
  for (const id of ["a", "b", "c", "d", "e"]) draft = moveTeam(draft, id, "A");
  expect(draft.A).toHaveLength(5);
  expect(canMove(draft, "f", "A")).toBe(false);
  expect(moveTeam(draft, "f", "A")).toBe(draft);
  // 今いるチームは「動かしていない」だけなので OK。
  expect(canMove(draft, "a", "A")).toBe(true);
});

test("未割り当てのチームを出す", () => {
  const draft = moveTeam(emptyDraft(), "t1", "C");
  expect(unassignedTeams(draft, [candidate("t1"), candidate("t2")]).map((c) => c.id)).toEqual([
    "t2",
  ]);
});

test("試合を作れるのは8グループすべて2チーム以上のとき", () => {
  let draft = emptyDraft();
  expect(scheduleProblems(draft)).toHaveLength(8);
  ["A", "B", "C", "D", "E", "F", "G", "H"].forEach((groupId, index) => {
    draft = moveTeam(draft, `x${index}`, groupId as "A");
    draft = moveTeam(draft, `y${index}`, groupId as "A");
  });
  expect(scheduleProblems(draft)).toEqual([]);
  draft = moveTeam(draft, "y7", UNASSIGNED);
  expect(scheduleProblems(draft)).toEqual(["Group H needs at least 2 teams"]);
});

test("保存した状態と違うかを判定し、消えた登録チームは外す", () => {
  const saved = toDraft({ A: ["t1", "gone"] }, new Set(["t1", "t2"]));
  expect(saved.A).toEqual(["t1"]);
  expect(isDirty(saved, saved)).toBe(false);
  expect(isDirty(moveTeam(saved, "t2", "A"), saved)).toBe(true);
});
