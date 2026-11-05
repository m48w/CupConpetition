import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { REGISTRATION_BASE_PATH } from "../../config";
import { useI18n } from "../../i18n/useI18n";
import { LanguageSwitch } from "./LanguageSwitch";
import { useInstallPrompt } from "./useInstallPrompt";

/** 「ホーム画面に追加」。ブラウザによってボタンか手順を出す。 */
function InstallItem() {
  const { t } = useI18n();
  const { state, install } = useInstallPrompt();
  if (state === "installed") return <p className="header-menu-note">{t("install.done")}</p>;
  return (
    <div className="header-menu-install">
      {state === "available" ? (
        <button type="button" className="outline-button" onClick={() => void install()}>
          ＋ {t("install.button")}
        </button>
      ) : (
        <strong>＋ {t("install.button")}</strong>
      )}
      <p className="header-menu-note">
        {state === "ios"
          ? t("install.ios")
          : state === "manual"
            ? t("install.other")
            : t("install.hint")}
      </p>
    </div>
  );
}

/**
 * スマホ・タブレット（幅900px以下）のヘッダーの ☰ メニュー。
 * 中身: Register、言語切り替え、ホーム画面に追加。PC では表示しない（CSS）。
 */
export function HeaderMenu() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const location = useLocation();

  // ページを移動したら閉じる。
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    const onPointer = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!panel.current?.contains(target) && !button.current?.contains(target)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="header-menu">
      <button
        ref={button}
        type="button"
        className="header-menu-button"
        aria-expanded={open}
        aria-controls="header-menu-panel"
        aria-label={open ? t("menu.close") : t("menu.open")}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true">{open ? "×" : "☰"}</span>
      </button>
      {open && (
        <div
          ref={panel}
          id="header-menu-panel"
          className="header-menu-panel"
          role="dialog"
          aria-label={t("menu.title")}
        >
          <a href={`${REGISTRATION_BASE_PATH}/`} className="primary-button header-menu-register">
            {t("app.register")}
          </a>
          <div className="header-menu-row">
            <span>{t("lang.label")}</span>
            <LanguageSwitch />
          </div>
          <InstallItem />
        </div>
      )}
    </div>
  );
}
