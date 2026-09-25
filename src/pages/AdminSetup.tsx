import { useState } from "react";
import { PageTitle } from "../components/ui/PageTitle";
import { MatchStateBanner, ResetButton, ScheduleCheck } from "../features/admin";
import {
  findTeam,
  isOnPitch,
  statusPatch,
  TeamBadge,
  type ConnectionState,
} from "../features/tournament";
import type { Match, MatchStatus } from "../types";
import { formatTime } from "../utils/format";

export function AdminSetup({
  matches,
  updateMatch,
  generateSchedule,
  resetTournament,
  connection,
}: {
  matches: Match[];
  updateMatch: (id: string, patch: Partial<Match>) => void;
  generateSchedule: () => void;
  resetTournament: () => void;
  connection: ConnectionState;
}) {
  const [selectedId, setSelectedId] = useState(() => (matches.find(isOnPitch) ?? matches[0])?.id);
  const selected = matches.find((match) => match.id === selectedId);
  const offline = connection !== "live";

  // Each tap is saved at once so spectators see the goal immediately.
  const changeScore = (side: "homeScore" | "awayScore", delta: number) => {
    if (!selected) return;
    updateMatch(selected.id, { [side]: Math.max(0, selected[side] + delta) });
  };

  const changeStatus = (status: MatchStatus) => {
    if (!selected) return;
    updateMatch(selected.id, statusPatch(selected, status));
  };

  return (
    <>
      <PageTitle eyebrow="ADMIN CONSOLE" title="Match control">
        <span className="admin-pill">ADMIN MODE</span>
      </PageTitle>
      <div className="admin-grid">
        <section className="admin-panel">
          <label>SELECT MATCH</label>
          <select
            value={selected?.id ?? ""}
            onChange={(event) => {
              const next = matches.find((m) => m.id === event.target.value);
              if (next) setSelectedId(next.id);
            }}
          >
            {matches
              .filter((m) => m.status !== "FINISHED" || m.id === selectedId)
              .slice(0, 20)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {formatTime(m.scheduledStart)} · {findTeam(m.homeTeamId)?.name ?? "TBD"} vs{" "}
                  {findTeam(m.awayTeamId)?.name ?? "TBD"}
                  {m.status !== "SCHEDULED" && ` · ${m.status}`}
                </option>
              ))}
          </select>
          {selected && (
            <>
              <MatchStateBanner match={selected} />
              <div className="control-score">
                {(["homeScore", "awayScore"] as const).map((side) => (
                  <div key={side}>
                    <TeamBadge
                      id={side === "homeScore" ? selected.homeTeamId : selected.awayTeamId}
                    />
                    <button
                      type="button"
                      disabled={offline || selected.status === "SCHEDULED"}
                      onClick={() => changeScore(side, -1)}
                    >
                      −
                    </button>
                    <b>{selected[side]}</b>
                    <button
                      type="button"
                      disabled={offline || selected.status === "SCHEDULED"}
                      onClick={() => changeScore(side, 1)}
                    >
                      +
                    </button>
                  </div>
                ))}
                {selected.status === "SCHEDULED" && (
                  <p className="muted">Start the match to record goals.</p>
                )}
              </div>
              <div className="control-actions">
                {selected.status === "SCHEDULED" && (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={offline}
                    onClick={() => changeStatus("LIVE")}
                  >
                    ▶ Start match
                  </button>
                )}
                {selected.status === "LIVE" && (
                  <button
                    type="button"
                    className="outline-button"
                    disabled={offline}
                    onClick={() => changeStatus("PAUSED")}
                  >
                    Ⅱ Pause
                  </button>
                )}
                {selected.status === "PAUSED" && (
                  <button
                    type="button"
                    className="primary-button"
                    disabled={offline}
                    onClick={() => changeStatus("LIVE")}
                  >
                    ▶ Resume
                  </button>
                )}
                {(selected.status === "LIVE" || selected.status === "PAUSED") && (
                  <button
                    type="button"
                    className="danger-button"
                    disabled={offline}
                    onClick={() => changeStatus("FINISHED")}
                  >
                    ■ Finish match
                  </button>
                )}
              </div>
            </>
          )}
        </section>
        <section className="admin-panel setup-panel">
          <label>SUPERADMIN SETUP</label>
          <h3>Seed knockout teams</h3>
          <p>
            Group fixtures run from 09:00 on courts 1–2, with court 3 joining at 12:15. Once the
            group stage is final, this fills the Round of 16 from the standings without moving any
            kick-off time.
          </p>
          <ScheduleCheck matches={matches} />
          <button
            type="button"
            className="primary-button"
            disabled={offline}
            onClick={generateSchedule}
          >
            ✦ Seed knockout teams
          </button>
          <ResetButton onReset={resetTournament} disabled={offline} />
        </section>
      </div>
    </>
  );
}
