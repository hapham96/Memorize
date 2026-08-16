import { AuthResponse, AuthSession, JwtPayload, LoginRequest, RegisterRequest } from "@/types/auth";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "@/lib/storage";
import { postAsync } from "./client";

/** Backend rule from RegisterDto. */
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Reads the JWT payload without verifying it — the signature is the backend's
 * business; we only need `sub` (user id) and `exp` for local bookkeeping.
 */
export function decodeJwt(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;

    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join('')
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function toAuthSession(accessToken: string, email: string): AuthSession {
  const claims = decodeJwt(accessToken);
  return {
    accessToken,
    userId: typeof claims?.sub === 'number' ? claims.sub : null,
    email,
    expiresAt: claims?.exp ? claims.exp * 1000 : null,
  };
}

export async function register(payload: RegisterRequest): Promise<AuthSession> {
  const response = await postAsync<AuthResponse>('/auth/register', payload);
  const session = toAuthSession(response.accessToken, payload.email);
  saveAuthSession(session);
  return session;
}

export async function login(payload: LoginRequest): Promise<AuthSession> {
  const response = await postAsync<AuthResponse>('/auth/login', payload);
  const session = toAuthSession(response.accessToken, payload.email);
  saveAuthSession(session);
  return session;
}

export function logout(): void {
  clearAuthSession();
}

export function getCurrentSession(): AuthSession | null {
  return loadAuthSession();
}

export function isAuthenticated(): boolean {
  return loadAuthSession() !== null;
}

/**
 * Numeric user id for endpoints that still take one explicitly.
 * Falls back to 1 so the app keeps working in the signed-out demo state.
 */
export function getCurrentUserId(): number {
  return loadAuthSession()?.userId ?? 1;
}

/** Display name derived from the account email (the backend stores no name). */
export function getDisplayName(session: AuthSession | null): string {
  if (!session?.email) return 'User Name';
  return session.email.split('@')[0] || 'User Name';
}
