import { useEffect, useState } from "react";
import { requestJson } from "../../utils/http";

/** 公開の登録チーム（`GET /api/registration/teams`）。連絡先は含まない。 */
export interface RegisteredTeam {
  id: string;
  clubId: string;
  clubName: string;
  teamName: string;
  logoId: string | null;
  members: { name: string; backNumber: number }[];
}

// 1ページの中でカードがたくさんあっても、通信は1回にする（結果を共有する）。
let shared: Promise<RegisteredTeam[]> | null = null;

function loadOnce(): Promise<RegisteredTeam[]> {
  shared ??= requestJson<{ teams: RegisteredTeam[] }>("/api/registration/teams")
    .then(({ teams }) => teams)
    .catch((error: unknown) => {
      shared = null; // 次に開いたときにやり直せるように
      throw error;
    });
  return shared;
}

/** 登録チームを読む。`teams` は読み込み中は null。 */
export function useRegisteredTeams() {
  const [teams, setTeams] = useState<RegisteredTeam[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    loadOnce()
      .then((list) => {
        if (alive) setTeams(list);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return { teams, failed };
}
