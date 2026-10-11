import type { Match, Team, TournamentState } from "../../../types";
import { requestJson } from "../../../utils/http";

const request = (path: string, init?: RequestInit) => requestJson<TournamentState>(path, init);

export const fetchState = () => request("/api/state");

export const patchMatch = (id: string, patch: Partial<Match>) =>
  request(`/api/matches/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });

export const replaceMatches = (matches: Match[]) =>
  request("/api/matches", { method: "PUT", body: JSON.stringify({ matches }) });

export const resetTournament = () => request("/api/reset", { method: "POST", body: "{}" });

export const addTeam = (team: Omit<Team, "id">) =>
  request("/api/teams", { method: "POST", body: JSON.stringify(team) });

export const updateTeam = (id: string, team: Omit<Team, "id">) =>
  request(`/api/teams/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(team),
  });

export const deleteTeam = (id: string) =>
  request(`/api/teams/${encodeURIComponent(id)}`, { method: "DELETE", body: "{}" });

export const initializeTournament = () =>
  request("/api/initialize", { method: "POST", body: "{}" });

export const generateSchedule = () => request("/api/schedule", { method: "POST", body: "{}" });
