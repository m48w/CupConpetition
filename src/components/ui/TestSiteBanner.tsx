import { useEffect, useState } from "react";
import { useI18n } from "../../i18n/useI18n";

/** テスト環境のときだけ、画面の一番上に「テスト用のサイト」の帯を出す。本番では何も出さない。 */
export function TestSiteBanner() {
  const { t } = useI18n();
  const [isStaging, setIsStaging] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/env")
      .then((response) => (response.ok ? response.json() : null))
      .then((body: { environment?: string } | null) => {
        if (!cancelled) setIsStaging(body?.environment === "staging");
      })
      .catch(() => {
        // 取れないときは本番として扱い、帯を出さない。
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isStaging) return null;
  return (
    <div className="test-site-banner" role="status">
      {t("app.testSite")}
    </div>
  );
}
