import { useState, type FormEvent } from "react";
import { GROUP_IDS } from "../features/tournament/schedule";
import type { Match, Team } from "../types";

type TeamDetails = Omit<Team, "id">;

export function TeamManager({
  teams,
  matches,
  tournamentId,
  disabled,
  onInitialize,
  onGenerateSchedule,
  onAddTeam,
  onUpdateTeam,
  onDeleteTeam,
}: {
  teams: Team[];
  matches: Match[];
  tournamentId: string;
  disabled: boolean;
  onInitialize: () => void;
  onGenerateSchedule: () => void;
  onAddTeam: (team: TeamDetails) => Promise<void>;
  onUpdateTeam: (id: string, team: TeamDetails) => Promise<void>;
  onDeleteTeam: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [groupId, setGroupId] = useState<(typeof GROUP_IDS)[number]>("A");
  const [color, setColor] = useState("#38bdf8");
  const [editingId, setEditingId] = useState<string | null>(null);
  const matchStarted = matches.some(
    (match) => match.status !== "SCHEDULED" || match.homeScore > 0 || match.awayScore > 0,
  );
  const groupCounts = GROUP_IDS.map(
    (group) => `${group}:${teams.filter((team) => team.groupId === group).length}`,
  );
  const scheduleReady =
    teams.length === 40 &&
    GROUP_IDS.every((group) => teams.filter((team) => team.groupId === group).length === 5);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const team = { name: name.trim(), groupId, color };
    if (editingId) await onUpdateTeam(editingId, team);
    else await onAddTeam(team);
    setName("");
    setEditingId(null);
  };

  const edit = (team: Team) => {
    setEditingId(team.id);
    setName(team.name);
    setGroupId(team.groupId as (typeof GROUP_IDS)[number]);
    setColor(team.color);
  };

  return (
    <section className="admin-panel team-manager">
      <div className="team-manager-heading">
        <div>
          <label>TOURNAMENT DATA</label>
          <h3>
            {tournamentId === "test"
              ? "Test tournament · sample data"
              : `Tournament · ${tournamentId}`}
          </h3>
          <p>
            {teams.length} teams · {matches.length} matches
          </p>
        </div>
        <button
          type="button"
          className="danger-button"
          disabled={disabled}
          onClick={() => {
            if (window.confirm(`Clear all teams and matches for “${tournamentId}”?`))
              onInitialize();
          }}
        >
          Initialize empty
        </button>
      </div>

      <p className="muted">
        Data is isolated by tournament URL. Team changes clear the fixture list. Add 40 teams with 5
        teams in each group, then generate the schedule. Initialize the tournament before editing
        teams after play has started.
      </p>

      <form className="team-editor" onSubmit={(event) => void submit(event)}>
        <label>
          Team name
          <input
            required
            maxLength={120}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter team name"
          />
        </label>
        <label>
          Group
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value as typeof groupId)}
          >
            {GROUP_IDS.map((group) => (
              <option value={group} key={group}>
                Group {group}
              </option>
            ))}
          </select>
        </label>
        <label>
          Color
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} />
        </label>
        <div className="team-editor-actions">
          <button className="primary-button" type="submit" disabled={disabled || matchStarted}>
            {editingId ? "Save team" : "Add team"}
          </button>
          {editingId && (
            <button
              className="outline-button"
              type="button"
              onClick={() => {
                setEditingId(null);
                setName("");
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {matchStarted && (
        <p className="warning-box">
          Team changes are locked after the first match starts. Initialize this tournament to clear
          it before editing.
        </p>
      )}

      <div className="team-manager-list">
        {teams.length === 0 ? (
          <div className="empty-state">No teams yet. Add teams to this tournament.</div>
        ) : (
          teams.map((team) => (
            <div className="team-manager-row" key={team.id}>
              <span className="team-manager-swatch" style={{ backgroundColor: team.color }} />
              <strong>{team.name}</strong>
              <span>Group {team.groupId}</span>
              <button
                type="button"
                className="outline-button"
                disabled={disabled || matchStarted}
                onClick={() => edit(team)}
              >
                Edit
              </button>
              <button
                type="button"
                className="outline-button"
                disabled={disabled || matchStarted}
                onClick={() => {
                  if (window.confirm(`Delete ${team.name}?`)) void onDeleteTeam(team.id);
                }}
              >
                Delete
              </button>
            </div>
          ))
        )}
      </div>

      <div className="control-actions team-manager-footer">
        <button
          type="button"
          className="primary-button"
          disabled={disabled || !scheduleReady || matchStarted}
          onClick={() => {
            if (
              !matches.length ||
              window.confirm(
                "Recreate the fixture schedule from these teams? Existing match results will be removed.",
              )
            ) {
              onGenerateSchedule();
            }
          }}
        >
          Generate schedule
        </button>
        {!scheduleReady && (
          <span className="muted team-schedule-counts">
            Schedule setup: {teams.length}/40 teams · {groupCounts.join(" · ")}
          </span>
        )}
      </div>
    </section>
  );
}
