import { useEffect, useState } from "react";
import { requestJson } from "../../utils/http";

/** `GET /api/registration/status` の結果。 */
export interface RegistrationStatus {
  registeredTeams: number;
  capacity: number;
  isFull: boolean;
  teamDeadline: string;
  teamRegistrationClosed: boolean;
  memberDeadline: string;
  memberRegistrationClosed: boolean;
}

/** 登録数・定員・締め切り。取れないときは null のまま（画面は今までどおり動く）。 */
export function useRegistrationStatus(): RegistrationStatus | null {
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  useEffect(() => {
    let cancelled = false;
    void requestJson<RegistrationStatus>("/api/registration/status")
      .then((next) => {
        if (!cancelled) setStatus(next);
      })
      .catch(() => {
        // 表示しないだけ。登録自体はサーバーが判断する。
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return status;
}

/** 新しいチームを受け付けているか。 */
export const isAcceptingTeams = (status: RegistrationStatus | null) =>
  !status || (!status.isFull && !status.teamRegistrationClosed);
