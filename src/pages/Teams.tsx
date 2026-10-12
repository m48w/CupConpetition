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
}

export function Teams() {
  const teams = useTeams();
  const [registeredTeams, setRegisteredTeams] = useState<RegisteredTeam[]>([]);
  const [registrationError, setRegistrationError] = useState("");

  useEffect(() => {
    void requestJson<{ teams: RegisteredTeam[] }>("/api/registration/teams")
      .then(({ teams: registrations }) => setRegisteredTeams(registrations))
      .catch(() => setRegistrationError("Could not load registered teams."));
  }, []);

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
              <article className="team-directory-card" key={team.id}>
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
                <span>{team.clubName} · Registration received</span>
              </article>
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
