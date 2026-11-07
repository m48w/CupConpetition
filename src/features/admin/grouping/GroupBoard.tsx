import { useCallback, useEffect, useMemo, useState } from "react";
import { tournamentScopedUrl } from "../../../config";
import type { Match, Team } from "../../../types";
import { ApiError, requestJson } from "../../../utils/http";
import { GROUP_IDS } from "../../tournament/schedule";
import {
  canMove,
  emptyDraft,
  isDirty,
  isFull,
  MAX_TEAMS_PER_GROUP,
  moveTeam,
  scheduleProblems,
  toDraft,
  UNASSIGNED,
  unassignedTeams,
  zoneOf,
  type Draft,
  type GroupCandidate,
  type ZoneId,
} from "./draft";
import { useDragAndDrop } from "./useDragAndDrop";

interface GroupDraftResponse {
  candidates: GroupCandidate[];
  groups: Record<string, string[]>;
  locked: boolean;
  hasMatches: boolean;
}

function TeamLogo({ candidate }: { candidate: GroupCandidate }) {
  return candidate.logoId ? (
    <img
      src={tournamentScopedUrl(`/api/logos/${encodeURIComponent(candidate.logoId)}`)}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  ) : (
    <i className="team-crest" aria-hidden="true">
      {candidate.teamName.slice(0, 2).toUpperCase()}
    </i>
  );
}

/**
 * Super Admin のグループ分け。登録チームを8グループへドラッグ＆ドロップ（またはタップ）で分け、
 * 「Save groups」で保存、「Generate schedule」で試合を作る。
 */
