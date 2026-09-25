import { useState } from "react";
import { PageTitle } from "../components/ui/PageTitle";
import { ResetButton, ScheduleCheck } from "../features/admin";
import { findTeam, TeamBadge, type ConnectionState } from "../features/tournament";
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
  const [selectedId, setSelectedId] = useState(
    () => (matches.find((m) => m.status === "LIVE") ?? matches[0])?.id,
  );
  // An edit this operator has started but not yet saved. While it is null the
  // score follows the latest broadcast, so updates to other matches never
  // discard an unsaved edit.
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const selected = matches.find((match) => match.id === selectedId);
  const score: [number, number] = draft ?? [selected?.homeScore ?? 0, selected?.awayScore ?? 0];
  const editScore = (update: (score: [number, number]) => [number, number]) =>
    setDraft((current) => update(current ?? score));

  const save = (status: MatchStatus) => {
    if (!selected) return;
    updateMatch(selected.id, {
      status,
      homeScore: score[0],
      awayScore: score[1],
      timerServerStartedAt: status === "LIVE" ? new Date().toISOString() : undefined,
    });
    setDraft(null);
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
              if (next) {
                setSelectedId(next.id);
                setDraft(null);
              }
            }}
          >
            {matches
              .filter((m) => m.status !== "FINISHED")
              .slice(0, 20)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {formatTime(m.scheduledStart)} · {findTeam(m.homeTeamId)?.name ?? "TBD"} vs{" "}
                  {findTeam(m.awayTeamId)?.name ?? "TBD"}
                </option>
              ))}
          </select>
          {selected && (
            <>
              <div className="control-score">
                <div>
                  <TeamBadge id={selected.homeTeamId} />
                  <button
                    onClick={() => editScore(([home, away]) => [Math.max(0, home - 1), away])}
                  >
                    −
                  </button>
                  <b>{score[0]}</b>
                  <button onClick={() => editScore(([home, away]) => [home + 1, away])}>+</button>
                </div>
                <div>
                  <TeamBadge id={selected.awayTeamId} />
                  <button
                    onClick={() => editScore(([home, away]) => [home, Math.max(0, away - 1)])}
                  >
                    −
                  </button>
                  <b>{score[1]}</b>
                  <button onClick={() => editScore(([home, away]) => [home, away + 1])}>+</button>
                </div>
              </div>{" "}
              <div className="control-actions">
                <button
                  type="button"
                  className="primary-button"
                  disabled={connection !== "live"}
                  onClick={() => save("LIVE")}
                >
                  ▶ Start / resume
                </button>
                <button
                  type="button"
                  className="outline-button"
                  disabled={connection !== "live"}
                  onClick={() => save("PAUSED")}
                >
                  Ⅱ Pause
                </button>
                <button
                  type="button"
                  className="danger-button"
                  disabled={connection !== "live"}
                  onClick={() => save("FINISHED")}
                >
                  Finish match
                </button>
              </div>
            </>
          )}
        </section>
        <section className="admin-panel setup-panel">
          <label>SUPERADMIN SETUP</label>
          <h3>Seed knockout teams</h3>
          <p>
            Group fixtures run from 09:00 on 3 courts. Once the group stage is final, this fills the
            Round of 16 from the standings without moving any kick-off time.
          </p>
          <ScheduleCheck matches={matches} />
          <button
            type="button"
            className="primary-button"
            disabled={connection !== "live"}
            onClick={generateSchedule}
          >
            ✦ Seed knockout teams
          </button>
          <ResetButton onReset={resetTournament} disabled={connection !== "live"} />
        </section>
      </div>
    </>
  );
}
