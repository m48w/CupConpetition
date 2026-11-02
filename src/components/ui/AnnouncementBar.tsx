import { useState } from "react";
import { useI18n } from "../../i18n/useI18n";
import type { Announcement } from "../../types";

const DISMISSED_KEY = "vc.dismissed";

function readDismissed(): string[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(DISMISSED_KEY) ?? "[]") as unknown;
    return Array.isArray(value) ? value.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function writeDismissed(ids: string[]) {
  try {
    // 古いものが増えすぎないよう、新しい50件だけ残す。
    window.localStorage.setItem(DISMISSED_KEY, JSON.stringify(ids.slice(-50)));
  } catch {
    // 保存できなくても、今の画面では閉じる。
  }
}

/**
 * 管理者のお知らせ。ミャンマー語が無ければ英語。本文は文字としてだけ表示する（HTMLにしない）。
 * 閉じたお知らせはこの端末では出さない。
 */
export function AnnouncementBar({ announcements }: { announcements: Announcement[] }) {
  const { lang, t } = useI18n();
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const visible = announcements.filter((item) => !dismissed.includes(item.id));
  if (visible.length === 0) return null;
  return (
    <div className="announcement-list" aria-label={t("announce.label")}>
      {visible.map((item) => (
        <div
          key={item.id}
          className={`announcement announcement-${item.level}`}
          role={item.level === "warning" ? "alert" : "status"}
        >
          <p>{lang === "my" && item.bodyMy ? item.bodyMy : item.bodyEn}</p>
          <button
            type="button"
            aria-label={t("announce.close")}
            onClick={() => {
              const next = [...dismissed, item.id];
              setDismissed(next);
              writeDismissed(next);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
