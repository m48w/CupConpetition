import { useEffect, useState } from "react";
import type { Announcement } from "../../types";
import { requestJson } from "../../utils/http";

/** WebSocket を使わない画面（登録ページ）用。開いたときに一度だけ取る。 */
export function useAnnouncements(): Announcement[] {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  useEffect(() => {
    let cancelled = false;
    void requestJson<{ announcements: Announcement[] }>("/api/announcements")
      .then((body) => {
        if (!cancelled) setAnnouncements(body.announcements);
      })
      .catch(() => {
        // お知らせが取れなくても登録はできる。
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return announcements;
}
