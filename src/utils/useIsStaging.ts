import { useEffect, useState } from "react";

/** テスト環境（またはローカル）か。取れないときは本番として扱う（false）。 */
export function useIsStaging() {
  const [isStaging, setIsStaging] = useState(false);
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/env")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { environment?: string } | null) => {
        if (!cancelled) setIsStaging(body?.environment === "staging");
      })
      .catch(() => {
        // 取れないときは本番として扱う。
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return isStaging;
}
