import {
  AuthResponse,
  AuthSession,
  JwtPayload,
  LoginRequest,
  ProfileResponse,
  RegisterRequest,
  UpdatePasswordRequest,
} from "@/types/auth";
import { clearAuthSession, loadAuthSession, saveAuthSession } from "@/lib/storage";
import { getAsync, patchAsync, postAsync } from "./client";

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
    name: null,
    expiresAt: claims?.exp ? claims.exp * 1000 : null,
  };
}

/** The account behind the bearer token — the only source of the user's name. */
export async function getProfile(): Promise<ProfileResponse> {
  return getAsync<ProfileResponse>('/users/profile', { auth: true });
}

/**
 * Folds `GET /users/profile` into the stored session. The JWT carries only
 * `sub`, so the name — and an authoritative email — can come from nowhere else.
 *
 * Failure is non-fatal: the token already authenticates every later call, so a
 * missed profile only costs the display name, which falls back to the email
 * local-part. The session must already be persisted before this runs, because
 * the request reads its bearer token back out of storage.
 */
async function withProfile(session: AuthSession): Promise<AuthSession> {
  try {
    const profile = await getProfile();
    const enriched: AuthSession = {
      ...session,
      userId: typeof profile.userId === 'number' ? profile.userId : session.userId,
      email: profile.email?.trim() || session.email,
      name: profile.name?.trim() || session.name,
    };
    saveAuthSession(enriched);
    return enriched;
  } catch (e) {
    console.warn('Could not load the profile, keeping the token claims only:', e);
    return session;
  }
}

export async function register(payload: RegisterRequest): Promise<AuthSession> {
  const response = await postAsync<AuthResponse>('/auth/register', payload);
  const session = toAuthSession(response.accessToken, payload.email);
  saveAuthSession(session);
  return withProfile(session);
}

export async function login(payload: LoginRequest): Promise<AuthSession> {
  const response = await postAsync<AuthResponse>('/auth/login', payload);
  const session = toAuthSession(response.accessToken, payload.email);
  saveAuthSession(session);
  return withProfile(session);
}

/**
 * Re-reads the profile for a session restored from storage, so a name changed
 * elsewhere shows up on this device. Returns null when nobody is signed in.
 */
export async function refreshProfile(): Promise<AuthSession | null> {
  const session = loadAuthSession();
  if (!session) return null;
  return withProfile(session);
}

/**
 * Writes the display name back through `PATCH /users/name` — the one endpoint
 * that can change it — and folds the result into the stored session so the
 * header, profile and avatar all follow without another `/users/profile` read.
 *
 * The response shape is not in `/api-json`, so it is only trusted where it
 * actually carries a value; otherwise the name we just sent stands. Returns
 * null when nobody is signed in, which can only happen if the session was
 * cleared (401) while the request was in flight.
 */
export async function updateName(name: string): Promise<AuthSession | null> {
  const trimmed = name.trim();
  const response = await patchAsync<Partial<ProfileResponse> | null>(
    '/users/name',
    { name: trimmed },
    { auth: true },
  );

  const session = loadAuthSession();
  if (!session) return null;

  const updated: AuthSession = {
    ...session,
    userId: typeof response?.userId === 'number' ? response.userId : session.userId,
    email: response?.email?.trim() || session.email,
    name: response?.name?.trim() || trimmed,
  };
  saveAuthSession(updated);
  return updated;
}

/**
 * `PATCH /users/password`. The current password is verified server-side, so a
 * wrong one comes back as a failure envelope (401/422) and is shown as-is.
 * The token is unchanged by a password change — there is nothing to re-store.
 */
export async function updatePassword(payload: UpdatePasswordRequest): Promise<void> {
  await patchAsync<unknown>('/users/password', payload, { auth: true });
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
 * Numeric user id for endpoints that still take one explicitly. Null when there
 * is no session, or when the token carried no numeric `sub` — callers must not
 * invent an id, or one account would write against another's data.
 */
export function getCurrentUserId(): number | null {
  return loadAuthSession()?.userId ?? null;
}

/**
 * The account's name from `GET /users/profile`, falling back to the email
 * local-part when the profile call has not answered (or failed).
 */
export function getDisplayName(session: AuthSession | null): string {
  const name = session?.name?.trim();
  if (name) return name;
  if (!session?.email) return 'User Name';
  return session.email.split('@')[0] || 'User Name';
}
