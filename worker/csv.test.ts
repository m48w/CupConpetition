import { expect, test } from "vitest";
import { csvCell, registrationRows, toCsv } from "./csv";

test("カンマ・ダブルクォート・改行を含む値は囲む", () => {
  expect(csvCell("plain")).toBe("plain");
  expect(csvCell("a,b")).toBe('"a,b"');
  expect(csvCell('say "hi"')).toBe('"say ""hi"""');
  expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  expect(csvCell(null)).toBe("");
  expect(csvCell(7)).toBe("7");
});

test("式として動く値の先頭に ' を付ける（CSVインジェクション対策）", () => {
  expect(csvCell("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
  expect(csvCell("+81 90")).toBe("'+81 90");
  expect(csvCell("-1")).toBe("'-1");
  expect(csvCell("@cmd")).toBe("'@cmd");
});

test("BOM付き・CRLFで出力する", () => {
  expect(
    toCsv([
      ["a", "b"],
      ["c", "d"],
    ]),
  ).toBe("\uFEFFa,b\r\nc,d\r\n");
});

test("1行 = 1選手。選手がいないチームは1行", () => {
  const rows = registrationRows([
    {
      clubName: "Club",
      teamName: "A",
      representativeName: "Rep",
      email: "a@example.com",
      phone: "09000000000",
      createdAt: "2026-11-01T00:00:00.000Z",
      members: [
        { name: "P1", backNumber: 1 },
        { name: "P2", backNumber: 2 },
      ],
    },
    {
      clubName: "Club",
      teamName: "B",
      representativeName: "Rep",
      email: "a@example.com",
      phone: "09000000000",
      createdAt: "2026-11-02T00:00:00.000Z",
      members: [],
    },
  ]);
  expect(rows).toHaveLength(4);
  expect(rows[0][0]).toBe("Club");
  expect(rows[1]).toEqual([
    "Club",
    "A",
    "Rep",
    "a@example.com",
    "09000000000",
    "P1",
    1,
    "2026-11-01T00:00:00.000Z",
  ]);
  expect(rows[3].slice(5, 7)).toEqual(["", ""]);
});
