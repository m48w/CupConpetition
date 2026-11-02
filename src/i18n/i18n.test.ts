import { expect, test } from "vitest";
import { ApiError } from "../utils/http";
import { errorKey, errorKeyForCode } from "./errors";
import { messages, type MessageKey } from "./messages";
import { interpolate, readStoredLang, translate } from "./translate";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test("すべての文に英語がある", () => {
  for (const [key, entry] of Object.entries(messages)) {
    expect(entry.en.trim(), key).not.toBe("");
  }
});

test("ミャンマー語の {...} は英語と同じ", () => {
  for (const [key, entry] of Object.entries(messages) as [
    MessageKey,
    { en: string; my?: string },
  ][]) {
    if (!entry.my) continue;
    expect(placeholders(entry.my), key).toEqual(placeholders(entry.en));
  }
});

test("ミャンマー語の文は Zawgyi ではなくユニコードのミャンマー文字を使う", () => {
  // Zawgyi 特有の文字（U+1060〜U+1097 の一部）が無いことを簡単に確かめる。
  for (const [key, entry] of Object.entries(messages) as [
    MessageKey,
    { en: string; my?: string },
  ][]) {
    if (!entry.my) continue;
    expect(/[ၠ-႗]/.test(entry.my), key).toBe(false);
  }
});

test("{...} に値を入れる", () => {
  expect(interpolate("Group {id} · {n}", { id: "A", n: 3 })).toBe("Group A · 3");
  expect(interpolate("Hello {name}", {})).toBe("Hello {name}");
});

test("ミャンマー語を選ぶとミャンマー語、無ければ英語", () => {
  expect(translate("en", "nav.home")).toBe("Home");
  expect(translate("my", "nav.home")).toBe(messages["nav.home"].my);
  expect(translate("my", "common.group", { id: "B" })).toContain("B");
});

test("保存した言語を読む。読めない・不明なら英語", () => {
  expect(readStoredLang({ getItem: () => "my" })).toBe("my");
  expect(readStoredLang({ getItem: () => "ja" })).toBe("en");
  expect(readStoredLang({ getItem: () => null })).toBe("en");
  expect(
    readStoredLang({
      getItem: () => {
        throw new Error("blocked");
      },
    }),
  ).toBe("en");
  expect(readStoredLang(undefined)).toBe("en");
});

test("サーバーのエラーコードを文のキーにする", () => {
  expect(errorKeyForCode("INVALID_EMAIL")).toBe("err.INVALID_EMAIL");
  expect(errorKeyForCode("UNKNOWN_CODE")).toBeNull();
  expect(errorKey(new ApiError("x", 400, "DUPLICATE_TEAM"), "err.generic")).toBe(
    "err.DUPLICATE_TEAM",
  );
  expect(errorKey(new ApiError("x", 500, "WHATEVER"), "reg.err.save")).toBe("reg.err.save");
  expect(errorKey(new TypeError("Failed to fetch"), "err.generic")).toBe("err.network");
  expect(errorKey(new Error("x"), "err.generic")).toBe("err.generic");
});
