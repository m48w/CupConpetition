import { GROUP_IDS, R16_SEEDS, TBD } from "./schedule";
import type { Match, Team } from "../../types";
import { rankGroup, type GroupOrders, type Standing } from "./progression";

export type { Standing } from "./progression";

/** グループの順位（勝ち点 → 得失点差 → 総得点 → 直接対決 → 手で決めた順番）。 */
export function calculateStandings(
  groupId: string,
  teams: Team[],
  matches: Match[],
  groupOrders: GroupOrders = {},
): Standing[] {
  return rankGroup(groupId, teams, matches, groupOrders[groupId]).rows;
}

export const stageLabel: Record<Match["stage"], string> = {
  GROUP: "Group stage",
  R16: "Round of 16",
  QF: "Quarter-final",
  SF: "Semi-final",
  FINAL: "Final",
};

/**
 * グループ順位から Round of 16 の対戦相手を埋める。
 * 既存の試合の時刻・コート・ID は変更しない。QF 以降は TBD のまま。
 */
export function seedKnockoutTeams(
  teams: Team[],
  matches: Match[],
  groupOrders: GroupOrders = {},
): Match[] {
  const ranked = new Map<string, string[]>(
    GROUP_IDS.map((groupId): [string, string[]] => [
      groupId,
      calculateStandings(groupId, teams, matches, groupOrders).map((row) => row.team.id),
    ]),
  );
  const resolve = (seed: string) => ranked.get(seed[0])?.[Number(seed[1]) - 1] ?? TBD;

  return matches.map((match) => {
    if (match.stage !== "R16") return match;
    const seed = R16_SEEDS[Number(match.id.split("-")[1]) - 1];
    if (!seed) return match;
    return { ...match, homeTeamId: resolve(seed[0]), awayTeamId: resolve(seed[1]) };
  });
}

/** サーバーの返事を待たずに画面へ反映するため、1試合分の変更を重ねた新しい配列を返す。 */
export function applyMatchPatch(matches: Match[], id: string, patch: Partial<Match>): Match[] {
  return matches.map((match) => (match.id === id ? { ...match, ...patch } : match));
}

/** Live 画面に残す試合。一時停止中も残し、終了したら外す。 */
export const isOnPitch = (match: Match) => match.status === "LIVE" || match.status === "PAUSED";

/**
 * マイチームの「次の試合」。試合中（一時停止を含む）ならその試合、
 * なければ開始予定が一番早い未開始の試合。無ければ undefined。
 */
export function nextMatchFor(teamId: string, matches: Match[]): Match | undefined {
  const mine = matches.filter(
    (match) => match.homeTeamId === teamId || match.awayTeamId === teamId,
  );
  return (
    mine.find(isOnPitch) ??
    mine
      .filter((match) => match.status === "SCHEDULED")
      .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart))[0]
  );
}
