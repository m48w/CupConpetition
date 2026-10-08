import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../components/ui/PageTitle";
import { calculateStandings, MatchCard, TeamBadge, useTeams } from "../features/tournament";
import { GROUP_IDS } from "../features/tournament/schedule";
import type { Match } from "../types";
import { NotFound } from "./NotFound";

export function Groups({ matches }: { matches: Match[] }) {
  const teams = useTeams();
  return (
    <>
      <PageTitle eyebrow="GROUP STAGE" title="Groups" />
      <div className="group-directory">
        {GROUP_IDS.map((groupId) => (
          <Link className="group-directory-card" key={groupId} to={`/groups/${groupId}`}>
            <h2>Group {groupId}</h2>
            {teams
              .filter((team) => team.groupId === groupId)
              .map((team) => (
                <TeamBadge id={team.id} key={team.id} />
              ))}
          </Link>
        ))}
      </div>
      <section className="section-block">
        <div className="section-heading">
          <h2>Group fixtures</h2>
        </div>
        <div className="list-grid">
          {matches
            .filter((match) => match.stage === "GROUP")
            .map((match) => (
              <MatchCard match={match} key={match.id} />
            ))}
        </div>
      </section>
    </>
  );
}

export function GroupDetail({ matches }: { matches: Match[] }) {
  const { groupId } = useParams();
  const teams = useTeams();
  const selectedGroupId = GROUP_IDS.find((id) => id === groupId);
  if (!selectedGroupId) return <NotFound />;
  const standings = calculateStandings(selectedGroupId, teams, matches);
  const fixtures = matches.filter((match) => match.groupId === selectedGroupId);
  return (
    <>
      <PageTitle eyebrow="GROUP STAGE" title={`Group ${selectedGroupId}`}>
        <Link className="outline-button" to="/groups">
          All groups
        </Link>
      </PageTitle>
      <section className="table-card group-detail-table">
        <div className="table-head">
          <span>TEAM</span>
          <span>P</span>
          <span>GD</span>
          <span>PTS</span>
        </div>
        {standings.map((row, index) => (
          <div className="table-row" key={row.team.id}>
            <b className={index === 0 ? "rank qualified" : "rank"}>{index + 1}</b>
            <TeamBadge id={row.team.id} />
            <span>{row.played}</span>
            <span>{row.goalsFor - row.goalsAgainst}</span>
            <strong>{row.points}</strong>
          </div>
        ))}
      </section>
      <section className="section-block">
        <div className="section-heading">
          <h2>Group {selectedGroupId} matches</h2>
        </div>
        <div className="list-grid">
          {fixtures.map((match) => (
            <MatchCard match={match} key={match.id} />
          ))}
        </div>
      </section>
    </>
  );
}
