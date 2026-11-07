import type { Match } from "../../../types";
import { needsPenaltyWinner } from "../../tournament/progression";

/**
 * 決勝トーナメントで同点のときの PK 戦の点数。＋／− で入れる。
 * グループの試合・同点でない試合・未開始の試合では何も出さない。
 */
export function PenaltyShootout({
  match,
  disabled,
  onChange,
}: {
  match: Match;
  disabled: boolean;
  onChange: (patch: Partial<Match>) => void;
}) {
  if (match.stage === "GROUP" || match.status === "SCHEDULED") return null;
  if (match.homeScore !== match.awayScore) return null;
  const home = match.penaltyHomeScore ?? 0;
  const away = match.penaltyAwayScore ?? 0;
  const change = (side: "penaltyHomeScore" | "penaltyAwayScore", delta: number) => {
    const value = Math.max(0, (side === "penaltyHomeScore" ? home : away) + delta);
    onChange({ isPenaltyShootout: true, [side]: value });
  };
  return (
    <div className="penalty-shootout">
      <label>PENALTY SHOOT-OUT</label>
      <div className="penalty-score">
        {(
          [
            ["penaltyHomeScore", home],
            ["penaltyAwayScore", away],
          ] as const
        ).map(([side, value]) => (
          <div key={side}>
            <button type="button" disabled={disabled} onClick={() => change(side, -1)}>
              −
            </button>
            <b>{value}</b>
            <button type="button" disabled={disabled} onClick={() => change(side, 1)}>
              +
            </button>
          </div>
        ))}
      </div>
      {needsPenaltyWinner({ ...match, status: "FINISHED" }) && (
        <p className="penalty-note">Enter the penalty shoot-out result before finishing.</p>
      )}
    </div>
  );
}
