import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { isOnPitch, MatchCard, TeamBadge } from "../features/tournament";
import { useI18n } from "../i18n/useI18n";
import type { Match } from "../types";
import { formatTime } from "../utils/format";

export function Live({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const live = matches.filter(isOnPitch);
  const nextByCourt = [
    ...matches
      .filter((match) => match.status === "SCHEDULED")
      .sort((a, b) => Date.parse(a.scheduledStart) - Date.parse(b.scheduledStart))
      .reduce(
        (map, match) => (map.has(match.court) ? map : map.set(match.court, match)),
        new Map<number, Match>(),
      )
      .values(),
  ];
  return (
    <>
      <PageTitle eyebrow={t("live.eyebrow")} title={t("live.title")}>
        <span className="refresh-label">
          <i className="live-dot" /> {t("live.realtime")}
        </span>
      </PageTitle>
      <div className="live-layout">
        <section>
          <div className="section-heading">
            <h2>{t("live.onPitch")}</h2>
            <span className="muted">{t("live.active", { count: live.length })}</span>
          </div>
          {live.map((match) => (
            <MatchCard match={match} key={match.id} showScorers />
          ))}
          {!live.length && <Empty text={t("live.empty")} />}
        </section>
        <aside className="next-panel">
          <div className="eyebrow">{t("live.next.eyebrow")}</div>
          <h3>{t("live.next.title")}</h3>
          {!nextByCourt.length && <p className="muted">{t("live.next.empty")}</p>}
          {nextByCourt.map((match) => (
            <div className="next-row" key={match.id}>
              <strong>{t("common.court", { court: match.court })}</strong>
              <div>
                <TeamBadge id={match.homeTeamId} />
                <TeamBadge id={match.awayTeamId} />
              </div>
              <small>
                {formatTime(match.scheduledStart)} ·{" "}
                {match.groupId
                  ? t("common.group", { id: match.groupId })
                  : t(`stage.${match.stage}`)}
              </small>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
