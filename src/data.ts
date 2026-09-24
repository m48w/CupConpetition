import { buildTournamentSchedule, GROUP_IDS } from "./schedule";
import type { Match, Team } from "./types";

export const TOURNAMENT_TIME_ZONE = "Asia/Tokyo";

const palette = ["#f97316", "#22c55e", "#38bdf8", "#a78bfa", "#f43f5e"];

export const teams: Team[] = GROUP_IDS.flatMap((groupId, groupIndex) =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `${groupId}${index + 1}`,
    name: `Team${groupIndex * 5 + index + 1}`,
    groupId,
    color: palette[index],
  })),
);

export const initialMatches: Match[] = buildTournamentSchedule(teams);

export const findTeam = (id: string) => teams.find((team) => team.id === id);

export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: TOURNAMENT_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
