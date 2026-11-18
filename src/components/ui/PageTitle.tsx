import type { ReactNode } from "react";

/**
 * ページの見出し。見出しの文字（eyebrow と h1）は画面には出さず、読み上げ用にだけ残す（2026-11-18）。
 * 横に置くボタンや短い説明（children）は今まで通り出す。
 */
export function PageTitle({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className={children ? "page-title" : "page-title is-empty"}>
      <div className="sr-only">
        <div>{eyebrow}</div>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}
