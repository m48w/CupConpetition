import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { I18nContext } from "./context";
import type { MessageKey } from "./messages";
import { readStoredLang, storeLang, translate, type Lang, type MessageVars } from "./translate";

const browserStorage = () => {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
};

/** 言語の状態を持ち、選んだ言語をブラウザに保存する。`<html lang>` も合わせる。 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => readStoredLang(browserStorage()));

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storeLang(browserStorage(), next);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: MessageKey, vars?: MessageVars) => translate(lang, key, vars),
    }),
    [lang, setLang],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
