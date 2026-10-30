import { getTournamentId } from "../config";

/** API がエラーを返した。status で「ログインし直す」「待つ」などを判断する。 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method ?? "GET";
  let headers = init?.headers;
  if (method !== "GET" || typeof window !== "undefined") {
    const mergedHeaders = new Headers(init?.headers);
    if (typeof window !== "undefined") {
      mergedHeaders.set("x-tournament-id", getTournamentId());
    }
    if (method !== "GET") mergedHeaders.set("content-type", "application/json");
    headers = mergedHeaders;
  }
  const response = await fetch(path, {
    ...init,
    // The server refuses changes that are not JSON; that is what stops other sites posting forms here.
    headers,
  });

  if (!response.ok) {
    const detail = (await response.json().catch(() => ({}))) as {
      error?: string;
      code?: string;
      retryAfterSeconds?: number;
    };
    throw new ApiError(
      detail.error ?? `request failed: ${response.status}`,
      response.status,
      detail.code,
      detail.retryAfterSeconds,
    );
  }

  return (await response.json()) as T;
}
