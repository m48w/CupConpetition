import { Link, useParams } from "react-router-dom";
import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { MatchCard, useTeams } from "../features/tournament";
import { StandingsTable } from "../features/tournament/components/StandingsTable";
import { GROUP_IDS } from "../features/tournament/schedule";
import type { Match } from "../types";
import { useI18n } from "../i18n/useI18n";
import { NotFound } from "./NotFound";

/** 全グループの順位表（以前の Standings ページもここにまとめた）。 */
export function Groups({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const teams = useTeams();
  return (
    <>
      <PageTitle eyebrow={t("groups.eyebrow")} title={t("groups.title")}>
        <span className="muted">{t("groups.note")}</span>
      </PageTitle>
      {teams.length === 0 ? (
        <Empty text={t("groups.empty")} />
      ) : (
        <div className="standings-grid">
          {GROUP_IDS.map((groupId) => (
            <Link className="standings-link" key={groupId} to={`/groups/${groupId}`}>
              <StandingsTable
                groupId={groupId}
                teams={teams}
                matches={matches}
                title={t("common.group", { id: groupId })}
              />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function GroupDetail({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const { groupId } = useParams();
  const teams = useTeams();
  const selectedGroupId = GROUP_IDS.find((id) => id === groupId);
  if (!selectedGroupId) return <NotFound />;
  const fixtures = matches.filter((match) => match.groupId === selectedGroupId);
  return (
    <>
      <PageTitle eyebrow={t("groups.eyebrow")} title={t("common.group", { id: selectedGroupId })}>
        <Link className="outline-button" to="/groups">
          {t("groups.all")}
        </Link>
      </PageTitle>
      {teams.length === 0 ? (
        <Empty text={t("groups.empty")} />
      ) : (
        <StandingsTable groupId={selectedGroupId} teams={teams} matches={matches} />
      )}
      <section className="section-block">
        <div className="section-heading">
          <h2>{t("groups.matches", { id: selectedGroupId })}</h2>
        </div>
        {fixtures.length === 0 ? (
          <Empty text={t("matches.empty")} />
        ) : (
          <div className="list-grid">
            {fixtures.map((match) => (
              <MatchCard match={match} key={match.id} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}
