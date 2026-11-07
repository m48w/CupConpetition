import { useI18n } from "../../i18n/useI18n";
import { useIsStaging } from "../../utils/useIsStaging";

/** テスト環境のときだけ、画面の一番上に「テスト用のサイト」の帯を出す。本番では何も出さない。 */
export function TestSiteBanner() {
  const { t } = useI18n();
  if (!useIsStaging()) return null;
  return (
    <div className="test-site-banner" role="status">
      {t("app.testSite")}
    </div>
  );
}
