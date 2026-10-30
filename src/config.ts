export const EVENT_BASE_PATH = "/20261220";
export const REGISTRATION_BASE_PATH = "/registration/20261220";
export const DEFAULT_TOURNAMENT_ID = "20261220";

/** 暗号化URL（/u/トークン）の先頭部分。ここからは大会IDを読めない。 */
const ENCRYPTED_ROUTE_SEGMENT = "u";

/** 起動時に一度だけ決める大会ID。アドレスバーが /u/... に変わっても変わらない。 */
let currentTournamentId: string | null = null;

/** main.tsx が起動時に呼ぶ。以降の getTournamentId() はこの値を返す。 */
export function setTournamentId(id: string): void {
  currentTournamentId = id;
}

/** パスから大会IDを読む。暗号化URLなら読まずに、決まっている大会IDを返す。 */
export function parseTournamentId(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === ENCRYPTED_ROUTE_SEGMENT) {
    return currentTournamentId ?? DEFAULT_TOURNAMENT_ID;
  }
  if (segments[0] === "registration") {
    return segments[1] ?? DEFAULT_TOURNAMENT_ID;
  }
  return segments[0] ?? DEFAULT_TOURNAMENT_ID;
}

/**
 * 今の大会ID。引数なしなら起動時に決めた値を使う。
 * window.location は暗号化URLに変わるので、起動後は読まない。
 */
export function getTournamentId(pathname?: string): string {
  if (pathname !== undefined) return parseTournamentId(pathname);
  if (currentTournamentId) return currentTournamentId;
  return parseTournamentId(typeof window === "undefined" ? "/" : window.location.pathname);
}

export function tournamentScopedUrl(path: string, pathname?: string): string {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}tournamentId=${encodeURIComponent(getTournamentId(pathname))}`;
}
