import { useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../../../i18n/useI18n";
import type { Goal, Match } from "../../../types";
import { formatTime } from "../../../utils/format";
import { goalsOf, tracksScorers } from "../goals";
import { useFixturePlayers, type FixturePlayer } from "../hooks/useFixturePlayers";
import { useMatchClock } from "../hooks/useMatchClock";
import { TBD } from "../schedule";
import { useGoals, useTeams } from "../teamContext";
import { TeamBadge } from "./TeamBadge";

function TeamSlot({ teamId, side }: { teamId: string; side: "home" | "away" }) {
  const { t } = useI18n();
  const team = useTeams().find((item) => item.id === teamId);
  return (
    <div className={`fixture-team ${side}`}>
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

/** 真ん中: 始まる前は「時間・コート」、試合中は「点数・LIVE とタイマー」、終了後は「点数・Finished」。 */
function FixtureCenter({ match }: { match: Match }) {
  const { t } = useI18n();
  const clock = useMatchClock(match);
  if (match.status === "SCHEDULED") {
    return (
      <div className="fixture-center">
        <span className="fixture-time">{formatTime(match.scheduledStart)}</span>
        <span className="fixture-meta">{t("common.court", { court: match.court })}</span>
      </div>
    );
  }
  const live = match.status === "LIVE";
  return (
    <div className="fixture-center">
      <span className="fixture-score">
        {match.homeScore} – {match.awayScore}
      </span>
      <span className={live ? "fixture-state live" : "fixture-state"}>
        {live
          ? `${t("match.live")} ${clock}`
          : match.status === "PAUSED"
            ? `${t("match.paused")} ${clock}`
            : t("match.finished")}
      </span>
      {match.isPenaltyShootout && (
        <span className="fixture-pk">
          {t("match.penalties", {
            home: match.penaltyHomeScore ?? 0,
            away: match.penaltyAwayScore ?? 0,
          })}
        </span>
      )}
    </div>
  );
}

/**
 * 試合カード（全部の画面で共通。Matchday XI と同じ形）。
 * [logo][ホーム] ｜ 真ん中 ｜ [アウェイ][logo]。カードを押すと両チームの選手を開く。
 * `open`・`onToggle` を渡さないときは、カードの中で開閉を覚える。
 */
export function FixtureCard({
  match,
  open: controlledOpen,
  onToggle,
  defaultOpen = false,
  showLink = true,
}: {
  match: Match;
  open?: boolean;
  onToggle?: () => void;
  defaultOpen?: boolean;
  /** Details の中に試合の詳細ページへのリンクを出すか（詳細ページ自身では出さない）。 */
  showLink?: boolean;
}) {
  const { t } = useI18n();
  const [ownOpen, setOwnOpen] = useState(defaultOpen);
  const open = controlledOpen ?? ownOpen;
  const toggle = onToggle ?? (() => setOwnOpen((value) => !value));
  const playersOf = useFixturePlayers();
  const goals = useGoals();
  const matchGoals = tracksScorers(match) ? goalsOf(goals, match.id) : [];
  const live = match.status === "LIVE";
  const panelId = `fixture-${match.id}`;
  return (
    <article className={`fixture-card${open ? " is-open" : ""}${live ? " is-live" : ""}`}>
      {/* カード（上の行）を押すと選手の一覧を開閉する。キーボードは Enter・Space。 */}
      <div
        className="fixture-row"
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
      >
        <div className="fixture-teams">
          <TeamSlot teamId={match.homeTeamId} side="home" />
          <FixtureCenter match={match} />
          <TeamSlot teamId={match.awayTeamId} side="away" />
        </div>
      </div>
      <div id={panelId} className="fixture-panel" hidden={!open}>
        {open && (
          <>
            <div className="fixture-players-grid">
              <PlayersColumn
                teamId={match.homeTeamId}
                players={playersOf(match.homeTeamId)}
                goals={matchGoals}
              />
              <PlayersColumn
                teamId={match.awayTeamId}
                players={playersOf(match.awayTeamId)}
                goals={matchGoals}
              />
            </div>
            {showLink && (
              <Link className="fixture-link" to={`/matches/${encodeURIComponent(match.id)}`}>
                {t("matches.openMatch")} →
              </Link>
            )}
          </>
        )}
      </div>
    </article>
  );
}
