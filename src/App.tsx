import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { findTeam, formatTime, teams } from "./data";
import { calculateStandings, seedKnockoutTeams, stageLabel } from "./logic";
import { useTournamentState, type ConnectionState } from "./api/useTournamentState";
import { findCourtConflicts, R16_SEEDS, TBD } from "./schedule";
import type { Match, MatchStatus } from "./types";

const navItems = [
  { to: "/", label: "Overview", icon: "⌂" },
  { to: "/matches", label: "Matches", icon: "▦" },
  { to: "/live", label: "Live", icon: "◉" },
  { to: "/standings", label: "Standings", icon: "☷" },
  { to: "/bracket", label: "Bracket", icon: "⌘" },
];

const ADMIN_PASSWORD = "VELOCITY-DEMO-ONLY";
const ADMIN_STORAGE_KEY = "cupflow-admin-authed";

function App() {
  const { matches, connection, error, patchMatch, replaceMatches, reset } = useTournamentState();
  const [isAdmin, setIsAdmin] = useState<boolean>(() => localStorage.getItem(ADMIN_STORAGE_KEY) === "true");
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem(ADMIN_STORAGE_KEY, String(isAdmin));
  }, [isAdmin]);

  const updateMatch = (id: string, patch: Partial<Match>) => {
    void patchMatch(id, patch);
  };

  const generateSchedule = () => {
    void replaceMatches(seedKnockoutTeams(teams, matches));
  };

  const resetTournament = () => {
    void reset();
  };

  const handleAdminToggle = () => {
    if (isAdmin) {
      setIsAdmin(false);
      setShowAdminLogin(false);
      navigate("/");
      return;
    }

    setShowAdminLogin(true);
  };

  const handleAdminLogin = (password: string) => {
    if (password !== ADMIN_PASSWORD) {
      return false;
    }

    setIsAdmin(true);
    setShowAdminLogin(false);
    navigate("/admin/setup");
    return true;
  };

  return (
    <div className="app-shell">
      <div className="app-header">
        <ConnectionBanner connection={connection} error={error} />
        <header className="topbar">
          <button className="brand" onClick={() => navigate("/")}><span className="brand-mark">V</span><span>ELOCITY <span>CUP 2026</span></span></button>
          <div className="event-meta"><span className="live-dot" /> LIVE EVENT <b>26 SEP 2026</b></div>
          <button type="button" className="admin-toggle" onClick={handleAdminToggle}>{isAdmin ? "Exit admin" : "Admin login"} <span>↗</span></button>
        </header>
      </div>
      <div className="layout">
        <aside className="sidebar"><div className="side-caption">TOURNAMENT HUB</div>{navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "nav-item active" : "nav-item"}><span>{item.icon}</span>{item.label}</NavLink>)}<div className="sidebar-bottom"><div className="mini-event"><div className="mini-ball">⚽</div><div><strong>Velocity Cup 2026</strong><small>40 teams · 95 matches</small></div></div>{isAdmin && <NavLink to="/admin/setup" className="nav-item admin-link">⚙ Setup</NavLink>}</div></aside>
        <main className="main-content"><Routes><Route path="/" element={<Overview matches={matches} />} /><Route path="/matches" element={<Matches matches={matches} />} /><Route path="/live" element={<Live matches={matches} />} /><Route path="/standings" element={<Standings matches={matches} />} /><Route path="/bracket" element={<Bracket matches={matches} />} /><Route path="/admin/setup" element={isAdmin ? <Admin matches={matches} updateMatch={updateMatch} generateSchedule={generateSchedule} resetTournament={resetTournament} connection={connection} /> : <AdminGate onUnlock={handleAdminLogin} />} /><Route path="*" element={<Overview matches={matches} />} /></Routes></main>
      </div>
      <nav className="bottom-nav">{navItems.map((item) => <NavLink key={item.to} to={item.to} className={({ isActive }) => isActive ? "active" : ""}><span>{item.icon}</span>{item.label}</NavLink>)}</nav>
      <footer>© 2026 VELOCITY CUP <span>•</span> Tournament operations platform</footer>
      {showAdminLogin && <AdminLoginModal onClose={() => setShowAdminLogin(false)} onUnlock={handleAdminLogin} />}
    </div>
  );
}

function ConnectionBanner({ connection, error }: { connection: ConnectionState; error: string | null }) {
  if (connection === "live" && !error) return null;

  const tone = error ? "error" : connection;
  const message =
    error ?? (connection === "connecting" ? "Connecting to the match server…" : "Disconnected — showing last known data");

  return <div className={`connection-banner ${tone}`}>{message}</div>;
}

function AdminLoginModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: (password: string) => boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onUnlock(password)) {
      setError("Invalid password. Please try again.");
      return;
    }
  };

  return (
    <div className="admin-login-overlay" onClick={onClose}>
      <div className="admin-login-card" onClick={(event) => event.stopPropagation()}>
        <div className="login-header">
          <div>
            <div className="eyebrow">SUPER ADMIN ACCESS</div>
            <h2>Control room login</h2>
          </div>
          <button className="close-button" type="button" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={submit}>
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Enter admin password" autoFocus />
          <div className="login-hint">Demo access key: VELOCITY-DEMO-ONLY</div>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button login-submit" type="submit">Unlock admin panel</button>
        </form>
      </div>
    </div>
  );
}

