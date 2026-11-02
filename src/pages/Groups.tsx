import { Link, useParams } from "react-router-dom";
import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { MatchCard, useTeams } from "../features/tournament";
import { StandingsTable } from "../features/tournament/components/StandingsTable";
import { GROUP_IDS } from "../features/tournament/schedule";
import type { Match } from "../types";
import { NotFound } from "./NotFound";

/** 全グループの順位表（以前の Standings ページもここにまとめた）。 */
export function Groups({ matches }: { matches: Match[] }) {
  const teams = useTeams();
  return (
    <>
      <PageTitle eyebrow="GROUP STAGE" title="Groups">
        <span className="muted">Top teams go to the knockout stage</span>
      </PageTitle>
      {teams.length === 0 ? (
        <Empty text="Groups will be announced after registration closes." />
      ) : (
        <div className="standings-grid">
          {GROUP_IDS.map((groupId) => (
            <Link className="standings-link" key={groupId} to={`/groups/${groupId}`}>
              <StandingsTable
                groupId={groupId}
                teams={teams}
                matches={matches}
                title={`Group ${groupId}`}
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function GroupDetail({ matches }: { matches: Match[] }) {
  const { groupId } = useParams();
  const teams = useTeams();
  const selectedGroupId = GROUP_IDS.find((id) => id === groupId);
  if (!selectedGroupId) return <NotFound />;
  const fixtures = matches.filter((match) => match.groupId === selectedGroupId);
  return (
    <>
      <PageTitle eyebrow="GROUP STAGE" title={`Group ${selectedGroupId}`}>
        <Link className="outline-button" to="/groups">
          All groups
        </Link>
      </PageTitle>
      {teams.length === 0 ? (
        <Empty text="Groups will be announced after registration closes." />
      ) : (
        <StandingsTable groupId={selectedGroupId} teams={teams} matches={matches} />
      )}
      <section className="section-block">
        <div className="section-heading">
          <h2>Group {selectedGroupId} matches</h2>
        </div>
        {fixtures.length === 0 ? (
          <Empty text="The match schedule will be published soon." />
        ) : (
          <div className="list-grid">
            {fixtures.map((match) => (
              <MatchCard match={match} key={match.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
