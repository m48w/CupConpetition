import { expect, test } from "vitest";
import { shouldApply } from "./version";

test("SSE の state イベントは、version が現在より古くても常に適用する", () => {
  expect(shouldApply(1, 5, "sse")).toBe(true);
});

test("mutating な呼び出しのレスポンスは、version が現在より古ければ破棄する", () => {
  expect(shouldApply(2, 5, "response")).toBe(false);
});

test("mutating な呼び出しのレスポンスは、version が現在と同じなら適用する", () => {
  expect(shouldApply(5, 5, "response")).toBe(true);
});

test("mutating な呼び出しのレスポンスは、version が現在より新しければ適用する", () => {
  expect(shouldApply(6, 5, "response")).toBe(true);
});

test("最初のメッセージ（current version が 0）は、SSE でもレスポンスでも適用する", () => {
  expect(shouldApply(1, 0, "sse")).toBe(true);
  expect(shouldApply(1, 0, "response")).toBe(true);
});
