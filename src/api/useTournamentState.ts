import { useCallback, useEffect, useRef, useState } from "react";
import * as client from "./client";
import { shouldApply } from "./version";
import { initialMatches } from "../data";
import type { Match, TournamentState } from "../types";

export type ConnectionState = "connecting" | "live" | "offline";

/** マウント時に旧バージョンが localStorage に残した試合データを捨てる。
 *  StrictMode などで複数回呼ばれても removeItem は冪等なので安全。 */
function dropLegacyStorage(): void {
  try {
    localStorage.removeItem("cupflow-matches");
  } catch {
    // プライベートモードなどで localStorage が使えなくても続行する。
  }
}

export function useTournamentState() {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  /** The server's current truth. SSE is ordered within a connection, and a new
   *  connection's first message supersedes whatever we had — including after the
   *  server rebuilt its state and restarted its version counter. */
  const applyState = useCallback((state: TournamentState) => {
    versionRef.current = state.version;
    setMatches(state.matches);
  }, []);

  /** A mutating call's response, which may land after a newer SSE push. */
  const applyIfNewer = useCallback(
    (state: TournamentState) => {
      if (!shouldApply(state.version, versionRef.current, "response")) return;
      applyState(state);
    },
    [applyState],
  );

  useEffect(() => {
    dropLegacyStorage();

    const source = new EventSource("/api/stream");
    source.addEventListener("state", (event) => {
      setConnection("live");
      setError(null);
      const state = JSON.parse((event as MessageEvent).data) as TournamentState;
      if (shouldApply(state.version, versionRef.current, "sse")) {
        applyState(state);
      }
    });
    source.onerror = () => setConnection("offline");

    return () => source.close();
  }, [applyState]);

  const run = useCallback(
    async (work: () => Promise<TournamentState>) => {
      try {
        applyIfNewer(await work());
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    },
    [applyIfNewer],
  );

  return {
    matches,
    connection,
    error,
    patchMatch: useCallback(
      (id: string, patch: Partial<Match>) => run(() => client.patchMatch(id, patch)),
      [run],
    ),
    replaceMatches: useCallback((next: Match[]) => run(() => client.replaceMatches(next)), [run]),
    reset: useCallback(() => run(() => client.resetTournament()), [run]),
  };
}
