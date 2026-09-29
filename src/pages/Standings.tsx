import { PageTitle } from "../components/ui/PageTitle";
import {
  calculateStandings,
  TeamBadge,
  teams as initialTeams,
  useTeams,
} from "../features/tournament";
import type { Match } from "../types";

export function Standings({ matches }: { matches: Match[] }) {
  const teams = useTeams();
  const standingsTeams = teams.length ? teams : initialTeams;
  return (
    <>
      <PageTitle eyebrow="GROUP STAGE" title="Standings">
        <span className="muted">Last updated just now</span>
      </PageTitle>
      <div className="standings-grid">
        {["A", "B", "C", "D", "E", "F", "G", "H"].map((group) => (
          <section className="table-card" key={group}>
            <div className="table-title">
              <h3>Group {group}</h3>
              <span>5 teams</span>
            </div>
            <div className="table-head">
              <span>TEAM</span>
              <span>P</span>
              <span>GD</span>
              <span>PTS</span>
            </div>
            {calculateStandings(group, standingsTeams, matches).map((row, index) => (
              <div className="table-row" key={row.team.id}>
                <b className={index === 0 ? "rank qualified" : "rank"}>{index + 1}</b>
                <TeamBadge id={row.team.id} />
                <span>{row.played}</span>
                <span>
                  {row.goalsFor - row.goalsAgainst > 0 ? "+" : ""}
                  {row.goalsFor - row.goalsAgainst}
                </span>
                <strong>{row.points}</strong>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
