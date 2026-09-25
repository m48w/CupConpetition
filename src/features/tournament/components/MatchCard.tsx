import { useEffect, useState } from "react";
import type { Match } from "../../../types";
import { formatTime } from "../../../utils/format";
import { stageLabel } from "../logic";
import { TeamBadge } from "./TeamBadge";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    if (match.status !== "LIVE") return;
    const interval = window.setInterval(() => setTick((value) => value + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [match.status]);
  const live = match.status === "LIVE";
  const elapsed = match.timerServerStartedAt ? Math.max(0, Math.floor((Date.now() - Date.parse(match.timerServerStartedAt)) / 1_000) + (match.timerElapsedSecondsAtPause ?? 0)) : 0;
  const timer = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  return <div className={`match-card ${live ? "match-live" : ""} ${compact ? "compact" : ""}`}><div className="match-card-top"><span>{stageLabel[match.stage]} {match.groupId && `· Group ${match.groupId}`}</span><span className={live ? "status live" : `status ${match.status.toLowerCase()}`}>{live ? "LIVE" : match.status === "FINISHED" ? "FT" : formatTime(match.scheduledStart)}</span></div><div className="match-teams"><div><TeamBadge id={match.homeTeamId} /><strong>{match.status === "SCHEDULED" ? "–" : match.homeScore}</strong></div><div><TeamBadge id={match.awayTeamId} /><strong>{match.status === "SCHEDULED" ? "–" : match.awayScore}</strong></div></div><div className="match-card-foot"><span>Match {match.id} · Court {match.court}</span>{live && <span className="timer">{timer}</span>}</div></div>;
}
