import { useCallback, useState } from "react";
import { PageTitle } from "../components/ui/PageTitle";
import {
  AnnouncementsPanel,
  GoalList,
  MatchPicker,
  MatchStateBanner,
  PenaltyShootout,
  ResetButton,
  ScheduleCheck,
  ScorerPicker,
  TieDecisions,
} from "../features/admin";
import { needsPenaltyWinner } from "../features/tournament/progression";
import { SIGN_OUT_FAILED } from "../features/auth";
import {
  isOnPitch,
  statusPatch,
  TeamBadge,
  tracksScorers,
  type ConnectionState,
  useGroupOrders,
  useTeams,
} from "../features/tournament";
import type { Match, MatchStatus, SessionInfo, Team } from "../types";
import { ApiError, requestJson } from "../utils/http";
import { GroupBoard } from "../features/admin/grouping/GroupBoard";

export function AdminSetup({
  eyebrow,
  account,
  onSignOut,
  matches,
  updateMatch,
  setup,
  connection,
  teams,
}: {
  eyebrow: string;
  account: SessionInfo;
  /** Resolves to whether the server confirmed the logout, so the console can report a failure. */
  onSignOut: () => Promise<boolean>;
  matches: Match[];
  teams: Team[];
  updateMatch: (id: string, patch: Partial<Match>) => void;
  /** Super-admin だけに出す大会全体の操作。 */
  setup?: {
    tournamentId: string;
    generateSchedule: () => void;
    resetTournament: () => void;
    initializeTournament: () => void;
    createSchedule: () => void;
  };
  connection: ConnectionState;
}) {
  const [selectedId, setSelectedId] = useState(() => (matches.find(isOnPitch) ?? matches[0])?.id);
  const [signOutFailed, setSignOutFailed] = useState(false);
  /** 「Who scored?」を出しているチーム（`goalId` があれば得点者の変更）。 */
  const [scorerFor, setScorerFor] = useState<{ teamId: string; goalId?: string } | null>(null);
  const [goalError, setGoalError] = useState("");
  const closeScorer = useCallback(() => setScorerFor(null), []);
  const selected =
    matches.find((match) => match.id === selectedId) ?? matches.find(isOnPitch) ?? matches[0];
  const offline = connection !== "live";
  const currentTeams = useTeams();
  const groupOrders = useGroupOrders();

  const handleSignOut = async () => {
    setSignOutFailed(!(await onSignOut()));
  };

  // Each tap is saved at once so spectators see the goal immediately.
  const changeScore = (side: "homeScore" | "awayScore", delta: number) => {
    if (!selected) return;
    // 準々決勝からは得点者も記録する。「+」で選手を選び、「−」で最後のゴールを消す。
    if (tracksScorers(selected)) {
      const teamId = side === "homeScore" ? selected.homeTeamId : selected.awayTeamId;
      setGoalError("");
      if (delta > 0) {
        setScorerFor({ teamId });
        return;
      }
      void requestJson(
        `/api/matches/${encodeURIComponent(selected.id)}/goals/last?team=${encodeURIComponent(teamId)}`,
        { method: "DELETE" },
      ).catch((reason: unknown) =>
        setGoalError(
          reason instanceof ApiError ? reason.message : "The goal could not be removed.",
        ),
      );
      return;
    }
    updateMatch(selected.id, { [side]: Math.max(0, selected[side] + delta) });
  };

  const changeStatus = (status: MatchStatus) => {
    if (!selected) return;
    updateMatch(selected.id, statusPatch(selected, status));
  };

  return (
    <>
      <PageTitle eyebrow={eyebrow} title="Match control">
        <div className="console-account">
          <span className="admin-pill">
            {account.court === null ? "ALL COURTS" : `COURT ${account.court}`} · {account.username}
          </span>
          {signOutFailed && <div className="login-error">{SIGN_OUT_FAILED}</div>}
          <button type="button" className="outline-button" onClick={() => void handleSignOut()}>
            Sign out
          </button>
        </div>
      </PageTitle>
      {setup && (
        <GroupBoard
          teams={teams}
          matches={matches}
          tournamentId={setup.tournamentId}
          disabled={offline}
          onInitialize={setup.initializeTournament}
          onGenerateSchedule={setup.createSchedule}
        />
      )}
      {setup && (
        <TieDecisions
          teams={currentTeams}
          matches={matches}
          groupOrders={groupOrders}
          disabled={offline}
        />
      )}
      {setup && <AnnouncementsPanel disabled={offline} />}
      <div className="admin-grid">
        <section className="admin-panel">
          <label>SELECT MATCH</label>
          <MatchPicker
            matches={matches}
            teams={currentTeams}
            selectedId={selected?.id}
            onSelect={(id) => {
              setSelectedId(id);
              setScorerFor(null);
              setGoalError("");
            }}
            fixedCourt={account.court}
          />
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
              {goalError && <div className="login-error">{goalError}</div>}
              {tracksScorers(selected) && (
                <GoalList
                  match={selected}
                  disabled={offline}
                  onChange={(goal) => setScorerFor({ teamId: goal.teamId, goalId: goal.id })}
                />
              )}
              {scorerFor && (
                <ScorerPicker
                  key={`${selected.id}:${scorerFor.teamId}:${scorerFor.goalId ?? "new"}`}
                  match={selected}
                  teamId={scorerFor.teamId}
                  goalId={scorerFor.goalId}
                  onClose={closeScorer}
                />
              )}
              <PenaltyShootout
                match={selected}
                disabled={offline}
                onChange={(patch) => updateMatch(selected.id, patch)}
              />
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
                    disabled={offline || needsPenaltyWinner({ ...selected, status: "FINISHED" })}
                    onClick={() => changeStatus("FINISHED")}
                  >
                    ■ Finish match
                  </button>
                )}
              </div>
            </>
          )}
        </section>
        {setup && (
          <section className="admin-panel setup-panel">
            <label>SUPERADMIN SETUP</label>
            <h3>Seed knockout teams (for testing)</h3>
            <p>
              Teams move into the knockout stage automatically when a group finishes and when a
              knockout match ends. For testing, this button fills the Round of 16 from the current
              standings even if the groups are not finished. Kick-off times do not change.
            </p>
            <ScheduleCheck matches={matches} />
            <button
              type="button"
              className="primary-button"
              disabled={offline}
              onClick={setup.generateSchedule}
            >
              ✦ Seed knockout teams
            </button>
            <ResetButton onReset={setup.resetTournament} disabled={offline} />
          </section>
        )}
      </div>
    </>
  );
}
