import type { Match, TournamentState } from "../../../types";

async function request(path: string, init?: RequestInit): Promise<TournamentState> {
  const response = await fetch(path, {
    ...init,
    headers: init?.body ? { "content-type": "application/json", ...init?.headers } : init?.headers,
  });

  if (!response.ok) {
    const detail = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(detail.error ?? `request failed: ${response.status}`);
  }

  return (await response.json()) as TournamentState;
}

export const fetchState = () => request("/api/state");

export const patchMatch = (id: string, patch: Partial<Match>) =>
  request(`/api/matches/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(patch) });

export const replaceMatches = (matches: Match[]) =>
  request("/api/matches", { method: "PUT", body: JSON.stringify({ matches }) });

export const resetTournament = () => request("/api/reset", { method: "POST" });
