import type { Match, Team } from "../../../types";
import { calculateStandings } from "../logic";
import { TeamBadge } from "./TeamBadge";

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));

/**
 * 1グループの順位表。列名は略さない（サッカーに詳しくない人にもわかるように）。
 * スマホでは Won・Drawn・Lost を隠し、Played・Goal diff.・Points だけ表示する（CSS）。
 */
export function StandingsTable({
  groupId,
  teams,
  matches,
  title,
}: {
  groupId: string;
  teams: Team[];
  matches: Match[];
  title?: string;
}) {
  const standings = calculateStandings(groupId, teams, matches);
  return (
    <section className="table-card standings-table">
      {title && (
        <div className="table-title">
          <h3>{title}</h3>
          <span>{standings.length} teams</span>
        </div>
      )}
      <div className="standings-row standings-head">
        <span>#</span>
        <span>Team</span>
        <span title="Matches played">Played</span>
        <span className="standings-wide">Won</span>
        <span className="standings-wide">Drawn</span>
        <span className="standings-wide">Lost</span>
        <span title="Goals scored minus goals conceded">Goal diff.</span>
        <span>Points</span>
      </div>
      {standings.map((row, index) => (
        <div className="standings-row" key={row.team.id}>
          <b className={index === 0 ? "rank qualified" : "rank"}>{index + 1}</b>
          <TeamBadge id={row.team.id} />
          <span>{row.played}</span>
          <span className="standings-wide">{row.won}</span>
          <span className="standings-wide">{row.drawn}</span>
          <span className="standings-wide">{row.lost}</span>
          <span>{signed(row.goalsFor - row.goalsAgainst)}</span>
          <strong>{row.points}</strong>
        </div>
      ))}
    </section>
  );
}
