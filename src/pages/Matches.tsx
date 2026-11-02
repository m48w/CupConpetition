import { useState } from "react";
import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { MatchCard, useTeams } from "../features/tournament";
import { useMyTeam } from "../features/tournament/hooks/useMyTeam";
import { useI18n } from "../i18n/useI18n";
import type { Match } from "../types";

const STAGES = ["GROUP", "R16", "QF", "SF", "FINAL"] as const;

export function Matches({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const [stage, setStage] = useState("ALL");
  const [teamId, setTeamId] = useState("ALL");
  const [groupId, setGroupId] = useState("ALL");
  const [court, setCourt] = useState("ALL");
  const teams = useTeams();
  const { myTeam } = useMyTeam(teams);
  const filtered = matches.filter(
    (match) =>
      (stage === "ALL" || match.stage === stage) &&
      (teamId === "ALL" || match.homeTeamId === teamId || match.awayTeamId === teamId) &&
      (groupId === "ALL" || match.groupId === groupId) &&
      (court === "ALL" || String(match.court) === court),
  );
  return (
    <>
      <PageTitle eyebrow={t("matches.eyebrow")} title={t("matches.title")}>
        <span className="bracket-note">{t("matches.shown", { count: filtered.length })}</span>
      </PageTitle>
      {matches.length === 0 && <Empty text={t("matches.empty")} />}
      <div className="filter-bar">
        <select value={stage} onChange={(event) => setStage(event.target.value)}>
          <option value="ALL">{t("filter.round")}</option>
          {STAGES.map((option) => (
            <option value={option} key={option}>
              {t(`stage.${option}`)}
            </option>
          ))}
        </select>
        <select value={teamId} onChange={(event) => setTeamId(event.target.value)}>
          <option value="ALL">{t("filter.team")}</option>
          {teams.map((team) => (
            <option value={team.id} key={team.id}>
              {team.name}
            </option>
          ))}
        </select>
        <select value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="ALL">{t("filter.group")}</option>
          {["A", "B", "C", "D", "E", "F", "G", "H"].map((value) => (
            <option value={value} key={value}>
              {t("common.group", { id: value })}
            </option>
          ))}
        </select>
        <select value={court} onChange={(event) => setCourt(event.target.value)}>
          <option value="ALL">{t("filter.court")}</option>
          {[1, 2, 3].map((value) => (
            <option value={value} key={value}>
              {t("common.court", { court: value })}
            </option>
          ))}
        </select>
        {myTeam && (
          <button
            className={`outline-button${teamId === myTeam.id ? " active" : ""}`}
            type="button"
            aria-pressed={teamId === myTeam.id}
            onClick={() => setTeamId(teamId === myTeam.id ? "ALL" : myTeam.id)}
          >
            {t("myTeam.filter")}
          </button>
        )}
        <button
          className="outline-button"
          type="button"
          onClick={() => {
            setStage("ALL");
            setTeamId("ALL");
            setGroupId("ALL");
            setCourt("ALL");
          }}
        >
          {t("filter.reset")}
        </button>
      </div>
      <div className="list-grid">
        {filtered.map((match) => (
          <MatchCard match={match} key={match.id} />
        ))}
      </div>
      <p className="muted centered">
        {t("matches.showing", { shown: filtered.length, total: matches.length })}
      </p>
    </>
  );
}
