import { useCallback, useEffect, useRef, useState } from "react";
import * as client from "../api/client";
import { shouldApply } from "../api/version";
import { initialMatches } from "../data";
import { applyMatchPatch } from "../logic";
import type { Match, TournamentState } from "../../../types";

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
    async (work: () => Promise<TournamentState>, onError?: () => Promise<void>) => {
      try {
        applyIfNewer(await work());
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        await onError?.();
      }
    },
    [applyIfNewer],
  );

  /** Drops an optimistic change the server refused by reloading its truth. If
   *  that fails too, the next SSE push corrects the screen. */
  const resync = useCallback(async () => {
    try {
      applyState(await client.fetchState());
    } catch {
      // The error banner is already showing; wait for the stream to recover.
    }
  }, [applyState]);

  return {
    matches,
    connection,
    error,
    /** Applied to the screen at once so rapid score taps build on each other
     *  instead of each one starting from the last confirmed score. */
    patchMatch: useCallback(
      (id: string, patch: Partial<Match>) => {
        setMatches((current) => applyMatchPatch(current, id, patch));
        return run(() => client.patchMatch(id, patch), resync);
      },
      [run, resync],
    ),
    replaceMatches: useCallback((next: Match[]) => run(() => client.replaceMatches(next)), [run]),
    reset: useCallback(() => run(() => client.resetTournament()), [run]),
  };
}
