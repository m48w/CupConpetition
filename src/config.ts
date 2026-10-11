export const EVENT_BASE_PATH = "/20261220";
export const REGISTRATION_BASE_PATH = "/registration/20261220";
export const DEFAULT_TOURNAMENT_ID = "20261220";

export function getTournamentId(pathname = window.location.pathname): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "registration") {
    return segments[1] ?? DEFAULT_TOURNAMENT_ID;
  }
  return segments[0] ?? DEFAULT_TOURNAMENT_ID;
}

export function tournamentScopedUrl(path: string, pathname = window.location.pathname): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tournamentId=${encodeURIComponent(getTournamentId(pathname))}`;
}
