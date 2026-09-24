import { useCallback, useEffect, useRef, useState } from "react";
import * as client from "./client";
import { initialMatches } from "../data";
import type { Match, TournamentState } from "../types";

export type ConnectionState = "connecting" | "live" | "offline";

/** 旧バージョンが localStorage に残した試合データを一度だけ捨てる。 */
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

  const accept = useCallback((state: TournamentState) => {
    if (state.version < versionRef.current) return;
    versionRef.current = state.version;
    setMatches(state.matches);
  }, []);

  useEffect(() => {
    dropLegacyStorage();

    const source = new EventSource("/api/stream");
    source.addEventListener("state", (event) => {
      setConnection("live");
      setError(null);
      accept(JSON.parse((event as MessageEvent).data) as TournamentState);
    });
    source.onerror = () => setConnection("offline");

    return () => source.close();
  }, [accept]);

  const run = useCallback(
    async (work: () => Promise<TournamentState>) => {
      try {
        accept(await work());
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        throw cause;
      }
    },
    [accept],
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
