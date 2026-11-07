import { useState } from "react";
import type { Match, Team } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";
import { rankGroup } from "../../tournament/progression";
import { GROUP_IDS } from "../../tournament/schedule";

/**
 * 直接対決でも決まらない同点（1〜3位の境目にかかるもの）の順番を、Super Admin が決める。
 * 決めるまで、そのグループの1位・2位は Round of 16 に入らない。
 */
export function TieDecisions({
  teams,
  matches,
  groupOrders,
  disabled,
}: {
  teams: Team[];
  matches: Match[];
  groupOrders: Record<string, string[]>;
  disabled: boolean;
}) {
  const pending = GROUP_IDS.flatMap((groupId) => {
    const ranking = rankGroup(groupId, teams, matches, groupOrders[groupId]);
    return ranking.unresolved.length > 0 ? [{ groupId, ranking }] : [];
  });
  if (pending.length === 0) return null;
  return (
    <section className="admin-panel tie-decisions">
      <label>TIE DECISIONS</label>
      <p>
        These groups have teams that are still level after points, goal difference, goals scored and
        head-to-head. Put them in order and save. Their Round of 16 places stay empty until then.
      </p>
      {pending.map(({ groupId, ranking }) => (
        <TieGroup
          key={`${groupId}:${ranking.rows.map((row) => row.team.id).join(",")}`}
          groupId={groupId}
          order={ranking.rows.map((row) => row.team)}
          tied={new Set(ranking.unresolved.flat())}
          disabled={disabled}
        />
      ))}
    </section>
  );
}

function TieGroup({
  groupId,
  order: initial,
  tied,
  disabled,
}: {
  groupId: string;
  order: Team[];
  tied: Set<string>;
  disabled: boolean;
}) {
  const [order, setOrder] = useState(initial);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // 同点のチーム同士だけ入れ替えられる（ほかのチームの順位は変えない）。
  const swap = (index: number, other: number) => {
    if (!tied.has(order[index].id) || !tied.has(order[other]?.id ?? "")) return;
    const next = [...order];
    [next[index], next[other]] = [next[other], next[index]];
    setOrder(next);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/groups/${groupId}/order`, {
        method: "PUT",
        body: JSON.stringify({ teamIds: order.map((team) => team.id) }),
      });
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "The order could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tie-group">
      <strong>Group {groupId}</strong>
      <ol>
        {order.map((team, index) => (
          <li key={team.id} className={tied.has(team.id) ? "tied" : ""}>
            <span>{team.name}</span>
            {tied.has(team.id) && (
              <span className="tie-buttons">
                <button
                  type="button"
                  aria-label={`Move ${team.name} up`}
                  disabled={disabled || !tied.has(order[index - 1]?.id ?? "")}
                  onClick={() => swap(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${team.name} down`}
                  disabled={disabled || !tied.has(order[index + 1]?.id ?? "")}
                  onClick={() => swap(index, index + 1)}
                >
                  ↓
                </button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {error && <div className="login-error">{error}</div>}
      <button
        type="button"
        className="primary-button"
        disabled={disabled || busy}
        onClick={() => void save()}
      >
        Save order
      </button>
    </div>
  );
}
