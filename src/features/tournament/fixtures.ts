import type { Match } from "../../types";
import { GROUP_IDS } from "./schedule";

/** Matches の並び替え。group: グループごと、time: 時間の順。 */
export type SortMode = "group" | "time";

/** 決勝トーナメントをまとめる見出しの ID。 */
export const KNOCKOUT_SECTION = "KO";

export interface FixtureSection {
  /** "A"〜"H" または KNOCKOUT_SECTION */
  id: string;
  matches: Match[];
}

/** 開始時間の順。同じ時間はコートの順。 */
export const byTime = (a: Match, b: Match) =>
  Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart) || a.court - b.court;

export const sortByTime = (matches: readonly Match[]) => [...matches].sort(byTime);

/** そのチームの試合だけ。"ALL" なら全部。 */
export const filterByTeam = (matches: readonly Match[], teamId: string) =>
  teamId === "ALL"
    ? [...matches]
    : matches.filter((match) => match.homeTeamId === teamId || match.awayTeamId === teamId);

/** Group A〜H ごと（中は時間の順）、決勝トーナメントは最後にまとめる。空のまとまりは出さない。 */
export function groupSections(matches: readonly Match[]): FixtureSection[] {
  const sections: FixtureSection[] = GROUP_IDS.map((id) => ({
    id,
    matches: sortByTime(matches.filter((match) => match.stage === "GROUP" && match.groupId === id)),
  }));
  sections.push({
    id: KNOCKOUT_SECTION,
    matches: sortByTime(matches.filter((match) => match.stage !== "GROUP")),
  });
  return sections.filter((section) => section.matches.length > 0);
}

/** 終わっていない試合だけ（Matches の Upcoming）。 */
export const filterUpcoming = (matches: readonly Match[]) =>
  matches.filter((match) => match.status !== "FINISHED");
