'use client';

import { useEffect } from 'react';
import { loadAuthSession } from '@/lib/storage';
import { BATTLE_INVITE_PARAM } from '@/lib/battle';
import { APP_PATH } from '@/lib/site';

/**
 * Sends anyone who belongs in the app straight there: a signed-in user who
 * opened the bare domain (bookmark, old PWA install, a push without a url),
 * and an old-style `/?battle=CODE` invite. The query string is carried over so
 * the invite still opens. Runs after hydration — the session lives in
 * localStorage — so crawlers always get the landing page.
 */
export function SignedInRedirect() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (loadAuthSession() || params.has(BATTLE_INVITE_PARAM)) {
      window.location.replace(`${APP_PATH}${window.location.search}`);
    }
  }, []);

  return null;
}
