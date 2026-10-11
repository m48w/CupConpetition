import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useSession } from "./features/auth";
import {
  ConnectionBanner,
  seedKnockoutTeams,
  TeamsProvider,
  useTournamentState,
} from "./features/tournament";
import { Bracket } from "./pages/Bracket";
import { AdminDashboard, AdminEntry, ProtectedAdminNotFound } from "./pages/AdminRoutes";
import { AdminRegistrations } from "./pages/AdminRegistrations";
import { Groups, GroupDetail } from "./pages/Groups";
import { Live } from "./pages/Live";
import { MatchDetail } from "./pages/MatchDetail";
import { Matches } from "./pages/Matches";
import { NotFound } from "./pages/NotFound";
import { Overview } from "./pages/Overview";
import { Standings } from "./pages/Standings";
import { SubAdmin } from "./pages/SubAdmin";
import { SuperAdmin } from "./pages/SuperAdmin";
import { TeamDetail, Teams } from "./pages/Teams";
import { EVENT_BASE_PATH } from "./config";
import { getTournamentId } from "./config";
import type { Match, SessionInfo } from "./types";

const navItems = [
  { to: "/", label: "Overview", icon: "⌂" },
  { to: "/teams", label: "Teams", icon: "♟" },
  { to: "/matches", label: "Matches", icon: "▦" },
  { to: "/groups", label: "Groups", icon: "◫" },
  { to: "/live", label: "Live", icon: "◉" },
  { to: "/standings", label: "Standings", icon: "☷" },
  { to: "/knockout", label: "Knockout", icon: "⌘" },
];

function AdminConsole({
  session,
  consoleProps,
  setup,
}: {
  session: SessionInfo;
  consoleProps: {
    signIn: (username: string, password: string) => Promise<SessionInfo>;
    onSignOut: () => Promise<boolean>;
    matches: Match[];
    teams: ReturnType<typeof useTournamentState>["teams"];
    updateMatch: (id: string, patch: Partial<Match>) => void;
    connection: ReturnType<typeof useTournamentState>["connection"];
  };
  setup: {
    tournamentId: string;
    generateSchedule: () => void;
    resetTournament: () => void;
    initializeTournament: () => void;
    createSchedule: () => void;
    addTeam: ReturnType<typeof useTournamentState>["addTeam"];
    updateTeam: ReturnType<typeof useTournamentState>["updateTeam"];
    deleteTeam: ReturnType<typeof useTournamentState>["deleteTeam"];
  };
}) {
  return session.role === "superadmin" ? (
    <SuperAdmin {...consoleProps} session={session} setup={setup} />
  ) : (
    <SubAdmin {...consoleProps} session={session} />
  );
}

function App() {
  const { session, loading, refresh, signIn, signOut } = useSession();
  const {
    matches,
    teams,
    connection,
    error,
    patchMatch,
    replaceMatches,
    reset,
    clearError,
    addTeam,
    updateTeam,
    deleteTeam,
    initializeTournament,
    generateSchedule,
  } = useTournamentState({
    onUnauthorized: refresh,
  });
  const navigate = useNavigate();

  const consoleProps = {
    signIn: async (username: string, password: string) => {
      const next = await signIn(username, password);
      clearError();
      return next;
    },
    onSignOut: async () => {
      const succeeded = await signOut();
      if (succeeded) navigate("/admin", { replace: true });
      return succeeded;
    },
    matches,
    teams,
    updateMatch: (id: string, patch: Partial<Match>) => void patchMatch(id, patch),
    connection,
  };
  const setup = {
    tournamentId: getTournamentId(),
    generateSchedule: () => void replaceMatches(seedKnockoutTeams(teams, matches)),
    resetTournament: () => void reset(),
    initializeTournament: () => void initializeTournament(),
    createSchedule: () => void generateSchedule(),
    addTeam,
    updateTeam,
    deleteTeam,
  };

  return (
    <div className="app-shell">
      <div className="app-header">
        <ConnectionBanner connection={connection} error={error} />
        <header className="topbar">
          <img
            className="header-logo"
            src={`${EVENT_BASE_PATH}/velocity-fc-logo.png`}
            alt="Velocity FC logo"
          />
          <button className="brand" onClick={() => navigate("/")}>
            VELOCITY CUP 2026
          </button>
          {import.meta.env.DEV && (
            <div className="admin-links">
              <NavLink to="/admin" className="admin-toggle">
                Admin <span>↗</span>
              </NavLink>
            </div>
          )}
        </header>
      </div>
      <div className="layout">
        <aside className="sidebar">
          <div className="side-caption">TOURNAMENT HUB</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <span>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          <div className="sidebar-bottom">
            <div className="mini-event">
              <div className="mini-ball">⚽</div>
              <div>
                <strong>Velocity Cup 2026</strong>
                <small>
                  {teams.length} teams · {matches.length} matches
                </small>
              </div>
            </div>
            {session && (
              <>
                <NavLink to="/admin/dashboard" className="nav-item admin-link">
                  ⚙ Console
                </NavLink>
                {session.role === "superadmin" && (
                  <NavLink to="/admin/registrations" className="nav-item admin-link">
                    Team registrations
                  </NavLink>
                )}
              </>
            )}
          </div>
        </aside>
        <TeamsProvider teams={teams}>
          <main className="main-content">
            <Routes>
              <Route path="/" element={<Overview />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:teamId" element={<TeamDetail matches={matches} />} />
              <Route path="/matches" element={<Matches matches={matches} />} />
              <Route path="/matches/:matchId" element={<MatchDetail matches={matches} />} />
              <Route path="/groups" element={<Groups matches={matches} />} />
              <Route path="/groups/:groupId" element={<GroupDetail matches={matches} />} />
              <Route path="/live" element={<Live matches={matches} />} />
              <Route path="/standings" element={<Standings matches={matches} />} />
              <Route path="/knockout" element={<Bracket matches={matches} />} />
              <Route path="/bracket" element={<Navigate to="/knockout" replace />} />
              <Route
                path="/admin"
                element={
                  <AdminEntry loading={loading} session={session} signIn={consoleProps.signIn} />
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminDashboard loading={loading} session={session}>
                    {(account) => (
                      <AdminConsole session={account} consoleProps={consoleProps} setup={setup} />
                    )}
                  </AdminDashboard>
                }
              />
              <Route
                path="/admin/matches"
                element={
                  <AdminDashboard loading={loading} session={session}>
                    {(account) => (
                      <AdminConsole session={account} consoleProps={consoleProps} setup={setup} />
                    )}
                  </AdminDashboard>
                }
              />
              <Route
                path="/admin/live"
                element={
                  <AdminDashboard loading={loading} session={session}>
                    {(account) => (
                      <AdminConsole session={account} consoleProps={consoleProps} setup={setup} />
                    )}
                  </AdminDashboard>
                }
              />
              <Route
                path="/admin/registrations"
                element={
                  <AdminDashboard loading={loading} session={session}>
                    {(account) => <AdminRegistrations session={account} />}
                  </AdminDashboard>
                }
              />
              <Route path="/admin/setup" element={<Navigate to="/admin/dashboard" replace />} />
              <Route
                path="/admin/*"
                element={<ProtectedAdminNotFound loading={loading} session={session} />}
              />
              <Route path="/superadmin" element={<Navigate to="/admin" replace />} />
              <Route path="/subadmin" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </TeamsProvider>
      </div>
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <footer>
        © 2026 VELOCITY CUP <span>•</span> Tournament operations platform
      </footer>
    </div>
  );
}

export default App;
