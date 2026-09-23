import type { Match, Team } from "./types";

export interface Standing {
  team: Team;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

export function calculateStandings(groupId: string, teams: Team[], matches: Match[]): Standing[] {
  const rows = teams.filter((team) => team.groupId === groupId).map((team) => ({
    team,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    points: 0,
  }));
  const byId = new Map(rows.map((row) => [row.team.id, row]));
  matches.filter((match) => match.groupId === groupId && match.status === "FINISHED").forEach((match) => {
    const home = byId.get(match.homeTeamId);
    const away = byId.get(match.awayTeamId);
    if (!home || !away) return;
    home.played += 1; away.played += 1;
    home.goalsFor += match.homeScore; home.goalsAgainst += match.awayScore;
    away.goalsFor += match.awayScore; away.goalsAgainst += match.homeScore;
    if (match.homeScore > match.awayScore) { home.won += 1; home.points += 3; away.lost += 1; }
    else if (match.homeScore < match.awayScore) { away.won += 1; away.points += 3; home.lost += 1; }
    else { home.drawn += 1; away.drawn += 1; home.points += 1; away.points += 1; }
  });
  return rows.sort((a, b) => b.points - a.points || (b.goalsFor - b.goalsAgainst) - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor);
}

export const stageLabel: Record<Match["stage"], string> = {
  GROUP: "Group stage", R16: "Best 16", QF: "Best 8", SF: "Best 4", FINAL: "Final",
};

export function generateKnockoutMatches(teams: Team[], matches: Match[]): Match[] {
  const ranked = new Map(
    ["A", "B", "C", "D", "E", "F", "G", "H"].map((group) => [
      group,
      calculateStandings(group, teams, matches).map((row) => row.team.id),
    ]),
  );
  const cards: [string, string][] = [
    ["A1", "H2"], ["H1", "A2"], ["B1", "G2"], ["G1", "B2"],
    ["C1", "F2"], ["F1", "C2"], ["D1", "E2"], ["E1", "D2"],
  ];
  const fixedCards = cards.slice(0, 8).map(([home, away]) => [
    ranked.get(home[0])?.[Number(home[1]) - 1] ?? "TBD",
    ranked.get(away[0])?.[Number(away[1]) - 1] ?? "TBD",
  ]);
  const start = new Date("2026-09-26T13:00:00+09:00");
  const r16: Match[] = fixedCards.map(([homeTeamId, awayTeamId], index) => {
    const scheduledStart = new Date(start.getTime() + index * 18 * 60_000);
    return {
      id: `R16-${index + 1}`,
      stage: "R16",
      court: (index % 3) + 1,
      scheduledStart: scheduledStart.toISOString(),
      status: "SCHEDULED",
      homeTeamId,
      awayTeamId,
      homeScore: 0,
      awayScore: 0,
    };
  });
  const makeNextRound = (
    stage: Match["stage"],
    prefix: string,
    count: number,
    offset: number,
    sourceSize: number,
  ): Match[] => Array.from({ length: count }, (_, index) => {
    const sourceStart = index * sourceSize;
    const sourceMatchIds = Array.from({ length: sourceSize }, (_, sourceIndex) => `${prefix}-${sourceStart + sourceIndex + 1}`);
    return {
      id: `${stage}-${index + 1}`,
      stage,
      court: (index % 3) + 1,
      scheduledStart: new Date(start.getTime() + (offset + index) * 18 * 60_000).toISOString(),
      status: "SCHEDULED",
      homeTeamId: "TBD",
      awayTeamId: "TBD",
      homeScore: 0,
      awayScore: 0,
      sourceMatchIds,
    };
  });
  return [
    ...r16,
    ...makeNextRound("QF", "R16", 4, 8, 2),
    ...makeNextRound("SF", "QF", 2, 12, 2),
    ...makeNextRound("FINAL", "SF", 1, 14, 2),
  ];
}
