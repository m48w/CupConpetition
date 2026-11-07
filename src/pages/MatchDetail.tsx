import { Link, useParams } from "react-router-dom";
import { PageTitle } from "../components/ui/PageTitle";
import { MatchCard } from "../features/tournament";
import { useI18n } from "../i18n/useI18n";
import type { Match } from "../types";
import { NotFound } from "./NotFound";

export function MatchDetail({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const { matchId } = useParams();
  const match = matches.find((item) => item.id === matchId);
  if (!match) return <NotFound />;
  return (
    <>
      <PageTitle
        eyebrow={t("matchDetail.eyebrow")}
        title={t("matchDetail.title", { id: match.id })}
      >
        <Link className="outline-button" to="/matches">
          {t("matchDetail.all")}
        </Link>
      </PageTitle>
      <div className="match-detail-card">
        <MatchCard match={match} showScorers />
      </div>
    </>
  );
}
