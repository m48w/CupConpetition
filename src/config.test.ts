import { afterEach, expect, test } from "vitest";
import { getTournamentId, parseTournamentId, setTournamentId, tournamentScopedUrl } from "./config";

afterEach(() => {
  setTournamentId("20261220");
});

test("通常のパスから大会IDを読む", () => {
  expect(parseTournamentId("/20261220/teams")).toBe("20261220");
  expect(parseTournamentId("/registration/20261220/verify")).toBe("20261220");
  expect(parseTournamentId("/test/")).toBe("test");
});

test("暗号化URL（/u/...）からは「u」を大会IDにしない", () => {
  setTournamentId("test");
  expect(parseTournamentId("/u/WJuWlbD_OZn6FKv5x5YQPsjXGXXw6DXDApTnDYI")).toBe("test");
});

test("起動時に決めた大会IDを、引数なしで返す", () => {
  setTournamentId("test");
  expect(getTournamentId()).toBe("test");
});

test("ロゴURLに正しい大会IDが付く", () => {
  setTournamentId("20261220");
  expect(tournamentScopedUrl("/api/logos/abc")).toBe("/api/logos/abc?tournamentId=20261220");
});
