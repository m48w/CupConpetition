import { useEffect, useState } from "react";
import { PageTitle } from "../components/ui/PageTitle";
import { ResetButton, ScheduleCheck } from "../features/admin";
import { findTeam, TeamBadge, type ConnectionState } from "../features/tournament";
import type { Match, MatchStatus } from "../types";
import { formatTime } from "../utils/format";

export function AdminSetup({ matches, updateMatch, generateSchedule, resetTournament, connection }: { matches: Match[]; updateMatch: (id: string, patch: Partial<Match>) => void; generateSchedule: () => void; resetTournament: () => void; connection: ConnectionState }) {
  const [selected, setSelected] = useState<Match | undefined>(() => matches.find((m) => m.status === "LIVE") ?? matches[0]);
  const [score, setScore] = useState<[number, number]>([selected?.homeScore ?? 0, selected?.awayScore ?? 0]);
  const [scoreDirty, setScoreDirty] = useState(false);

  useEffect(() => {
    if (!selected) return;
    const nextMatch = matches.find((match) => match.id === selected.id);
    if (!nextMatch) return;
    setSelected(nextMatch);
    // A broadcast for any other match must not discard an edit this operator
    // has started but not yet saved.
    if (!scoreDirty) setScore([nextMatch.homeScore, nextMatch.awayScore]);
  }, [matches, selected?.id, scoreDirty]);

  const save = (status: MatchStatus) => {
    if (!selected) return;
    updateMatch(selected.id, {
      status,
      homeScore: score[0],
      awayScore: score[1],
      timerServerStartedAt: status === "LIVE" ? new Date().toISOString() : undefined,
    });
    setScoreDirty(false);
  };

  return <><PageTitle eyebrow="ADMIN CONSOLE" title="Match control"><span className="admin-pill">ADMIN MODE</span></PageTitle><div className="admin-grid"><section className="admin-panel"><label>SELECT MATCH</label><select value={selected?.id ?? ""} onChange={(event) => { const next = matches.find((m) => m.id === event.target.value); if (next) { setSelected(next); setScore([next.homeScore, next.awayScore]); setScoreDirty(false); } }}>{matches.filter((m) => m.status !== "FINISHED").slice(0, 20).map((m) => <option key={m.id} value={m.id}>{formatTime(m.scheduledStart)} · {findTeam(m.homeTeamId)?.name ?? "TBD"} vs {findTeam(m.awayTeamId)?.name ?? "TBD"}</option>)}</select>{selected && <><div className="control-score"><div><TeamBadge id={selected.homeTeamId} /><button onClick={() => { setScore(([home, away]) => [Math.max(0, home - 1), away]); setScoreDirty(true); }}>−</button><b>{score[0]}</b><button onClick={() => { setScore(([home, away]) => [home + 1, away]); setScoreDirty(true); }}>+</button></div><div><TeamBadge id={selected.awayTeamId} /><button onClick={() => { setScore(([home, away]) => [home, Math.max(0, away - 1)]); setScoreDirty(true); }}>−</button><b>{score[1]}</b><button onClick={() => { setScore(([home, away]) => [home, away + 1]); setScoreDirty(true); }}>+</button></div></div>  <div className="control-actions"><button type="button" className="primary-button" disabled={connection !== "live"} onClick={() => save("LIVE")}>▶ Start / resume</button><button type="button" className="outline-button" disabled={connection !== "live"} onClick={() => save("PAUSED")}>Ⅱ Pause</button><button type="button" className="danger-button" disabled={connection !== "live"} onClick={() => save("FINISHED")}>Finish match</button></div></>}</section><section className="admin-panel setup-panel"><label>SUPERADMIN SETUP</label><h3>Seed knockout teams</h3><p>Group fixtures run from 09:00 on 3 courts. Once the group stage is final, this fills the Round of 16 from the standings without moving any kick-off time.</p><ScheduleCheck matches={matches} /><button type="button" className="primary-button" disabled={connection !== "live"} onClick={generateSchedule}>✦ Seed knockout teams</button><ResetButton onReset={resetTournament} disabled={connection !== "live"} /></section></div></>; }
