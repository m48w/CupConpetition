import type { Match, Stage, Team } from "../../types";
import { teams as defaultTeams } from "./data";
import { R16_SEEDS, TBD } from "./schedule";

export interface BracketGame {
  id: string;
  home: string;
  away: string;
  homeTeamId?: string;
  awayTeamId?: string;
  /** null until the match has kicked off. */
  homeScore: number | null;
  awayScore: number | null;
  scheduledStart?: string;
  court?: number;
  sourceMatchIds?: string[];
}

export interface BracketRound {
  stage: Stage;
  title: string;
  games: BracketGame[];
}

const ROUNDS: { stage: Stage; title: string; count: number; feederLabel: string }[] = [
  { stage: "R16", title: "Round of 16", count: 8, feederLabel: "" },
  { stage: "QF", title: "Quarter-finals", count: 4, feederLabel: "M" },
  { stage: "SF", title: "Semi-finals", count: 2, feederLabel: "QF" },
  { stage: "FINAL", title: "Final", count: 1, feederLabel: "SF" },
];

/**
 * The knockout rounds in bracket order. Match n of a round is fed by matches 2n-1 and 2n of
 * the round before, so listing each column in id order lines every pair up with its winner.
 */
export function bracketRounds(matches: Match[], teams: Team[] = defaultTeams): BracketRound[] {
  return ROUNDS.map(({ stage, title, count, feederLabel }) => ({
    stage,
    title,
    games: Array.from({ length: count }, (_, index) => {
      const id = `${stage}-${index + 1}`;
      const match = matches.find((candidate) => candidate.id === id);
      // Before the teams are known, R16 shows the seed and later rounds show whose winner comes.
      const placeholder = (side: 0 | 1) =>
        stage === "R16" ? R16_SEEDS[index][side] : `Winner ${feederLabel}${index * 2 + side + 1}`;
      const name = (teamId: string | undefined, side: 0 | 1) =>
        !teamId || teamId === TBD
          ? { name: placeholder(side), teamId: undefined }
          : { name: teams.find((team) => team.id === teamId)?.name ?? TBD, teamId };
      const started = match !== undefined && match.status !== "SCHEDULED";
      const home = name(match?.homeTeamId, 0);
      const away = name(match?.awayTeamId, 1);

      return {
        id,
        home: home.name,
        away: away.name,
        homeTeamId: home.teamId,
        awayTeamId: away.teamId,
        homeScore: started ? match.homeScore : null,
        awayScore: started ? match.awayScore : null,
        scheduledStart: match?.scheduledStart,
        court: match?.court,
        sourceMatchIds: match?.sourceMatchIds,
      };
    }),
  }));
}
