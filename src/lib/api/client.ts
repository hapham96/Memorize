import { clearAuthSession, loadAuthSession } from "@/lib/storage";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

/** Status used when the request never reached the backend (offline, DNS, CORS). */
export const NETWORK_ERROR_STATUS = 0;

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }

  /** True when the backend was unreachable rather than returning a failure. */
  get isNetworkError(): boolean {
    return this.status === NETWORK_ERROR_STATUS;
  }
}

interface ApiFetchOptions extends RequestInit {
  auth?: boolean;
}

/**
 * The failure envelope every endpoint answers a rejected request with:
 * `{ success: false, error: { statusCode, message }, timestamp, path }`.
 * Successful responses are **not** wrapped — they are the raw payload — so this
 * shape only ever describes an error.
 */
export type ApiErrorEnvelope = {
  success: false;
  error?: {
    statusCode?: number | null;
    /** A string, or `string[]` for validation failures. */
    message?: string | string[] | null;
  } | null;
  timestamp?: string | null;
  path?: string | null;
};

/** True for the envelope above. Only an object literal qualifies — the bulk-add
 *  endpoint answers with an *array* of per-word `{ success }` results. */
function isFailureEnvelope(body: any): body is ApiErrorEnvelope {
  return (
    !!body &&
    typeof body === "object" &&
    !Array.isArray(body) &&
    body.success === false
  );
}

/**
 * The message lives at `error.message` in the envelope and at `message` in the
 * older bare NestJS shape. Either may be `string[]` (validation errors) — join
 * those for display.
 */
function extractErrorMessage(body: any, fallback: string): string {
  const message = body?.error?.message ?? body?.message;
  if (Array.isArray(message)) {
    const joined = message.filter(Boolean).join("\n");
    if (joined) return joined;
  }
  if (typeof message === "string" && message) return message;
  // Legacy shape puts the reason phrase in `error` (`{ error: "Not Found" }`).
  if (typeof body?.error === "string" && body.error) return body.error;
  return fallback;
}

/**
 * The envelope carries its own `statusCode`, which is what the backend means —
 * prefer it over the HTTP status so a failure delivered with a 2xx status still
 * reports 422/401 to the caller.
 */
function extractErrorStatus(body: any, fallback: number): number {
  const code = body?.error?.statusCode ?? body?.statusCode;
  return typeof code === "number" && Number.isFinite(code) ? code : fallback;
}

/** Turn a parsed failure body into the ApiError callers catch. */
function toApiError(
  body: any,
  fallbackStatus: number,
  fallbackMessage: string,
  auth: boolean,
): ApiError {
  const status = extractErrorStatus(body, fallbackStatus);
  // A rejected token is dead weight — drop it so later calls degrade to local data.
  if (auth && status === 401) {
    clearAuthSession();
  }
  // `statusText` is empty over HTTP/2, so it cannot be the last resort — the
  // message is shown to the user (AuthScreen) and must never be blank.
  const message =
    extractErrorMessage(body, fallbackMessage) ||
    `Yêu cầu thất bại (HTTP ${status}).`;
  return new ApiError(status, message);
}

async function requestAsync<T>(
  path: string,
  method: string,
  body: any,
  options: ApiFetchOptions,
): Promise<T> {
  const { auth = false, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...(headers as Record<string, string>),
  };

  if (auth) {
    const token = loadAuthSession()?.accessToken;
    if (token) {
      finalHeaders["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...rest,
      method,
      headers: finalHeaders,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (e) {
    throw new ApiError(
      NETWORK_ERROR_STATUS,
      e instanceof Error ? e.message : "Network request failed",
    );
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    throw toApiError(errorBody, response.status, response.statusText, auth);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const data = await response.json();

  // A rejection can also arrive with a 2xx status — `success: false` is what
  // decides, not the HTTP code, so never hand the envelope back as a payload.
  if (isFailureEnvelope(data)) {
    throw toApiError(data, response.status, response.statusText, auth);
  }

  return data as T;
}

export async function postAsync<T>(
  path: string,
  body: any,
  options: ApiFetchOptions = {},
): Promise<T> {
  return requestAsync<T>(path, "POST", body, options);
}

export async function patchAsync<T>(
  path: string,
  body: any,
  options: ApiFetchOptions = {},
): Promise<T> {
  return requestAsync<T>(path, "PATCH", body, options);
}

export async function getAsync<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  return requestAsync<T>(path, "GET", undefined, options);
}
