import { createContext } from "react";
import type { MessageKey } from "./messages";
import { DEFAULT_LANG, translate, type Lang, type MessageVars } from "./translate";

export interface I18nValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: MessageKey, vars?: MessageVars) => string;
}

/** Provider の外（テストなど）では英語で動く。 */
export const I18nContext = createContext<I18nValue>({
  lang: DEFAULT_LANG,
  setLang: () => undefined,
  t: (key, vars) => translate(DEFAULT_LANG, key, vars),
});
