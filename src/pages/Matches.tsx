import { useCallback, useMemo, useState } from "react";
import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { getTournamentId } from "../config";
import { useRegisteredTeams } from "../features/registration/useRegisteredTeams";
import { goalsOf, useGoals, useTeams } from "../features/tournament";
import { FixtureCard, type FixturePlayer } from "../features/tournament/components/FixtureCard";
import {
  filterByTeam,
  groupSections,
  KNOCKOUT_SECTION,
  sortByTime,
  type SortMode,
} from "../features/tournament/fixtures";
import { useMyTeam } from "../features/tournament/hooks/useMyTeam";
import { useI18n } from "../i18n/useI18n";
import type { Match } from "../types";

const SORT_KEY = "vc.matches.sort";
const teamKey = () => `vc.matches.team.${getTournamentId()}`;

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // 保存できなくても、今の画面では使える。
  }
}

/**
 * 全試合。並び替え［Group］［Time］とチーム選択。カードは Matchday XI と同じ形で、
 * 「Details」で両チームの登録選手を開く。
 */
export function Matches({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const teams = useTeams();
  const goals = useGoals();
  const { myTeam } = useMyTeam(teams);
  const { teams: registered } = useRegisteredTeams();

  const [sort, setSortState] = useState<SortMode>(() =>
    readStorage(SORT_KEY) === "group" ? "group" : "time",
  );
  const [storedTeam, setStoredTeam] = useState<string | null>(() => readStorage(teamKey()));
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  // 選んだチームが今のチーム一覧に無ければ（大会の作り直しなど）「すべて」に戻す。
  const chosen = storedTeam ?? myTeam?.id ?? "ALL";
  const teamId = chosen === "ALL" || teams.some((team) => team.id === chosen) ? chosen : "ALL";

  const setSort = (next: SortMode) => {
    setSortState(next);
    writeStorage(SORT_KEY, next);
  };
  const setTeam = (next: string) => {
    setStoredTeam(next);
    writeStorage(teamKey(), next);
  };
  const toggle = (set: Set<string>, id: string) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  const playersByRegistration = useMemo(
    () => new Map((registered ?? []).map((team) => [team.id, team.members])),
    [registered],
  );
  const playersOf = useCallback(
    (id: string): FixturePlayer[] | undefined => {
      const registrationId = teams.find((team) => team.id === id)?.registrationTeamId;
      return registrationId ? playersByRegistration.get(registrationId) : undefined;
    },
    [teams, playersByRegistration],
  );

  const visible = filterByTeam(matches, teamId);
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const card = (match: Match) => (
    <FixtureCard
      key={match.id}
      match={match}
      open={openIds.has(match.id)}
      onToggle={() => setOpenIds((ids) => toggle(ids, match.id))}
      playersOf={playersOf}
      goals={goalsOf(goals, match.id)}
    />
  );

  return (
    <>
      <PageTitle eyebrow={t("matches.eyebrow")} title={t("matches.title")} />
      {matches.length === 0 && <Empty text={t("matches.empty")} />}
      {matches.length > 0 && (
        <div className="fixtures-toolbar">
          <div className="fixtures-sort" role="group" aria-label={t("matches.sort")}>
            {(["group", "time"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={sort === mode}
                className={sort === mode ? "active" : ""}
                onClick={() => setSort(mode)}
              >
                {t(mode === "group" ? "matches.sort.group" : "matches.sort.time")}
              </button>
            ))}
          </div>
          <label className="fixtures-team">
            <span>{t("matches.team")}</span>
            <select value={teamId} onChange={(event) => setTeam(event.target.value)}>
              <option value="ALL">{t("matches.allTeams")}</option>
              {sortedTeams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {sort === "time" ? (
        <div className="fixtures-list">{sortByTime(visible).map(card)}</div>
      ) : (
        groupSections(visible).map((section) => {
          const isOpen = !collapsed.has(section.id);
          const title =
            section.id === KNOCKOUT_SECTION
              ? t("nav.knockout")
              : t("common.group", { id: section.id });
          return (
            <section className="fixtures-section" key={section.id}>
              <button
                type="button"
                className="fixtures-section-head"
                aria-expanded={isOpen}
                aria-controls={`fixtures-${section.id}`}
                onClick={() => setCollapsed((ids) => toggle(ids, section.id))}
              >
                <span className="fixtures-section-title">{title}</span>
                <span className="muted">
                  {t("app.matchCount", { count: section.matches.length })}
                </span>
                <span className="fixtures-section-chevron" aria-hidden="true">
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              <div id={`fixtures-${section.id}`} className="fixtures-list" hidden={!isOpen}>
                {isOpen && section.matches.map(card)}
              </div>
            </section>
          );
        })
      )}
    </>
  );
}
