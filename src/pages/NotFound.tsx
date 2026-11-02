import { Link } from "react-router-dom";
import { useI18n } from "../i18n/useI18n";

export function NotFound() {
  const { t } = useI18n();
  return (
    <section className="not-found">
      <div className="eyebrow">VELOCITY CUP 2026</div>
      <h1>404</h1>
      <h2>{t("notFound.title")}</h2>
      <Link className="outline-button" to="/">
        {t("common.backToTournament")}
      </Link>
    </section>
  );
}
