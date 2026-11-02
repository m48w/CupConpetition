import { useCallback, useState } from "react";
import { getTournamentId } from "../../../config";
import type { Team } from "../../../types";

const storageKey = () => `vc.myTeam.${getTournamentId()}`;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(storageKey());
  } catch {
    return null;
  }
}

/**
 * 「マイチーム」。ログインはいらず、この端末（ブラウザ）に試合運営用チームIDを保存する。
 * 保存したチームが今のチーム一覧に無い（大会が初期化された等）ときは未選択として扱う。
 */
export function useMyTeam(teams: Team[]) {
  const [storedId, setStoredId] = useState<string | null>(readStored);
  const team = teams.find((candidate) => candidate.id === storedId) ?? null;

  const choose = useCallback((id: string | null) => {
    setStoredId(id);
    try {
      if (id) window.localStorage.setItem(storageKey(), id);
      else window.localStorage.removeItem(storageKey());
    } catch {
      // 保存できなくても、今の画面では使える。
    }
  }, []);

  return { myTeam: team, chooseMyTeam: choose };
}
