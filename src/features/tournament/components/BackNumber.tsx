/** 背番号を丸の中に表示する（例: ⑩）。0〜99 まで同じ形にするため CSS の丸を使う。 */
export function BackNumber({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) return null;
  return (
    <span className="back-number" aria-label={`No. ${value}`}>
      {value}
    </span>
  );
}
