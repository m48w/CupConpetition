import { useState } from "react";
import { Empty } from "../components/ui/Empty";
import { PageTitle } from "../components/ui/PageTitle";
import { getTournamentId } from "../config";
import { useTeams } from "../features/tournament";
import { FixtureCard } from "../features/tournament/components/FixtureCard";
import {
  filterByTeam,
  filterUpcoming,
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
 * 全試合。スイッチ「Groups」（オフ: 時間の順・オン: グループごと）と「All matches」
 * （オフ: 終わっていない試合だけ・オン: 全部）、チーム選択。カードを押すと両チームの登録選手を開く。
 */
export function Matches({ matches }: { matches: Match[] }) {
  const { t } = useI18n();
  const teams = useTeams();
  const { myTeam } = useMyTeam(teams);

  const [sort, setSortState] = useState<SortMode>(() =>
    readStorage(SORT_KEY) === "group" ? "group" : "time",
  );
  // Upcoming（終わっていない試合だけ）が最初。保存はしない（開くたびに Upcoming）。
  const [scope, setScope] = useState<"upcoming" | "all">("upcoming");
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

  const byTeam = filterByTeam(matches, teamId);
  const visible = scope === "upcoming" ? filterUpcoming(byTeam) : byTeam;
  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

  const card = (match: Match) => (
    <FixtureCard
      key={match.id}
      match={match}
      open={openIds.has(match.id)}
      onToggle={() => setOpenIds((ids) => toggle(ids, match.id))}
    />
  );

  return (
    <>
      <PageTitle eyebrow={t("matches.eyebrow")} title={t("matches.title")} />
      {matches.length === 0 && <Empty text={t("matches.empty")} />}
      {matches.length > 0 && (
        <div className="fixtures-toolbar">
          <div className="fixtures-switches">
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                checked={sort === "group"}
                onChange={(event) => setSort(event.target.checked ? "group" : "time")}
              />
              <span className="switch-track" aria-hidden="true" />
              <span>{t("nav.groups")}</span>
            </label>
            <label className="switch">
              <input
                type="checkbox"
                role="switch"
                checked={scope === "all"}
                onChange={(event) => setScope(event.target.checked ? "all" : "upcoming")}
              />
              <span className="switch-track" aria-hidden="true" />
              <span>{t("matches.scope.all")}</span>
            </label>
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
      {matches.length > 0 && visible.length === 0 && (
        <Empty text={t(scope === "upcoming" ? "matches.noUpcoming" : "matches.noMatches")} />
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
            <section className="fixtures-section" key={section.id} data-group={section.id}>
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
