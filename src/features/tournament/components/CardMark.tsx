import type { CardMark as CardMarkKind } from "../cards";

const CLASS_NAMES: Record<CardMarkKind, string> = {
  YELLOW: "card-mark yellow",
  RED: "card-mark red",
  SECOND_YELLOW: "card-mark second-yellow",
};

/** 文字を入れない小さなカードの形。2枚目のイエローは黄と赤を重ねる。読み上げ用に label を付ける。 */
export function CardMark({ color, label }: { color: CardMarkKind; label: string }) {
  return <span className={CLASS_NAMES[color]} role="img" aria-label={label} title={label} />;
}
