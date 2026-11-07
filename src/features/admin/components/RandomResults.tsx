import { useState } from "react";
import type { Stage } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";
import { useIsStaging } from "../../../utils/useIsStaging";

const STAGES: { stage: Stage; label: string }[] = [
  { stage: "GROUP", label: "Group stage" },
  { stage: "R16", label: "Round of 16" },
  { stage: "QF", label: "Quarter-finals" },
  { stage: "SF", label: "Semi-finals" },
  { stage: "FINAL", label: "Final" },
];

/**
 * テスト用。ステージごとに、まだ終わっていない試合へランダムな結果を入れる。
 * テスト環境・ローカルだけに出す（本番ではサーバーも 403 で断る）。
 */
export function RandomResults({ disabled }: { disabled: boolean }) {
  const isStaging = useIsStaging();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (!isStaging) return null;

  const fill = async (stage: Stage, label: string) => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const { filled } = await requestJson<{ filled: number }>("/api/admin/test/random-results", {
        method: "POST",
        body: JSON.stringify({ stage }),
      });
      setMessage(
        filled > 0
          ? `${label}: ${filled} ${filled === 1 ? "match" : "matches"} finished with random results.`
          : `${label}: nothing to fill. The matches are finished, or their teams are not decided yet.`,
      );
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Random results could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="admin-panel random-results">
      <label>TEST TOOLS · TEST SITE ONLY</label>
      <p>
        Fill every unfinished match of a stage with a random result and finish it. Knockout draws
        get a random penalty shoot-out. From the quarter-finals, scorers are picked at random. Run
        the stages in order.
      </p>
      <div className="random-results-buttons">
        {STAGES.map(({ stage, label }) => (
          <button
            key={stage}
            type="button"
            className="outline-button"
            disabled={disabled || busy}
            onClick={() => void fill(stage, label)}
          >
            🎲 {label}
          </button>
        ))}
      </div>
      {message && <p className="muted">{message}</p>}
      {error && <div className="login-error">{error}</div>}
    </section>
  );
}
