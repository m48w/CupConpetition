import { ApiError } from "../utils/http";
import { messages, type MessageKey } from "./messages";

/** サーバーのエラー `code` に対応する文のキー。対応が無いものは null。 */
export function errorKeyForCode(code: string | undefined): MessageKey | null {
  if (!code) return null;
  const key = `err.${code}`;
  return key in messages ? (key as MessageKey) : null;
}

/**
 * エラーを画面に出す文のキーにする。
 * - サーバーの code が翻訳にあればそれ
 * - 通信できなかった（ApiError 以外の TypeError など）は err.network
 * - それ以外は fallback
 */
export function errorKey(reason: unknown, fallback: MessageKey): MessageKey {
  if (reason instanceof ApiError) return errorKeyForCode(reason.code) ?? fallback;
  if (reason instanceof TypeError) return "err.network";
  return fallback;
}
