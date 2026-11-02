export type Stage = "GROUP" | "R16" | "QF" | "SF" | "FINAL";
export type MatchStatus = "SCHEDULED" | "LIVE" | "PAUSED" | "FINISHED";

export interface Team {
  id: string;
  name: string;
  groupId: string;
  color: string;
  logoId?: string | null;
}

export interface Match {
  id: string;
  stage: Stage;
  groupId?: string;
  court: number;
  scheduledStart: string;
  durationMinutes: number;
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

export type AnnouncementLevel = "info" | "warning";

/** 管理者が出すお知らせ。英語は必須、ミャンマー語は無ければ英語を表示する。 */
export interface Announcement {
  id: string;
  bodyEn: string;
  bodyMy: string;
  level: AnnouncementLevel;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TournamentState {
  version: number;
  updatedAt: string;
  teams: Team[];
  matches: Match[];
  /** 表示中のお知らせ（新しい順、最大3件）。古いサーバーからは来ないことがある。 */
  announcements?: Announcement[];
}

/** WebSocket でサーバーが送るメッセージ。 */
export interface ServerMessage {
  type: "state";
  state: TournamentState;
}

export type Role = "superadmin" | "subadmin";

/** ログイン中の利用者。`GET /api/session` と `POST /api/login` が返す。 */
export interface SessionInfo {
  username: string;
  role: Role;
  /** SubAdmin の担当コート。Super-admin は全コートなので null。 */
  court: number | null;
}
