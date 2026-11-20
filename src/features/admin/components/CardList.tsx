import type { Match, MatchCard } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";
import { BackNumber, CardMark, cardRows, TeamBadge, useCards } from "../../tournament";
import { useState } from "react";

const LABELS = { YELLOW: "Yellow card", RED: "Red card", SECOND_YELLOW: "Second yellow card" };

/** Remove は行の ID を消す。2枚目のイエローの行なら、サーバーが自動のレッドも一緒に消す。 */
export function CardList({ match, disabled }: { match: Match; disabled: boolean }) {
  const cards = useCards().filter((card) => card.matchId === match.id);
  const [error, setError] = useState("");
  if (cards.length === 0) return null;

  const remove = async (card: MatchCard) => {
    setError("");
    try {
      await requestJson(`/api/cards/${encodeURIComponent(card.id)}`, { method: "DELETE" });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "The card could not be removed.");
    }
  };

  return (
    <div className="card-list">
      <label>CARDS</label>
      <ol>
        {cardRows(cards).map(({ card, mark }) => (
          <li key={card.id}>
            <TeamBadge id={card.teamId} showName={false} />
            <span className="card-list-entry">
              <CardMark color={mark} label={LABELS[mark]} />
              {card.minute}&apos; <BackNumber value={card.backNumber} />
              {card.playerName ?? "Unknown player"}
            </span>
            <button
              type="button"
              className="outline-button"
              disabled={disabled}
              onClick={() => void remove(card)}
            >
              Remove
            </button>
          </li>
        ))}
      </ol>
      {error && <div className="login-error">{error}</div>}
    </div>
  );
}
