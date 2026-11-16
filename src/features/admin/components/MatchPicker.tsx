import { useState } from "react";
import type { Match, Stage, Team } from "../../../types";
import { formatTime } from "../../../utils/format";
import { stageLabel } from "../../tournament";

type StatusFilter = "UNFINISHED" | "ALL" | "NOT_STARTED" | "PLAYING" | "FINISHED";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "UNFINISHED", label: "Not finished" },
  { value: "ALL", label: "Status · All" },
  { value: "NOT_STARTED", label: "Not started" },
  { value: "PLAYING", label: "Playing" },
  { value: "FINISHED", label: "Finished" },
];

const matchesStatus = (match: Match, filter: StatusFilter) =>
  filter === "ALL" ||
  (filter === "UNFINISHED" && match.status !== "FINISHED") ||
  (filter === "NOT_STARTED" && match.status === "SCHEDULED") ||
  (filter === "PLAYING" && (match.status === "LIVE" || match.status === "PAUSED")) ||
  (filter === "FINISHED" && match.status === "FINISHED");

/**
 * 管理画面の試合選び。最初は終わっていない試合だけを時間の順に出す（Status で Finished を選べば終わった試合も）。
 * `fixedCourt` があるとき（SubAdmin）は、コートの絞り込みを出さない。
 */
export function MatchPicker({
  matches,
  teams,
  selectedId,
  onSelect,
  fixedCourt,
}: {
  matches: Match[];
  teams: Team[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  fixedCourt: number | null;
}) {
  const [court, setCourt] = useState("ALL");
  const [stage, setStage] = useState<Stage | "ALL">("ALL");
  const [status, setStatus] = useState<StatusFilter>("UNFINISHED");
  const name = (id: string) => teams.find((team) => team.id === id)?.name ?? "TBD";

  const shown = [...matches]
    .filter(
      (match) =>
        (court === "ALL" || String(match.court) === court) &&
        (stage === "ALL" || match.stage === stage) &&
        matchesStatus(match, status),
    )
    .sort(
      (a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart) || a.court - b.court,
    );
  // 絞り込みで見えなくなっても、選んでいる試合は一覧に残す（select の表示がずれないように）。
  const selected = matches.find((match) => match.id === selectedId);
  if (selected && !shown.includes(selected)) shown.unshift(selected);

  return (
    <div className="match-picker">
      <div className="match-picker-filters">
        {fixedCourt === null && (
          <select aria-label="Court" value={court} onChange={(e) => setCourt(e.target.value)}>
            <option value="ALL">Court · All</option>
            {[1, 2, 3].map((value) => (
              <option key={value} value={value}>
                Court {value}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Stage"
          value={stage}
          onChange={(e) => setStage(e.target.value as Stage | "ALL")}
        >
          <option value="ALL">Stage · All</option>
          {(["GROUP", "R16", "QF", "SF", "FINAL"] as const).map((value) => (
            <option key={value} value={value}>
              {stageLabel[value]}
            </option>
          ))}
        </select>
        <select
          aria-label="Status"
          value={status}
          onChange={(e) => setStatus(e.target.value as StatusFilter)}
        >
          {STATUS_FILTERS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <select
        aria-label="Match"
        className="match-picker-select"
        value={selectedId ?? ""}
        disabled={matches.length === 0}
        onChange={(event) => onSelect(event.target.value)}
      >
        {matches.length === 0 && <option value="">No matches yet</option>}
        {shown.map((match) => (
          <option key={match.id} value={match.id}>
            {formatTime(match.scheduledStart)} · Court {match.court} ·{" "}
            {match.groupId ? `Group ${match.groupId}` : stageLabel[match.stage]} ·{" "}
            {name(match.homeTeamId)} vs {name(match.awayTeamId)}
            {match.status !== "SCHEDULED" && ` · ${match.status}`}
          </option>
        ))}
      </select>
      <small className="muted">
        {shown.length} of {matches.length} matches
      </small>
    </div>
  );
}
