import { useCallback, useEffect, useRef, useState } from "react";
import * as client from "../api/client";
import { parseServerMessage, reconnectDelay, socketUrl } from "../api/socket";
import { shouldApply } from "../api/version";
import { initialMatches } from "../data";
import { applyMatchPatch } from "../logic";
import type { Match, TournamentState } from "../../../types";
import { ApiError } from "../../../utils/http";

export type ConnectionState = "connecting" | "live" | "offline";

/** これだけ何も届かなければ、つながっているように見えても切れているとみなして張り直す。 */
const HEARTBEAT_INTERVAL_MS = 10_000;
const HEARTBEAT_TIMEOUT_MS = 25_000;

/** マウント時に旧バージョンが localStorage に残した試合データを捨てる。
 *  StrictMode などで複数回呼ばれても removeItem は冪等なので安全。 */
function dropLegacyStorage(): void {
  try {
    localStorage.removeItem("cupflow-matches");
  } catch {
    // プライベートモードなどで localStorage が使えなくても続行する。
  }
}

export function useTournamentState({ onUnauthorized }: { onUnauthorized?: () => void } = {}) {
  const [matches, setMatches] = useState<Match[]>(initialMatches);
  const [connection, setConnection] = useState<ConnectionState>("connecting");
  const [error, setError] = useState<string | null>(null);
  const versionRef = useRef(0);

  /** The server's current truth. WebSocket is ordered within a connection, and a new
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

    let disposed = false;
    let socket: WebSocket | null = null;
    let attempt = 0;
    let lastSeen = Date.now();
    let reconnectTimer: number | undefined;

    const connect = () => {
      const current = new WebSocket(socketUrl(window.location));
      socket = current;
      current.onopen = () => {
        attempt = 0;
        lastSeen = Date.now();
      };
      current.onmessage = (event) => {
        lastSeen = Date.now();
        const state = parseServerMessage(event.data);
        if (!state) return;
        setConnection("live");
        setError(null);
        if (shouldApply(state.version, versionRef.current, "push")) applyState(state);
      };
      current.onclose = () => {
        if (socket === current) socket = null;
        if (disposed) return;
        setConnection("offline");
        reconnectTimer = window.setTimeout(connect, reconnectDelay(attempt));
        attempt += 1;
      };
    };

    connect();

    // Browsers can take minutes to notice a dead connection, so ping and give up
    // on a socket that has gone quiet; onclose then schedules the reconnect.
    const heartbeat = window.setInterval(() => {
      if (!socket || socket.readyState !== WebSocket.OPEN) return;
      if (Date.now() - lastSeen > HEARTBEAT_TIMEOUT_MS) {
        socket.close();
        return;
      }
      socket.send("ping");
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      disposed = true;
      window.clearTimeout(reconnectTimer);
      window.clearInterval(heartbeat);
      socket?.close();
    };
  }, [applyState]);

  const run = useCallback(
    async (work: () => Promise<TournamentState>, onError?: () => Promise<void>) => {
      try {
        applyIfNewer(await work());
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
        // The session ran out (12 hours) or was never valid: re-read it so the page shows the sign-in form.
        if (cause instanceof ApiError && cause.status === 401) onUnauthorized?.();
        await onError?.();
      }
    },
    [applyIfNewer, onUnauthorized],
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
    /** Drops the error banner, e.g. after signing back in makes it stale. */
    clearError: useCallback(() => setError(null), []),
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
