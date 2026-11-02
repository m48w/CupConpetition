import type { ReactNode } from "react";
import { PageTitle } from "../components/ui/PageTitle";
import { info, venue } from "../content/info";
import type { MessageKey } from "../i18n/messages";
import { useI18n } from "../i18n/useI18n";

function InfoSection({
  title,
  empty,
  children,
}: {
  title: MessageKey;
  empty: boolean;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <section className="overview-section info-section">
      <h2>{t(title)}</h2>
      {empty ? <p className="muted">{t("info.tba")}</p> : children}
    </section>
  );
}

/** 大会情報。中身は src/content/info.ts。 */
export function Info() {
  const { lang, t } = useI18n();
  const content = info[lang];
  return (
    <>
      <PageTitle eyebrow={t("info.eyebrow")} title={t("info.title")} />
      <section className="overview-section info-section">
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
      </section>

      <InfoSection title="info.gettingThere" empty={content.gettingThere.length === 0}>
        <ul>
          {content.gettingThere.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="info.schedule" empty={content.schedule.length === 0}>
        <dl className="info-schedule">
          {content.schedule.map((item) => (
            <div key={`${item.time}-${item.label}`}>
              <dt>{item.time}</dt>
              <dd>{item.label}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection title="info.rules" empty={content.rules.length === 0}>
        <ol>
          {content.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ol>
      </InfoSection>

      <InfoSection title="info.bring" empty={content.bring.length === 0}>
        <ul>
          {content.bring.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </InfoSection>

      <InfoSection title="info.contact" empty={content.contact.length === 0}>
        <dl className="info-facts">
          {content.contact.map((item) => (
            <div key={item.label}>
              <dt>{item.label}</dt>
              <dd>{item.value}</dd>
            </div>
          ))}
        </dl>
      </InfoSection>

      <InfoSection title="info.faq" empty={content.faq.length === 0}>
        {content.faq.map((item) => (
          <details key={item.q} className="info-faq">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </InfoSection>
    </>
  );
}
