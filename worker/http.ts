/** すべてのAPIの応答に付けるセキュリティ用のヘッダー。HTMLなどの静的ファイルは public/_headers で付ける。 */
export const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "x-frame-options": "DENY",
};

export function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...SECURITY_HEADERS,
      ...headers,
    },
  });
}

/** Durable Object からの応答（ロゴ画像など）にもセキュリティ用のヘッダーを付ける。WebSocket はそのまま返す。 */
export function withSecurityHeaders(response: Response): Response {
  if (response.status === 101 || response.webSocket) return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (!headers.has(name)) headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
