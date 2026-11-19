import type { CardColor } from "../../../types";

/** 文字を入れない小さなカードの形。読み上げ用に label を付ける。 */
export function CardMark({ color, label }: { color: CardColor; label: string }) {
  return (
    <span
      className={color === "YELLOW" ? "card-mark yellow" : "card-mark red"}
      role="img"
      aria-label={label}
      title={label}
    />
  );
}
