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

/** NestJS validation errors arrive as `message: string[]`; join them for display. */
function extractErrorMessage(body: any, fallback: string): string {
  const message = body?.message;
  if (Array.isArray(message)) return message.join("\n");
  if (typeof message === "string" && message) return message;
  return fallback;
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
    // A rejected token is dead weight — drop it so later calls degrade to local data.
    if (auth && response.status === 401) {
      clearAuthSession();
    }

    const errorBody = await response.json().catch(() => null);
    throw new ApiError(
      response.status,
      extractErrorMessage(errorBody, response.statusText),
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function postAsync<T>(
  path: string,
  body: any,
  options: ApiFetchOptions = {},
): Promise<T> {
  return requestAsync<T>(path, "POST", body, options);
}

export async function getAsync<T>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  return requestAsync<T>(path, "GET", undefined, options);
}
