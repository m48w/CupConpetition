import { info, venue } from "../../content/info";
import { useI18n } from "../../i18n/useI18n";

/** Home の下の「大会情報」と「問い合わせ先」。中身は src/content/info.ts。 */
export function TournamentInfoSection() {
  const { lang, t } = useI18n();
  const content = info[lang];
  return (
    <section className="overview-section info-section" id="tournament-info">
      <div className="section-heading">
        <h2>{t("info.title")}</h2>
      </div>
      <dl className="info-facts">
        <dt>{t("info.date")}</dt>
        <dd>{content.date}</dd>
        <dt>{t("info.time")}</dt>
        <dd>{content.time}</dd>
        <dt>{t("info.venue")}</dt>
        <dd>{content.venue.name}</dd>
        <dt>{t("info.address")}</dt>
        <dd>{content.venue.address}</dd>
        <dt>{t("info.addressJa")}</dt>
        <dd lang="ja">{venue.addressJa}</dd>
      </dl>
      <a className="primary-button info-map" href={venue.mapUrl} target="_blank" rel="noopener">
        {t("info.map")}
      </a>

      <h3 className="info-subtitle">{t("info.contact")}</h3>
      {content.contact.length === 0 ? (
        <p className="muted">{t("info.tba")}</p>
      ) : (
        <dl className="info-facts">
          {content.contact.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
