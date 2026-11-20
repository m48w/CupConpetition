import { useI18n } from "../../../i18n/useI18n";
import type { Match } from "../../../types";
import { topScorers } from "../goals";
import { useGoals } from "../teamContext";
import { BackNumber } from "./BackNumber";
import { TeamBadge } from "./TeamBadge";

/** 得点ランキング（QF・SF・決勝のゴール。Groups ページの「Top Scorers」タブで出す）。 */
export function TopScorers({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const rows = topScorers(useGoals(), matches);
  return (
    <section className="section-block top-scorers">
      <h2 className="sr-only">{t("scorers.title")}</h2>
      <p className="muted">{t("scorers.note")}</p>
      {rows.length === 0 ? (
        <p className="empty-state">{t("scorers.empty")}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>{t("scorers.player")}</th>
              <th>{t("scorers.team")}</th>
              <th>{t("scorers.goals")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={`${row.teamId}:${row.memberId}`}>
                <td>{row.rank}</td>
                <td>
                  <BackNumber value={row.backNumber} /> <strong>{row.playerName}</strong>
                </td>
                <td>
                  <TeamBadge id={row.teamId} />
                </td>
                <td>
                  <b>{row.goals}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