function AdminGate({ onUnlock }: { onUnlock: (password: string) => boolean }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!onUnlock(password)) {
      setError("Incorrect password.");
      return;
    }
  };

  return (
    <div className="admin-gate">
      <div className="admin-gate-card">
        <div className="eyebrow">RESTRICTED AREA</div>
        <h1>Super Admin required</h1>
        <p>Enter the tournament control password to manage fixtures and live scores.</p>
        <form onSubmit={submit}>
          <input type="password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} placeholder="Password" />
          <div className="login-hint">Demo access key: VELOCITY-DEMO-ONLY</div>
          {error && <div className="login-error">{error}</div>}
          <button className="primary-button" type="submit">Access console</button>
        </form>
      </div>
    </div>
  );
}

function PageTitle({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return <div className="page-title"><div><div className="eyebrow">{eyebrow}</div><h1>{title}</h1></div>{children}</div>;
}

function TeamBadge({ id }: { id: string }) { const team = findTeam(id); return <span className="team-badge"><i style={{ background: team?.color }} />{team?.name ?? "TBD"}</span>; }
function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
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

function Overview({ matches }: { matches: Match[] }) {
  const live = matches.filter((m) => m.status === "LIVE"); const next = matches.filter((m) => m.status === "SCHEDULED").slice(0, 3);
  return <><PageTitle eyebrow="SATURDAY · 26 SEPTEMBER 2026" title="Tournament overview"><button className="outline-button">↗ Share event</button></PageTitle><section className="hero-grid"><div className="hero-card"><div className="hero-kicker">AUTUMN CUP 2026</div><h2>One day.<br /><em>One champion.</em></h2><p>Follow every score, table and knockout moment in real time.</p><div className="hero-stats"><div><b>40</b><span>Teams</span></div><div><b>95</b><span>Matches</span></div><div><b>8</b><span>Groups</span></div></div></div><div className="today-card"><div className="section-heading"><h3>Live now</h3><NavLink to="/live">View live ↗</NavLink></div>{live.length ? live.map((match) => <MatchCard match={match} key={match.id} />) : <Empty text="No matches are live right now" />}</div></section><section className="section-block"><div className="section-heading"><div><div className="eyebrow">UP NEXT</div><h2>Today’s schedule</h2></div><NavLink to="/matches">View all matches ↗</NavLink></div><div className="match-grid">{next.map((match) => <MatchCard match={match} key={match.id} />)}</div></section></>;
}

function Matches({ matches }: { matches: Match[] }) {
  const [stage, setStage] = useState("ALL");
  const [teamId, setTeamId] = useState("ALL");
  const [groupId, setGroupId] = useState("ALL");
  const [court, setCourt] = useState("ALL");
  const filtered = matches.filter((match) =>
    (stage === "ALL" || match.stage === stage) &&
    (teamId === "ALL" || match.homeTeamId === teamId || match.awayTeamId === teamId) &&
    (groupId === "ALL" || match.groupId === groupId) &&
    (court === "ALL" || String(match.court) === court),
  );
  return <><PageTitle eyebrow="FULL TOURNAMENT SCHEDULE" title="All matches"><span className="bracket-note">All group fixtures · {filtered.length} shown</span></PageTitle><div className="filter-bar"><select value={stage} onChange={(event) => setStage(event.target.value)}><option value="ALL">Round · All</option>{(["GROUP", "R16", "QF", "SF", "FINAL"] as const).map((option) => <option value={option} key={option}>{stageLabel[option]}</option>)}</select><select value={teamId} onChange={(event) => setTeamId(event.target.value)}><option value="ALL">Team · All</option>{teams.map((team) => <option value={team.id} key={team.id}>{team.name}</option>)}</select><select value={groupId} onChange={(event) => setGroupId(event.target.value)}><option value="ALL">Group · All</option>{["A", "B", "C", "D", "E", "F", "G", "H"].map((value) => <option value={value} key={value}>Group {value}</option>)}</select><select value={court} onChange={(event) => setCourt(event.target.value)}><option value="ALL">Court · All</option>{[1, 2, 3].map((value) => <option value={value} key={value}>Court {value}</option>)}</select><button className="outline-button" type="button" onClick={() => { setStage("ALL"); setTeamId("ALL"); setGroupId("ALL"); setCourt("ALL"); }}>Reset</button></div><div className="list-grid">{filtered.map((match) => <MatchCard match={match} key={match.id} />)}</div><p className="muted centered">Showing {filtered.length} of {matches.length} matches</p></>; }

function Live({ matches }: { matches: Match[] }) { const live = matches.filter((match) => match.status === "LIVE"); const nextByCourt = [...new Map(matches.filter((match) => match.status === "SCHEDULED").sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart)).map((match) => [match.court, match])).values()]; return <><PageTitle eyebrow="REAL-TIME CENTRE" title="Live matches"><span className="refresh-label"><i className="live-dot" /> Updates every 30 seconds</span></PageTitle><div className="live-layout"><section><div className="section-heading"><h2>On the pitch</h2><span className="muted">{live.length} active</span></div>{live.map((match) => <MatchCard match={match} key={match.id} />)}{!live.length && <Empty text="No matches are live right now" />}</section><aside className="next-panel"><div className="eyebrow">NEXT MATCHES · ONE PER COURT</div><h3>Coming up</h3>{nextByCourt.map((match) => <div className="next-row" key={match.id}><strong>Court {match.court}</strong><div><TeamBadge id={match.homeTeamId} /><TeamBadge id={match.awayTeamId} /></div><small>{formatTime(match.scheduledStart)} · {match.groupId ? `Group ${match.groupId}` : stageLabel[match.stage]}</small></div>)}</aside></div></>; }

