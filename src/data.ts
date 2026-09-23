import type { Match, Team } from "./types";

const groupNames = ["A", "B", "C", "D", "E", "F", "G", "H"];
const palette = ["#f97316", "#22c55e", "#38bdf8", "#a78bfa", "#f43f5e"];

export const teams: Team[] = groupNames.flatMap((groupId, groupIndex) =>
  Array.from({ length: 5 }, (_, index) => ({
    id: `${groupId}${index + 1}`,
    name: `Team${groupIndex * 5 + index + 1}`,
    groupId,
    color: palette[index],
  })),
);

const pairings = (groupId: string) => {
  const ids = teams.filter((team) => team.groupId === groupId).map((team) => team.id);
  const matches: Match[] = [];
  let number = 1;
  for (let i = 0; i < ids.length; i += 1) {
    for (let j = i + 1; j < ids.length; j += 1) {
      const slot = matches.length;
      const start = new Date("2026-09-26T09:00:00+09:00");
      start.setMinutes(start.getMinutes() + Math.floor(slot / 2) * 15 + (groupId.charCodeAt(0) - 65) * 120);
      matches.push({
        id: `G-${groupId}-${number++}`,
        stage: "GROUP",
        groupId,
        court: (slot % 3) + 1,
        scheduledStart: start.toISOString(),
        status: slot === 0 && groupId === "A" ? "LIVE" : slot < 2 ? "FINISHED" : "SCHEDULED",
        homeTeamId: ids[i],
        awayTeamId: ids[j],
        homeScore: slot < 2 ? (slot === 0 ? 2 : 1) : 0,
        awayScore: slot < 2 ? (slot === 0 ? 1 : 1) : 0,
        timerServerStartedAt: slot === 0 && groupId === "A" ? new Date(Date.now() - 318_000).toISOString() : undefined,
      });
    }
  }
  return matches;
};

export const initialMatches: Match[] = groupNames.flatMap(pairings);

export const findTeam = (id: string) => teams.find((team) => team.id === id);
export const formatTime = (iso: string) =>
  new Intl.DateTimeFormat("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(iso));
