import { useI18n } from "../../../i18n/useI18n";
import type { Match } from "../../../types";
import { formatTime } from "../../../utils/format";
import { useMatchClock } from "../hooks/useMatchClock";
import { TeamBadge } from "./TeamBadge";

export function MatchCard({ match, compact = false }: { match: Match; compact?: boolean }) {
  const { t } = useI18n();
  const clock = useMatchClock(match);
  const live = match.status === "LIVE";
  const onPitch = live || match.status === "PAUSED";
  return (
    <div className={`match-card ${live ? "match-live" : ""} ${compact ? "compact" : ""}`}>
      <div className="match-card-top">
        <span>
          {t(`stage.${match.stage}`)}{" "}
          {match.groupId && `· ${t("common.group", { id: match.groupId })}`}
        </span>
        <span className={live ? "status live" : `status ${match.status.toLowerCase()}`}>
          {live
            ? t("match.live")
            : match.status === "PAUSED"
              ? t("match.paused")
              : match.status === "FINISHED"
                ? t("match.finished")
                : formatTime(match.scheduledStart)}
        </span>
      </div>
      <div className="match-teams">
        <div>
          <TeamBadge id={match.homeTeamId} />
          <strong>{match.status === "SCHEDULED" ? "–" : match.homeScore}</strong>
        </div>
        <div>
          <TeamBadge id={match.awayTeamId} />
          <strong>{match.status === "SCHEDULED" ? "–" : match.awayScore}</strong>
        </div>
      </div>
      <div className="match-card-foot">
        <span>{t("match.footer", { id: match.id, court: match.court })}</span>
        {onPitch && <span className={live ? "timer" : "timer paused"}>{clock}</span>}
      </div>
    </div>
  );
}
