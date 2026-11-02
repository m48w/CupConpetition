import { useI18n } from "../../../i18n/useI18n";
import type { Match, Team } from "../../../types";
import { formatTime } from "../../../utils/format";
import { calculateStandings, isOnPitch, nextMatchFor } from "../logic";
import { GROUP_IDS } from "../schedule";
import { MatchCard } from "./MatchCard";

/** グループごとにまとめたチームの選択肢（スマホでは端末のピッカーで選べる）。 */
function TeamSelect({
  teams,
  value,
  onChange,
}: {
  teams: Team[];
  value: string;
  onChange: (id: string | null) => void;
}) {
  const { t } = useI18n();
  return (
    <select
      className="my-team-select"
      aria-label={t("myTeam.pickerTitle")}
      value={value}
      onChange={(event) => onChange(event.target.value || null)}
    >
      <option value="">{t("myTeam.choose")}</option>
      {GROUP_IDS.map((groupId) => {
        const inGroup = teams.filter((team) => team.groupId === groupId);
        if (inGroup.length === 0) return null;
        return (
          <optgroup key={groupId} label={t("common.group", { id: groupId })}>
            {inGroup.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}

/** Home の「マイチーム」: 次の試合（試合中ならスコア）とグループの順位。 */
export function MyTeamCard({
  teams,
  matches,
  myTeam,
  onChoose,
}: {
  teams: Team[];
  matches: Match[];
  myTeam: Team | null;
  onChoose: (id: string | null) => void;
}) {
  const { t } = useI18n();
  if (teams.length === 0) return null;

  if (!myTeam) {
    return (
      <section className="overview-section my-team">
        <div className="eyebrow">{t("myTeam.eyebrow")}</div>
        <p className="muted">{t("myTeam.hint")}</p>
        <TeamSelect teams={teams} value="" onChange={onChoose} />
      </section>
    );
  }

  const next = nextMatchFor(myTeam.id, matches);
  const standings = calculateStandings(myTeam.groupId, teams, matches);
  const positionIndex = standings.findIndex((row) => row.team.id === myTeam.id);
  const row = standings[positionIndex];
  const opponentId = next && (next.homeTeamId === myTeam.id ? next.awayTeamId : next.homeTeamId);
  const opponent = teams.find((team) => team.id === opponentId);

  return (
    <section className="overview-section my-team">
      <div className="section-heading">
        <div>
          <div className="eyebrow">{t("myTeam.eyebrow")}</div>
          <h2>{myTeam.name}</h2>
          {row && (
            <p className="muted">
              {t("myTeam.position", {
                group: myTeam.groupId,
                position: positionIndex + 1,
                total: standings.length,
              })}{" "}
              · {t("myTeam.points", { points: row.points })}
            </p>
          )}
        </div>
        <TeamSelect teams={teams} value={myTeam.id} onChange={onChoose} />
      </div>
      {next ? (
        <div className="my-team-next">
          <strong>{isOnPitch(next) ? t("myTeam.now") : t("myTeam.next")}</strong>
          {!isOnPitch(next) && (
            <span>
              {t("myTeam.when", { time: formatTime(next.scheduledStart), court: next.court })}
              {opponent && ` · ${t("myTeam.vs", { team: opponent.name })}`}
            </span>
          )}
          <MatchCard match={next} compact />
        </div>
      ) : (
        <p className="muted">{t("myTeam.noNext")}</p>
      )}
    </section>
  );
}
