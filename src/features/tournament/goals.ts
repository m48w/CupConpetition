import type { Goal, Match, Stage } from "../../types";

/** 得点者を記録する試合（Best 8 から）。 */
export const SCORER_STAGES: readonly Stage[] = ["QF", "SF", "FINAL"];

export const tracksScorers = (match: Pick<Match, "stage">) => SCORER_STAGES.includes(match.stage);

/** タイマーの経過秒からゴールの分を出す（切り上げ。0秒でも 1'）。 */
export const goalMinute = (elapsedSeconds: number) =>
  Math.max(1, Math.ceil(Math.max(0, elapsedSeconds) / 60));

/** その試合のゴール（記録した順）。 */
export const goalsOf = (goals: readonly Goal[], matchId: string) =>
  goals.filter((goal) => goal.matchId === matchId);

export interface TopScorer {
  rank: number;
  memberId: string;
  teamId: string;
  playerName: string;
  backNumber: number | null;
  goals: number;
}

/**
 * 得点ランキング。QF・SF・決勝のゴールだけ数える。Unknown player は入れない。
 * 同じゴール数は同じ順位（1, 1, 3, …）。同じ順位の中は名前の順。
 */
export function topScorers(goals: readonly Goal[], matches: readonly Match[]): TopScorer[] {
  const tracked = new Set(matches.filter(tracksScorers).map((match) => match.id));
  const byPlayer = new Map<string, Omit<TopScorer, "rank">>();
  for (const goal of goals) {
    if (!goal.memberId || !goal.playerName || !tracked.has(goal.matchId)) continue;
    const key = `${goal.teamId}:${goal.memberId}`;
    const current = byPlayer.get(key);
    if (current) {
      current.goals += 1;
      // 名前・背番号は最後に記録したものを使う。
      current.playerName = goal.playerName;
      current.backNumber = goal.backNumber;
    } else {
      byPlayer.set(key, {
        memberId: goal.memberId,
        teamId: goal.teamId,
        playerName: goal.playerName,
        backNumber: goal.backNumber,
        goals: 1,
      });
    }
  }
  const sorted = [...byPlayer.values()].sort(
    (a, b) => b.goals - a.goals || a.playerName.localeCompare(b.playerName),
  );
  let rank = 0;
  return sorted.map((row, index) => {
    if (index === 0 || sorted[index - 1].goals !== row.goals) rank = index + 1;
    return { ...row, rank };
  });
}
