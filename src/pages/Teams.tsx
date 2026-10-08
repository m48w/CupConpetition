import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../components/ui/PageTitle";
import { TeamBadge, useTeams } from "../features/tournament";
import { MatchCard } from "../features/tournament";
import type { Match } from "../types";
import { NotFound } from "./NotFound";

export function Teams() {
  const teams = useTeams();
  return (
    <>
      <PageTitle eyebrow="THE CLUBS" title="Participating teams">
        <span className="muted">{teams.length} teams</span>
      </PageTitle>
      <div className="team-directory">
        {teams.map((team) => (
          <Link className="team-directory-card" key={team.id} to={`/teams/${team.id}`}>
            <TeamBadge id={team.id} showName={false} />
            <strong>{team.name}</strong>
            <span>Group {team.groupId}</span>
          </Link>
        ))}
      </div>
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
