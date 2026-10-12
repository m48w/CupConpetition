import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../components/ui/PageTitle";
import { TeamBadge, useTeams } from "../features/tournament";
import { MatchCard } from "../features/tournament";
import { tournamentScopedUrl } from "../config";
import type { Match } from "../types";
import { requestJson } from "../utils/http";
import { NotFound } from "./NotFound";

interface RegisteredTeam {
  id: string;
  clubId: string;
  clubName: string;
  teamName: string;
  logoId: string | null;
  members: { name: string; backNumber: number }[];
}

export function Teams() {
  const teams = useTeams();
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([]);
  const [registrationError, setRegistrationError] = useState("");
  const [selectedTeam, setSelectedTeam] = useState<RegisteredTeam | null>(null);

  useEffect(() => {
    void requestJson<{ teams: RegisteredTeam[] }>("/api/registration/teams")
      .then(({ teams: registrations }) => setRegisteredTeams(registrations))
      .catch(() => setRegistrationError("Could not load registered teams."));
  }, []);

  useEffect(() => {
    if (!selectedTeam) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedTeam(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedTeam]);

  return (
    <>
      <PageTitle eyebrow="THE CLUBS" title="Participating teams">
        <span className="muted">
          {teams.length} competition · {registeredTeams.length} registered
        </span>
      </PageTitle>
      <section className="team-directory-section">
        <div className="section-heading">
          <h2>Registered teams</h2>
          <span className="muted">{registeredTeams.length} teams</span>
        </div>
        {registrationError ? (
          <p className="registration-error" role="alert">
            {registrationError}
          </p>
        ) : registeredTeams.length ? (
          <div className="team-directory">
            {registeredTeams.map((team) => (
              <button
                className="team-directory-card registered-team-card"
                key={team.id}
                type="button"
                aria-label={`View ${team.teamName} and registered members`}
                onClick={() => setSelectedTeam(team)}
              >
                {team.logoId ? (
                  <img
                    className="registered-team-logo"
                    src={tournamentScopedUrl(
                      `/api/registration/clubs/${encodeURIComponent(team.clubId)}/logo`,
                    )}
                    alt={`${team.clubName} logo`}
                  />
                ) : (
                  <span className="team-crest">FC</span>
                )}
                <strong>{team.teamName}</strong>
              </button>
            ))}
          </div>
        ) : (
          <p className="empty-state">No team registrations yet.</p>
        )}
      </section>
      {teams.length > 0 && (
        <section className="team-directory-section">
          <div className="section-heading">
            <h2>Competition teams</h2>
            <span className="muted">{teams.length} teams</span>
          </div>
          <div className="team-directory">
            {teams.map((team) => (
              <Link className="team-directory-card" key={team.id} to={`/teams/${team.id}`}>
                <TeamBadge id={team.id} showName={false} />
                <strong>{team.name}</strong>
                <span>Group {team.groupId}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
      {selectedTeam && (
        <div className="team-roster-overlay">
          <section
            className="team-roster-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="team-roster-title"
          >
            <header className="team-roster-header">
              <h2 id="team-roster-title">{selectedTeam.teamName}</h2>
              <div>
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setSelectedTeam(null)}
                >
                  Back
                </button>
                <button
                  className="team-roster-close"
                  type="button"
                  aria-label="Close team details"
                  onClick={() => setSelectedTeam(null)}
                >
                  ×
                </button>
              </div>
            </header>
            <div className="team-roster-content">
              {selectedTeam.logoId ? (
                <img
                  className="team-roster-logo"
                  src={tournamentScopedUrl(
                    `/api/registration/clubs/${encodeURIComponent(selectedTeam.clubId)}/logo`,
                  )}
                  alt={`${selectedTeam.teamName} logo`}
                />
              ) : (
                <span className="team-crest team-roster-logo">FC</span>
              )}
              <section className="team-roster-list">
                <h3>Registered members</h3>
                {selectedTeam.members.length ? (
                  <ol>
                    {selectedTeam.members.map((member) => (
                      <li key={`${member.backNumber}-${member.name}`}>
                        <span>#{member.backNumber}</span>
                        <strong>{member.name}</strong>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="muted">No members registered yet.</p>
                )}
              </section>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

export function TeamDetail({ matches }: { matches: Match[] }) {
  const { teamId } = useParams();
  const team = useTeams().find((item) => item.id === teamId);
  if (!team) return <NotFound />;

  const teamMatches = matches.filter(
    (match) => match.homeTeamId === team.id || match.awayTeamId === team.id,
  );
  return (
    <>
      <PageTitle eyebrow={`GROUP ${team.groupId}`} title={team.name}>
        <Link className="outline-button" to="/teams">
          All teams
        </Link>
      </PageTitle>
      <section className="team-profile">
        <TeamBadge id={team.id} showName={false} />
        <div>
          <h2>{team.name}</h2>
          <p>Group {team.groupId}</p>
        </div>
      </section>
      <section className="section-block">
        <div className="section-heading">
          <h2>Matches</h2>
        </div>
        <div className="list-grid">
          {teamMatches.map((match) => (
            <Link
              className="match-detail-link"
              key={match.id}
              to={`/matches/${encodeURIComponent(match.id)}`}
            >
              <MatchCard match={match} compact />
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
