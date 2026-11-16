import { Link } from "react-router-dom";
import { useI18n } from "../../../i18n/useI18n";
import type { Goal, Match } from "../../../types";
import { formatTime } from "../../../utils/format";
import { tracksScorers } from "../goals";
import { useMatchClock } from "../hooks/useMatchClock";
import { TBD } from "../schedule";
import { useTeams } from "../teamContext";
import { TeamBadge } from "./TeamBadge";

/** Details に出す選手（登録チームの選手）。 */
export interface FixturePlayer {
  name: string;
  backNumber: number;
}

function TeamSlot({ teamId }: { teamId: string }) {
  const { t } = useI18n();
  const team = useTeams().find((item) => item.id === teamId);
  return (
    <div className="fixture-team">
      <TeamBadge id={teamId} showName={false} />
      <span className="fixture-team-name">
        {teamId === TBD || !team ? t("match.tbd") : team.name}
      </span>
    </div>
  );
}

function PlayersColumn({
  teamId,
  players,
  goals,
}: {
  teamId: string;
  players: FixturePlayer[] | undefined;
  goals: Goal[];
}) {
  const { t } = useI18n();
  const team = useTeams().find((item) => item.id === teamId);
  const scored = (player: FixturePlayer) =>
    goals.filter(
      (goal) =>
        goal.teamId === teamId &&
        goal.backNumber === player.backNumber &&
        goal.playerName === player.name,
    ).length;
  return (
    <div className="fixture-players">
      <h3>
        <span>{team?.name ?? t("match.tbd")}</span>
        {players && players.length > 0 && (
          <small>{t("matches.players", { count: players.length })}</small>
        )}
      </h3>
      {players && players.length > 0 ? (
        <ol>
          {players.map((player) => {
            const count = scored(player);
            return (
              <li key={`${player.backNumber}-${player.name}`}>
                <span className="fixture-player-number">#{player.backNumber}</span>
                <span className="fixture-player-name">{player.name}</span>
                {count > 0 && (
                  <span className="fixture-player-goals" aria-label={t("matches.goals", { count })}>
                    ⚽{count > 1 ? ` ×${count}` : ""}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted">{t("matches.noPlayers")}</p>
      )}
    </div>
  );
}

/**
 * Matches の試合カード（Matchday XI と同じ形）。
 * ホーム ｜ 時間・コート / vs か点数 / ステージ・状態 ｜ アウェイ。「Details」で両チームの選手を開く。
 */
export function FixtureCard({
  match,
  open,
  onToggle,
  playersOf,
  goals,
}: {
  match: Match;
  open: boolean;
  onToggle: () => void;
  playersOf: (teamId: string) => FixturePlayer[] | undefined;
  /** この試合のゴール（準々決勝から）。 */
  goals: Goal[];
}) {
  const { t } = useI18n();
  const clock = useMatchClock(match);
  const started = match.status !== "SCHEDULED";
  const live = match.status === "LIVE";
  const panelId = `fixture-${match.id}`;
  const stage = match.groupId
    ? t("common.group", { id: match.groupId })
    : t(`stage.${match.stage}`);
  const state = live
    ? `${t("match.live")} ${clock}`
    : match.status === "PAUSED"
      ? `${t("match.paused")} ${clock}`
      : match.status === "FINISHED"
        ? t("match.finished")
        : "";
  return (
    <article className={`fixture-card${open ? " is-open" : ""}${live ? " is-live" : ""}`}>
      <div className="fixture-row" onClick={onToggle}>
        <div className="fixture-teams">
          <TeamSlot teamId={match.homeTeamId} />
          <div className="fixture-center">
            <span className="fixture-time">
              {formatTime(match.scheduledStart)} · {t("common.court", { court: match.court })}
            </span>
            <span className="fixture-score">
              {started ? `${match.homeScore} – ${match.awayScore}` : "vs"}
            </span>
            <span className="fixture-meta">{stage}</span>
            {state && (
              <span className={live ? "fixture-state live" : "fixture-state"}>{state}</span>
            )}
            {match.isPenaltyShootout && (
              <span className="fixture-pk">
                {t("match.penalties", {
                  home: match.penaltyHomeScore ?? 0,
                  away: match.penaltyAwayScore ?? 0,
                })}
              </span>
            )}
          </div>
          <TeamSlot teamId={match.awayTeamId} />
        </div>
        <div className="fixture-details-row">
          <button
            type="button"
            className="fixture-details"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
          >
            {t("matches.details")}
          </button>
        </div>
      </div>
      <div id={panelId} className="fixture-panel" hidden={!open}>
        {open && (
          <>
            <div className="fixture-players-grid">
              <PlayersColumn
                teamId={match.homeTeamId}
                players={playersOf(match.homeTeamId)}
                goals={tracksScorers(match) ? goals : []}
              />
              <PlayersColumn
                teamId={match.awayTeamId}
                players={playersOf(match.awayTeamId)}
                goals={tracksScorers(match) ? goals : []}
              />
            </div>
            <Link className="fixture-link" to={`/matches/${encodeURIComponent(match.id)}`}>
              {t("matches.openMatch")} →
            </Link>
          </>
        )}
      </div>
    </article>
  );
}
