import { messages, type MessageKey } from "./messages";

export type Lang = "en" | "my";
export const LANGS: readonly Lang[] = ["en", "my"];
export const DEFAULT_LANG: Lang = "en";
export const LANG_STORAGE_KEY = "vc.lang";

export type MessageVars = Record<string, string | number>;

/** `{name}` を値に置きかえる。値が無い `{...}` はそのまま残す。 */
export function interpolate(text: string, vars?: MessageVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

/** 文を返す。ミャンマー語が無い・空なら英語。 */
export function translate(lang: Lang, key: MessageKey, vars?: MessageVars): string {
  const entry: { en: string; my?: string } = messages[key];
  const text = lang === "my" && entry.my ? entry.my : entry.en;
  return interpolate(text, vars);
}

export function isLang(value: unknown): value is Lang {
  return value === "en" || value === "my";
}

/** 保存した言語を読む。読めないとき（プライベートモードなど）は英語。 */
export function readStoredLang(storage: Pick<Storage, "getItem"> | undefined): Lang {
  try {
    const value = storage?.getItem(LANG_STORAGE_KEY);
    return isLang(value) ? value : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

export function storeLang(storage: Pick<Storage, "setItem"> | undefined, lang: Lang): void {
  try {
    storage?.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // 保存できなくても、今の画面は切り替える。
  }
}
