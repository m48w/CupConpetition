import { useI18n } from "../../i18n/useI18n";
import type { Lang } from "../../i18n/translate";

const OPTIONS: { lang: Lang; label: string }[] = [
  { lang: "en", label: "EN" },
  { lang: "my", label: "မြန်မာ" },
];

/** 英語 / ミャンマー語の切り替え。ページは移動しない。 */
export function LanguageSwitch() {
  const { lang, setLang, t } = useI18n();
  return (
    <div className="language-switch" role="group" aria-label={t("lang.label")}>
      {OPTIONS.map((option) => (
        <button
          key={option.lang}
          type="button"
          lang={option.lang}
          aria-pressed={lang === option.lang}
          className={lang === option.lang ? "active" : ""}
          onClick={() => setLang(option.lang)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
