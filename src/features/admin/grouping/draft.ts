import { GROUP_IDS } from "../../tournament/schedule";

/** グループ分けの下書き（画面だけで持ち、「Save groups」でまとめて保存する）。 */
export type GroupId = (typeof GROUP_IDS)[number];
export const UNASSIGNED = "unassigned" as const;
export type ZoneId = GroupId | typeof UNASSIGNED;
/** グループごとの登録チームIDの並び。 */
export type Draft = Record<GroupId, string[]>;

export const MIN_TEAMS_PER_GROUP = 2;
export const MAX_TEAMS_PER_GROUP = 5;

export interface GroupCandidate {
  id: string;
  teamName: string;
  clubName: string;
  logoId: string | null;
}

export const emptyDraft = (): Draft =>
  Object.fromEntries(GROUP_IDS.map((groupId) => [groupId, [] as string[]])) as Draft;

/** サーバーから来たグループ分けを下書きにする。知らないID（消えた登録チーム）は外す。 */
export function toDraft(groups: Record<string, string[]>, candidateIds: Set<string>): Draft {
  const draft = emptyDraft();
  for (const groupId of GROUP_IDS) {
    draft[groupId] = (groups[groupId] ?? []).filter((id) => candidateIds.has(id));
  }
  return draft;
}

export function zoneOf(draft: Draft, teamId: string): ZoneId {
  return GROUP_IDS.find((groupId) => draft[groupId].includes(teamId)) ?? UNASSIGNED;
}

export const isFull = (draft: Draft, groupId: GroupId) =>
  draft[groupId].length >= MAX_TEAMS_PER_GROUP;

/** そこへ動かせるか（満員のグループには入れない。今いる場所はいつでもよい）。 */
export function canMove(draft: Draft, teamId: string, to: ZoneId): boolean {
  if (to === UNASSIGNED) return true;
  return draft[to].includes(teamId) || !isFull(draft, to);
}

/** チームを動かした新しい下書き。動かせないときは同じ下書きを返す。 */
export function moveTeam(draft: Draft, teamId: string, to: ZoneId): Draft {
  if (!canMove(draft, teamId, to) || zoneOf(draft, teamId) === to) return draft;
  const next = emptyDraft();
  for (const groupId of GROUP_IDS) {
    next[groupId] = draft[groupId].filter((id) => id !== teamId);
  }
  if (to !== UNASSIGNED) next[to] = [...next[to], teamId];
  return next;
}

export function unassignedTeams(draft: Draft, candidates: GroupCandidate[]): GroupCandidate[] {
  const assigned = new Set(GROUP_IDS.flatMap((groupId) => draft[groupId]));
  return candidates.filter((candidate) => !assigned.has(candidate.id));
}

/** 試合を作れない理由。空なら作れる（8グループすべて2〜5チーム）。 */
export function scheduleProblems(draft: Draft): string[] {
  return GROUP_IDS.flatMap((groupId) =>
    draft[groupId].length < MIN_TEAMS_PER_GROUP
      ? [`Group ${groupId} needs at least ${MIN_TEAMS_PER_GROUP} teams`]
      : [],
  );
}

export const isDirty = (draft: Draft, saved: Draft) =>
  GROUP_IDS.some((groupId) => draft[groupId].join(",") !== saved[groupId].join(","));