export function GroupBoard({
  tournamentId,
  teams,
  matches,
  disabled,
  onInitialize,
  onGenerateSchedule,
}: {
  tournamentId: string;
  teams: Team[];
  matches: Match[];
  disabled: boolean;
  onInitialize: () => void;
  onGenerateSchedule: () => void;
}) {
  const [candidates, setCandidates] = useState<GroupCandidate[]>([]);
  const [saved, setSaved] = useState<Draft>(emptyDraft);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [locked, setLocked] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const dirty = isDirty(draft, saved);
  const problems = scheduleProblems(saved);
  const byId = useMemo(() => new Map(candidates.map((c) => [c.id, c])), [candidates]);
  const matchStarted = matches.some(
    (match) => match.status !== "SCHEDULED" || match.homeScore > 0 || match.awayScore > 0,
  );
  const isLocked = locked || matchStarted;

  const load = useCallback(async () => {
    const body = await requestJson<GroupDraftResponse>("/api/admin/group-draft");
    const ids = new Set(body.candidates.map((candidate) => candidate.id));
    const next = toDraft(body.groups, ids);
    setCandidates(body.candidates);
    setSaved(next);
    setDraft(next);
    setLocked(body.locked);
  }, []);

  // 最初と、試合用チームが変わったとき（保存・初期化・ほかの管理者の操作）に読み直す。
  // 未保存の変更があるときは上書きしない。
  const teamsKey = teams.map((team) => `${team.id}:${team.groupId}`).join(",");
  useEffect(() => {
    if (dirty) return;
    // The state update occurs after the API request resolves; this effect only starts loading.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load().catch(() => setError("Could not load registered teams."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load, teamsKey]);

  // 保存していない変更があるときは、ページを離れる前に確かめる。
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const move = useCallback(
    (teamId: string, zone: ZoneId) => {
      if (isLocked) return;
      setDraft((current) => moveTeam(current, teamId, zone));
      setSelected(null);
    },
    [isLocked],
  );
  const { drag, consumeDragClick, handlers } = useDragAndDrop(move);

  const save = async () => {
    if (
      matches.length > 0 &&
      !window.confirm("Saving will delete the current matches. Continue?")
    ) {
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await requestJson("/api/teams/groups", {
        method: "PUT",
        body: JSON.stringify({ groups: draft }),
      });
      await load();
      setNotice("Groups saved. Generate the schedule when you are ready.");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Groups could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  const chip = (candidate: GroupCandidate) => {
    const isSelected = selected === candidate.id;
    const isDragging = drag?.teamId === candidate.id;
    return (
      <button
        key={candidate.id}
        type="button"
        className={`group-chip${isSelected ? " selected" : ""}${isDragging ? " dragging" : ""}`}
        disabled={isLocked || disabled}
        aria-pressed={isSelected}
        title={candidate.clubName}
        {...handlers(candidate.id)}
        onClick={() => {
          if (consumeDragClick()) return;
          setSelected(isSelected ? null : candidate.id);
        }}
      >
        <TeamLogo candidate={candidate} />
        <span>{candidate.teamName}</span>
      </button>
    );
  };

  const zoneClass = (zone: ZoneId) => {
    const target = drag?.teamId ?? selected;
    const classes = ["group-zone"];
    if (drag?.over === zone) classes.push(canMove(draft, drag.teamId, zone) ? "over" : "blocked");
    else if (target && zoneOf(draft, target) !== zone && canMove(draft, target, zone)) {
      classes.push("can-drop");
    }
    return classes.join(" ");
  };

  const dropHere = (zone: ZoneId) => {
    if (selected) move(selected, zone);
  };

  const unassigned = unassignedTeams(draft, candidates);
  const status = isLocked
    ? "Groups are locked because a match has started. Initialize to change them."
    : dirty
      ? "Unsaved changes"
      : matches.length > 0
        ? `Saved · ${matches.length} matches created`
        : "Saved";

  return (
    <section className="admin-panel group-board">
      <div className="team-manager-heading">
        <div>
          <label>TOURNAMENT DATA</label>
          <h3>
            {tournamentId === "test"
              ? "Test tournament · sample data"
              : `Tournament · ${tournamentId}`}
          </h3>
          <p className={dirty ? "group-status dirty" : "group-status"} role="status">
            {status}
          </p>
        </div>
        <div className="group-actions">
          <button
            type="button"
            className="danger-button"
            disabled={disabled || busy}
            onClick={() => {
              if (
                window.confirm(
                  `Clear all groups and matches for “${tournamentId}”? Registered teams are kept.`,
                )
              ) {
                onInitialize();
              }
            }}
          >
            Initialize
          </button>
          <button
            type="button"
            className="outline-button"
            disabled={!dirty || busy}
            onClick={() => {
              setDraft(saved);
              setSelected(null);
            }}
          >
            Reset to saved
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={!dirty || busy || disabled || isLocked}
            onClick={() => void save()}
          >
            Save groups
          </button>
          <button
            type="button"
            className="primary-button"
            disabled={dirty || busy || disabled || isLocked || problems.length > 0}
            onClick={onGenerateSchedule}
          >
            Generate schedule
          </button>
        </div>
      </div>

      <p className="muted">
        Drag registered teams into the groups (2–{MAX_TEAMS_PER_GROUP} teams each), or tap a team
        and then tap a group. Save the groups, then generate the schedule.
      </p>
      {!dirty && problems.length > 0 && !isLocked && (
        <p className="group-problems">{problems.join(" · ")}</p>
      )}
      {error && <div className="login-error">{error}</div>}
      {notice && !error && <p className="group-notice">{notice}</p>}

      <div
        className={zoneClass(UNASSIGNED)}
        data-drop-zone={UNASSIGNED}
        onClick={(event) => {
          if (event.target === event.currentTarget) dropHere(UNASSIGNED);
        }}
      >
        <div className="group-zone-heading">
          <strong>Registered teams · not in a group</strong>
          <span>{unassigned.length}</span>
          {selected && zoneOf(draft, selected) !== UNASSIGNED && (
            <button type="button" className="outline-button" onClick={() => dropHere(UNASSIGNED)}>
              Remove from group
            </button>
          )}
        </div>
        <div className="group-chips">
          {unassigned.map(chip)}
          {unassigned.length === 0 && (
            <p className="muted">
              {candidates.length === 0
                ? "No teams have registered yet."
                : "All teams are in groups."}
            </p>
          )}
        </div>
      </div>

      <div className="group-grid">
        {GROUP_IDS.map((groupId) => {
          const full = isFull(draft, groupId);
          return (
            <div
              key={groupId}
              className={`${zoneClass(groupId)}${full ? " full" : ""}`}
              data-drop-zone={groupId}
              onClick={(event) => {
                if (event.target === event.currentTarget) dropHere(groupId);
              }}
            >
              <div className="group-zone-heading">
                <strong>Group {groupId}</strong>
                <span>
                  {draft[groupId].length}/{MAX_TEAMS_PER_GROUP}
                </span>
                {selected && zoneOf(draft, selected) !== groupId && (
                  <button
                    type="button"
                    className="outline-button"
                    disabled={full}
                    onClick={() => dropHere(groupId)}
                  >
                    Move here
                  </button>
                )}
              </div>
              <div className="group-chips">
                {draft[groupId].map((id) => {
                  const candidate = byId.get(id);
                  return candidate ? chip(candidate) : null;
                })}
              </div>
            </div>
          );
        })}
      </div>

      {drag && byId.get(drag.teamId) && (
        <div className="group-chip group-chip-ghost" style={{ left: drag.x, top: drag.y }}>
          <TeamLogo candidate={byId.get(drag.teamId)!} />
          <span>{byId.get(drag.teamId)!.teamName}</span>
        </div>
      )}
    </section>
  );
}
