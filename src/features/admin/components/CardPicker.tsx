import { useEffect, useState } from "react";
import type { CardColor, Match, Player } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";
import { BackNumber, useTeams } from "../../tournament";

export function CardPicker({
  match,
  teamId,
  color,
  onClose,
}: {
  match: Match;
  teamId: string;
  color: CardColor;
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
        setError("Could not load the players.");
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

  const choose = async (memberId: string) => {
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/matches/${encodeURIComponent(match.id)}/cards`, {
        method: "POST",
        body: JSON.stringify({ teamId, memberId, color }),
      });
      onClose();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "The card could not be saved.");
      setBusy(false);
    }
  };

  const label = color === "YELLOW" ? "Yellow card" : "Red card";
  return (
    <div className="scorer-overlay">
      <section
        className="scorer-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="card-title"
      >
        <header>
          <h2 id="card-title">Record {label}</h2>
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
                <BackNumber value={player.backNumber} />
                <span>{player.name}</span>
              </button>
            ))}
          </div>
        )}
        {players?.length === 0 && !error && (
          <p className="muted">
            This team has no registered players. Cards need a registered player.
          </p>
        )}
        {error && <div className="login-error">{error}</div>}
        <button type="button" className="outline-button" disabled={busy} onClick={onClose}>
          Cancel
        </button>
      </section>
    </div>
  );
}
