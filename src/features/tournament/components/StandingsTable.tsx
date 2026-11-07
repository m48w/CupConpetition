import { useI18n } from "../../../i18n/useI18n";
import type { Match, Team } from "../../../types";
import { calculateStandings } from "../logic";
import { useGroupOrders } from "../teamContext";
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
  const { t } = useI18n();
  const groupOrders = useGroupOrders();
  const standings = calculateStandings(groupId, teams, matches, groupOrders);
  return (
    <section className="table-card standings-table">
      {title && (
        <div className="table-title">
          <h3>{title}</h3>
          <span>{t("common.teams", { count: standings.length })}</span>
        </div>
      )}
      <div className="standings-row standings-head">
        <span>#</span>
        <span>{t("standings.team")}</span>
        <span title={t("standings.playedHint")}>{t("standings.played")}</span>
        <span className="standings-wide">{t("standings.won")}</span>
        <span className="standings-wide">{t("standings.drawn")}</span>
        <span className="standings-wide">{t("standings.lost")}</span>
        <span title={t("standings.goalDiffHint")}>{t("standings.goalDiff")}</span>
        <span>{t("standings.points")}</span>
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
