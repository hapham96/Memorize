export type RegisterRequest = {
  email: string;
  password: string;
  name: string;
};

export type LoginRequest = {
  email: string;
  password: string;
};

/** POST /auth/register and POST /auth/login both return only the JWT. */
export type AuthResponse = {
  accessToken: string;
};

/** Claims the backend puts in the JWT — `sub` is the numeric user id. */
export type JwtPayload = {
  sub: number;
  iat?: number;
  exp?: number;
};

/** GET /users/profile — the account behind the bearer token. */
export type ProfileResponse = {
  userId: number;
  name: string;
  email: string;
};

/** PATCH /users/name — the only endpoint that writes the display name back. */
export type UpdateNameRequest = {
  name: string;
};

/** PATCH /users/password — the current password is verified server-side. */
export type UpdatePasswordRequest = {
  currentPassword: string;
  newPassword: string;
};

/** What we persist locally after a successful login/register. */
export type AuthSession = {
  accessToken: string;
  userId: number | null;
  email: string;
  /** From `GET /users/profile`; null until that call answers (or if it failed). */
  name: string | null;
  /** Epoch ms from the JWT `exp` claim, or null when the token carries none. */
  expiresAt: number | null;
};
