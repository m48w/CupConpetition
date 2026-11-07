import { useI18n } from "../../../i18n/useI18n";
import type { Goal, Match } from "../../../types";
import { formatTime } from "../../../utils/format";
import { goalsOf, tracksScorers } from "../goals";
import { useMatchClock } from "../hooks/useMatchClock";
import { useGoals } from "../teamContext";
import { TeamBadge } from "./TeamBadge";

export function MatchCard({
  match,
  compact = false,
  showScorers = false,
}: {
  match: Match;
  compact?: boolean;
  /** 準々決勝からの得点者を出す（試合の詳細・Live）。 */
  showScorers?: boolean;
}) {
  const { t } = useI18n();
  const allGoals = useGoals();
  const goals = showScorers && tracksScorers(match) ? goalsOf(allGoals, match.id) : [];
  const goalLabel = (goal: Goal) =>
    goal.playerName
      ? t("match.goal", {
          minute: goal.minute,
          number: goal.backNumber ?? "",
          name: goal.playerName,
        })
      : t("match.goalUnknown", { minute: goal.minute });
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
      {goals.length > 0 && (
        <div className="match-scorers" aria-label={t("match.scorers")}>
          {[match.homeTeamId, match.awayTeamId].map((teamId, index) => (
            <ul key={index}>
              {goals
                .filter((goal) => goal.teamId === teamId)
                .map((goal) => (
                  <li key={goal.id}>
                    <span aria-hidden="true">⚽</span> {goalLabel(goal)}
                  </li>
                ))}
            </ul>
          ))}
        </div>
      )}
      {match.isPenaltyShootout && (
        <p className="match-penalties">
          {t("match.penalties", {
            home: match.penaltyHomeScore ?? 0,
            away: match.penaltyAwayScore ?? 0,
          })}
        </p>
      )}
      <div className="match-card-foot">
        <span>{t("match.footer", { id: match.id, court: match.court })}</span>
        {onPitch && <span className={live ? "timer" : "timer paused"}>{clock}</span>}
      </div>
    </div>
  );
}
