import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../components/ui/PageTitle";
import { MatchCard } from "../features/tournament";
import type { Match } from "../types";
import { NotFound } from "./NotFound";

export function MatchDetail({ matches }: { matches: Match[] }) {
  const { matchId } = useParams();
  const match = matches.find((item) => item.id === matchId);
  if (!match) return <NotFound />;
  return (
    <>
      <PageTitle eyebrow="MATCH CENTRE" title={`Match ${match.id}`}>
        <Link className="outline-button" to="/matches">
          All matches
        </Link>
      </PageTitle>
      <div className="match-detail-card">
        <MatchCard match={match} />
        <p className="muted">Match details and scorer information will appear here.</p>
      </div>
    </>
  );
}
