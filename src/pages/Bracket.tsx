import { PageTitle } from "../components/ui/PageTitle";
import { Empty } from "../components/ui/Empty";
import { bracketRounds, TeamBadge, type BracketGame, useTeams } from "../features/tournament";
import type { Match } from "../types";
import { formatTime } from "../utils/format";

function BracketSide({
  name,
  teamId,
  score,
}: {
  name: string;
  teamId?: string;
  score: number | null;
}) {
  return (
    <div className="bracket-side">
      <div className="bracket-team">
        {teamId && <TeamBadge id={teamId} showName={false} />}
        <span>{name}</span>
      </div>
      {score !== null && <b>{score}</b>}
    </div>
  );
}

function BracketCard({ game }: { game: BracketGame }) {
  return (
    <div className="bracket-game">
      <small>
        {game.scheduledStart ? `${formatTime(game.scheduledStart)} · Court ${game.court}` : game.id}
      </small>
      <BracketSide name={game.home} teamId={game.homeTeamId} score={game.homeScore} />
      <BracketSide name={game.away} teamId={game.awayTeamId} score={game.awayScore} />
    </div>
  );
}

export function Bracket({ matches }: { matches: Match[] }) {
  const teams = useTeams();
  const groupMatches = matches.filter((match) => match.stage === "GROUP");
  const groupStageFinished =
    groupMatches.length > 0 && groupMatches.every((match) => match.status === "FINISHED");
  return (
    <>
      <PageTitle eyebrow="KNOCKOUT STAGE" title="Road to the final">
        <span className="bracket-note">
          {matches.length === 0 ? "15 matches · Schedule coming soon" : "15 matches · One champion"}
        </span>
      </PageTitle>
      {!groupStageFinished && <Empty text="Knockout teams are decided after the group stage." />}
      <div className="tournament-banner">
        <span>VELOCITY CUP 2026</span>
        <b>ROAD TO THE FINAL</b>
        <small>Every match. Every moment. One champion.</small>
      </div>
      <div className="bracket-scroll">
        <div className="bracket">
          {bracketRounds(matches, teams).map((round) => (
            <section className="bracket-round" key={round.stage}>
              <h3>{round.title}</h3>
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