function Standings({ matches }: { matches: Match[] }) { return <><PageTitle eyebrow="GROUP STAGE" title="Standings"><span className="muted">Last updated just now</span></PageTitle><div className="standings-grid">{["A", "B", "C", "D", "E", "F", "G", "H"].map((group) => <section className="table-card" key={group}><div className="table-title"><h3>Group {group}</h3><span>5 teams</span></div><div className="table-head"><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div>{calculateStandings(group, teams, matches).map((row, index) => <div className="table-row" key={row.team.id}><b className={index === 0 ? "rank qualified" : "rank"}>{index + 1}</b><TeamBadge id={row.team.id} /><span>{row.played}</span><span>{row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}{row.goalsFor - row.goalsAgainst}</span><strong>{row.points}</strong></div>)}</section>)}</div></>; }

function Bracket({ matches }: { matches: Match[] }) { const r16 = matches.filter((match) => match.stage === "R16"); const rounds = [{ title: "Round of 16", games: r16.length ? r16.map((match, index) => [match.homeTeamId === TBD ? R16_SEEDS[index][0] : findTeam(match.homeTeamId)?.name ?? TBD, match.awayTeamId === TBD ? R16_SEEDS[index][1] : findTeam(match.awayTeamId)?.name ?? TBD]) : R16_SEEDS.map((seed) => [...seed]) }, { title: "Quarter-finals", games: [["Winner M1", "Winner M2"], ["Winner M3", "Winner M4"], ["Winner M5", "Winner M6"], ["Winner M7", "Winner M8"]] }, { title: "Semi-finals", games: [["Winner QF1", "Winner QF2"], ["Winner QF3", "Winner QF4"]] }, { title: "Final", games: [["Winner SF1", "Winner SF2"]] }]; return <><PageTitle eyebrow="WORLD CUP KNOCKOUT" title="Velocity Cup 2026"><span className="bracket-note">15 matches · One champion</span></PageTitle><div className="tournament-banner"><span>VELOCITY CUP 2026</span><b>ROAD TO THE FINAL</b><small>Every match. Every moment. One champion.</small></div><div className="bracket world-cup-bracket">{rounds.map((round) => <section className="bracket-round" key={round.title}><h3>{round.title}</h3>{round.games.map((game, index) => <div className="bracket-game" key={index}><small>{round.title} · {index + 1}</small><span>{game[0]}</span><span>{game[1]}</span></div>)}</section>)}</div></>; }

function Admin({ matches, updateMatch, generateSchedule, resetTournament, connection }: { matches: Match[]; updateMatch: (id: string, patch: Partial<Match>) => void; generateSchedule: () => void; resetTournament: () => void; connection: ConnectionState }) {
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
function ScheduleCheck({ matches }: { matches: Match[] }) {
  const conflicts = findCourtConflicts(matches);
  const finish = matches.length
    ? formatTime(new Date(Math.max(...matches.map((match) => Date.parse(match.scheduledStart) + match.durationMinutes * 60_000))).toISOString())
    : "—";

  if (!conflicts.length) {
    return <div className="warning-box ok">ⓘ Schedule check: {matches.length} matches, no court clashes, finishing {finish}.</div>;
  }

  return <div className="warning-box">⚠ Schedule check: {conflicts.length} court clash{conflicts.length > 1 ? "es" : ""} — {conflicts.slice(0, 3).map(([a, b]) => `${a.id}×${b.id}`).join(", ")}{conflicts.length > 3 ? "…" : ""}</div>;
}

function ResetButton({ onReset, disabled }: { onReset: () => void; disabled: boolean }) {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return <button type="button" className="outline-button reset-button" disabled={disabled} onClick={() => setArmed(true)}>↺ Reset all matches</button>;
  }

  return (
    <div className="reset-confirm">
      <span>Reset all 95 matches to unplayed? Scores and timers will be cleared.</span>
      <button type="button" className="danger-button" disabled={disabled} onClick={() => { onReset(); setArmed(false); }}>Yes, reset</button>
      <button type="button" className="outline-button" onClick={() => setArmed(false)}>Cancel</button>
    </div>
  );
}

function Empty({ text }: { text: string }) { return <div className="empty-state"><span>◌</span>{text}</div>; }
export default App;
