import { useState } from "react";
import { NavLink, Route, Routes, useNavigate } from "react-router-dom";
import { AdminGate, AdminLoginModal, useAdminAuth } from "./features/admin";
import {
  ConnectionBanner,
  seedKnockoutTeams,
  teams,
  useTournamentState,
} from "./features/tournament";
import { AdminSetup } from "./pages/AdminSetup";
import { Bracket } from "./pages/Bracket";
import { Live } from "./pages/Live";
import { Matches } from "./pages/Matches";
import { Overview } from "./pages/Overview";
import { Standings } from "./pages/Standings";
import type { Match } from "./types";

const navItems = [
  { to: "/", label: "Overview", icon: "⌂" },
  { to: "/matches", label: "Matches", icon: "▦" },
  { to: "/live", label: "Live", icon: "◉" },
  { to: "/standings", label: "Standings", icon: "☷" },
  { to: "/bracket", label: "Bracket", icon: "⌘" },
];

function App() {
  const { matches, connection, error, patchMatch, replaceMatches, reset } = useTournamentState();
  const { isAdmin, login, logout } = useAdminAuth();
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const navigate = useNavigate();

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
      logout();
      setShowAdminLogin(false);
      navigate("/");
      return;
    }

    setShowAdminLogin(true);
  };

  const handleAdminLogin = (password: string) => {
    if (!login(password)) {
      return false;
    }

    setShowAdminLogin(false);
    navigate("/admin/setup");
    return true;
  };

  return (
    <div className="app-shell">
      <div className="app-header">
        <ConnectionBanner connection={connection} error={error} />
        <header className="topbar">
          <button className="brand" onClick={() => navigate("/")}>
            <span className="brand-mark">V</span>
            <span>
              ELOCITY <span>CUP 2026</span>
            </span>
          </button>
          <div className="event-meta">
            <span className="live-dot" /> LIVE EVENT <b>26 SEP 2026</b>
          </div>
          <button type="button" className="admin-toggle" onClick={handleAdminToggle}>
            {isAdmin ? "Exit admin" : "Admin login"} <span>↗</span>
          </button>
        </header>
      </div>
      <div className="layout">
        <aside className="sidebar">
          <div className="side-caption">TOURNAMENT HUB</div>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
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
                <small>40 teams · 95 matches</small>
              </div>
            </div>
            {isAdmin && (
              <NavLink to="/admin/setup" className="nav-item admin-link">
                ⚙ Setup
              </NavLink>
            )}
          </div>
        </aside>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Overview matches={matches} />} />
            <Route path="/matches" element={<Matches matches={matches} />} />
            <Route path="/live" element={<Live matches={matches} />} />
            <Route path="/standings" element={<Standings matches={matches} />} />
            <Route path="/bracket" element={<Bracket matches={matches} />} />
            <Route
              path="/admin/setup"
              element={
                isAdmin ? (
                  <AdminSetup
                    matches={matches}
                    updateMatch={updateMatch}
                    generateSchedule={generateSchedule}
                    resetTournament={resetTournament}
                    connection={connection}
                  />
                ) : (
                  <AdminGate onUnlock={handleAdminLogin} />
                )
              }
            />
            <Route path="*" element={<Overview matches={matches} />} />
          </Routes>
        </main>
      </div>
      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
      {showAdminLogin && (
        <AdminLoginModal onClose={() => setShowAdminLogin(false)} onUnlock={handleAdminLogin} />
      )}
    </div>
  );
}

export default App;
