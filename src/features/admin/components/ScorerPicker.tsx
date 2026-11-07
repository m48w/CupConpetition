import { useEffect, useState } from "react";
import type { Match, Player } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";
import { useTeams } from "../../tournament";

/**
 * 「Who scored?」。選手を押すとゴールを記録して1点増える（`goalId` があれば得点者を変えるだけ）。
 * 選手がわからないときは Unknown player。
 */
export function ScorerPicker({
  match,
  teamId,
  goalId,
  onClose,
}: {
  match: Match;
  teamId: string;
  /** 記録済みのゴールの得点者を変えるとき。 */
  goalId?: string;
  onClose: () => void;
}) {
  const team = useTeams().find((item) => item.id === teamId);
  const [players, setPlayers] = useState<Player[] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    requestJson<{ home: Player[]; away: Player[] }>(
      `/api/matches/${encodeURIComponent(match.id)}/players`,
    )
      .then((result) => {
        if (alive) setPlayers(teamId === match.homeTeamId ? result.home : result.away);
      })
      .catch(() => {
        if (!alive) return;
        setPlayers([]);
        setError("Could not load the players. You can still choose Unknown player.");
      });
    return () => {
      alive = false;
    };
  }, [match.id, match.homeTeamId, teamId]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const choose = async (memberId: string | null) => {
    setBusy(true);
    setError("");
    try {
      if (goalId) {
        await requestJson(`/api/goals/${encodeURIComponent(goalId)}`, {
          method: "PATCH",
          body: JSON.stringify({ memberId }),
        });
      } else {
        await requestJson(`/api/matches/${encodeURIComponent(match.id)}/goals`, {
          method: "POST",
          body: JSON.stringify({ teamId, memberId }),
        });
      }
      onClose();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "The goal could not be saved.");
      setBusy(false);
    }
  };

  return (
    <div className="scorer-overlay">
      <section
        className="scorer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="scorer-title"
      >
        <header>
          <h2 id="scorer-title">{goalId ? "Change scorer" : "Who scored?"}</h2>
          <span className="muted">{team?.name ?? teamId}</span>
        </header>
        {players === null ? (
          <p className="muted">Loading players…</p>
        ) : (
          <div className="scorer-options">
            {players.map((player) => (
              <button
                key={player.id}
                type="button"
                disabled={busy}
                onClick={() => void choose(player.id)}
              >
                <b>#{player.backNumber}</b>
                <span>{player.name}</span>
              </button>
            ))}
            <button
              type="button"
              className="scorer-unknown"
              disabled={busy}
              onClick={() => void choose(null)}
            >
              Unknown player
            </button>
          </div>
        )}
        {players?.length === 0 && !error && (
          <p className="muted">This team has no registered players.</p>
        )}
        {error && <div className="login-error">{error}</div>}
        <button type="button" className="outline-button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  );
}
