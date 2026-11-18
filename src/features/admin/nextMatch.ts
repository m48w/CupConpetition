import type { Match } from "../../types";

const startOf = (match: Match) => Date.parse(match.scheduledStart);

/**
 * 試合を終わらせたあとに選ぶ「次の試合」。同じコートで、終わらせた試合より後の時間の、
 * 終わっていない試合。後に無ければ、そのコートで一番早い終わっていない試合。無ければ null。
 */
export function nextMatchOnCourt(matches: readonly Match[], finished: Match): Match | null {
  const candidates = matches
    .filter(
      (match) =>
        match.id !== finished.id && match.court === finished.court && match.status !== "FINISHED",
    )
    .sort((a, b) => startOf(a) - startOf(b) || a.id.localeCompare(b.id));
  return candidates.find((match) => startOf(match) >= startOf(finished)) ?? candidates[0] ?? null;
}
