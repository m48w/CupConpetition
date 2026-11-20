import type { CardColor, MatchCard } from "../../types";

/** 画面に出す1行。2枚目のイエローと自動のレッドは1行にまとめる。 */
export interface CardRow {
  card: MatchCard;
  mark: CardMark;
}

export type CardMark = CardColor | "SECOND_YELLOW";

/**
 * カードの一覧を画面用にまとめる。`sourceCardId` があるレッド（2枚目のイエローで自動に入れたもの）は
 * 元のイエローの行に入れ、その行を `SECOND_YELLOW` にする。元のイエローが無いレッドはそのまま出す。
 */
export function cardRows(cards: MatchCard[]): CardRow[] {
  const ids = new Set(cards.map((card) => card.id));
  const linked = new Set(
    cards
      .filter((card) => card.sourceCardId && ids.has(card.sourceCardId))
      .map((card) => card.sourceCardId!),
  );
  return cards
    .filter((card) => !(card.sourceCardId && ids.has(card.sourceCardId)))
    .map((card) => ({ card, mark: linked.has(card.id) ? "SECOND_YELLOW" : card.color }));
}
