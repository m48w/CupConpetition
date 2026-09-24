/**
 * サーバーの version カウンタをもとに、受信した TournamentState を適用すべきか判定する。
 *
 * - SSE の `state` イベントは常に信頼できる。同一接続内では順序が保証されており、
 *   新しい接続の最初のメッセージは、サーバーが再構築されて version が巻き戻っていても
 *   それまで保持していた値を上書きしてよい。
 * - mutating な呼び出し（PATCH/PUT/reset）のレスポンスは、既に受け取っている version
 *   以上の場合にのみ適用する。遅れて届いたレスポンスが、その間に届いた新しい SSE push を
 *   上書きしないようにするため。
 */
export function shouldApply(
  incomingVersion: number,
  currentVersion: number,
  source: "sse" | "response",
): boolean {
  if (source === "sse") return true;
  return incomingVersion >= currentVersion;
}
