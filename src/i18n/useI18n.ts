import { useContext } from "react";
import { I18nContext } from "./context";

/** `t("key")` で今の言語の文を返す。 */
export const useI18n = () => useContext(I18nContext);
