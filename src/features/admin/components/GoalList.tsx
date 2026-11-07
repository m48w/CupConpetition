import type { Goal, Match } from "../../../types";
import { goalsOf, TeamBadge, useGoals } from "../../tournament";

/** 管理画面の、選んだ試合のゴール一覧。「Change」で得点者を選び直す。 */
export function GoalList({
  match,
  disabled,
  onChange,
}: {
  match: Match;
  disabled: boolean;
  onChange: (goal: Goal) => void;
}) {
  const goals = goalsOf(useGoals(), match.id);
  if (goals.length === 0) return null;
  return (
    <div className="goal-list">
      <label>GOALS</label>
      <ol>
        {goals.map((goal) => (
          <li key={goal.id}>
            <TeamBadge id={goal.teamId} showName={false} />
            <span>
              {goal.minute}&apos;{" "}
              {goal.playerName ? `#${goal.backNumber ?? ""} ${goal.playerName}` : "Unknown player"}
            </span>
            <button
              type="button"
              className="outline-button"
              disabled={disabled}
              onClick={() => onChange(goal)}
            >
              Change
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
