import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { bracketRounds, TeamBadge, type BracketGame, useTeams } from "../features/tournament";
import { useI18n } from "../i18n/useI18n";
import type { Match, Stage } from "../types";
import { formatTime } from "../utils/format";

const WINNER_PREFIX = "Winner ";

function BracketSide({
  name,
  teamId,
  score,
}: {
  name: string;
  teamId?: string;
  score: number | null;
}) {
  const { t } = useI18n();
  // まだ決まっていない枠（例: "Winner R16-1"）は今の言語で表示する。
  const label = name.startsWith(WINNER_PREFIX)
    ? t("bracket.winner", { match: name.slice(WINNER_PREFIX.length) })
    : name;
  return (
    <div className="bracket-side">
      <div className="bracket-team">
        {teamId && <TeamBadge id={teamId} showName={false} />}
        <span>{label}</span>
      </div>
      {score !== null && <b>{score}</b>}
    </div>
  );
}

function BracketCard({ game }: { game: BracketGame }) {
  const { t } = useI18n();
  return (
    <div className="bracket-game">
      <small>
        {game.scheduledStart
          ? t("bracket.when", { time: formatTime(game.scheduledStart), court: game.court ?? "" })
          : game.id}
      </small>
      <BracketSide name={game.home} teamId={game.homeTeamId} score={game.homeScore} />
      <BracketSide name={game.away} teamId={game.awayTeamId} score={game.awayScore} />
      {game.penalties && (
        <small className="bracket-penalties">
          {t("match.penalties", { home: game.penalties.home, away: game.penalties.away })}
        </small>
      )}
    </div>
  );
}

export function Bracket({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const teams = useTeams();
  const groupMatches = matches.filter((match) => match.stage === "GROUP");
  const groupStageFinished =
    groupMatches.length > 0 && groupMatches.every((match) => match.status === "FINISHED");
  return (
    <>
      <PageTitle eyebrow={t("bracket.eyebrow")} title={t("bracket.title")}>
        <span className="bracket-note">
          {matches.length === 0 ? t("bracket.pending") : t("bracket.ready")}
        </span>
      </PageTitle>
      {!groupStageFinished && <Empty text={t("bracket.notDecided")} />}
      <div className="tournament-banner">
        <span>VELOCITY CUP 2026</span>
        <b>{t("bracket.title")}</b>
        <small>{t("bracket.tagline")}</small>
      </div>
      <div className="bracket-scroll">
        <div className="bracket">
          {bracketRounds(matches, teams).map((round) => (
            <section className="bracket-round" key={round.stage}>
              <h3>{t(`bracket.round.${round.stage as Exclude<Stage, "GROUP">}`)}</h3>
              <div className="bracket-slots">
                {round.games.map((game) => (
                  <div className="bracket-slot" key={game.id}>
                    <BracketCard game={game} />
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </>
  );
}
