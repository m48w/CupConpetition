import { expect, test } from "vitest";
import { bytesToBase64, fitWithin } from "./image";

test("大きい画像は縦横の比率を保って256pxに収める", () => {
  expect(fitWithin(768, 768)).toEqual({ width: 256, height: 256 });
  expect(fitWithin(1024, 512)).toEqual({ width: 256, height: 128 });
  expect(fitWithin(300, 900)).toEqual({ width: 85, height: 256 });
});

test("小さい画像は大きくしない", () => {
  expect(fitWithin(100, 50)).toEqual({ width: 100, height: 50 });
});

test("バイト列をBase64にする", () => {
  expect(bytesToBase64(new Uint8Array([1, 2, 3]))).toBe("AQID");
});
