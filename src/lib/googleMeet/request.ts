import "server-only";
import { GoogleMeetError, REQUEST_TIMEOUT_MS, cachedTokens, getAccessToken, normaliseEmail } from './auth';

export async function meetRequest<T>(
  organizerEmail: string,
  url: string,
  body?: unknown,
  method: "GET" | "POST" | "DELETE" = "POST",
): Promise<T> {
  const token = await getAccessToken(organizerEmail);

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!res.ok) {
    // A rejected token must not be reused on the next call.
    if (res.status === 401) cachedTokens.delete(normaliseEmail(organizerEmail));

    const text = (await res.text().catch(() => "")).slice(0, 300);

    throw new GoogleMeetError(`Google Meet API ${res.status}: ${text}`, res.status);
  }

  // DELETE answers with an empty body.
  return (await res.json().catch(() => ({}))) as T;
}
/** Network errors, timeouts, rate limits and Google 5xx are worth another try. */
function isRetryable(err: unknown): boolean {
  if (err instanceof GoogleMeetError) {
    return err.status === 429 || err.status >= 500 || err.status === 401;
  }

  return true; // fetch/abort errors
}
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (i === attempts - 1 || !isRetryable(err)) break;

      await sleep(400 * (i + 1));
    }
  }

  throw lastError;
}
