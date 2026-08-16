export type RegisterRequest = {
  email: string;
  password: string;
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

/** What we persist locally after a successful login/register. */
export type AuthSession = {
  accessToken: string;
  userId: number | null;
  email: string;
  /** Epoch ms from the JWT `exp` claim, or null when the token carries none. */
  expiresAt: number | null;
};
