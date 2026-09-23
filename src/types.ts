export type Stage = "GROUP" | "R16" | "QF" | "SF" | "FINAL";
export type MatchStatus = "SCHEDULED" | "LIVE" | "PAUSED" | "FINISHED";

export interface Team {
  id: string;
  name: string;
  groupId: string;
  color: string;
}

export interface Match {
  id: string;
  stage: Stage;
  groupId?: string;
  court: number;
  scheduledStart: string;
  status: MatchStatus;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  timerServerStartedAt?: string;
  timerElapsedSecondsAtPause?: number;
  isPenaltyShootout?: boolean;
  penaltyHomeScore?: number;
  penaltyAwayScore?: number;
  sourceMatchIds?: string[];
}
