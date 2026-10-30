'use client';

import React, { useEffect, useRef, useState } from 'react';

/** Unset → the button is not rendered at all; there is no fake sign-in. */
export const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

/** The slice of Google Identity Services this component calls. */
type GoogleCredentialResponse = { credential?: string };
type GoogleAccountsId = {
  initialize: (config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    context?: 'signin' | 'signup' | 'use';
    itp_support?: boolean;
  }) => void;
  renderButton: (
    parent: HTMLElement,
    options: {
      type?: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
      shape?: 'rectangular' | 'pill' | 'circle' | 'square';
      logo_alignment?: 'left' | 'center';
      width?: number;
      locale?: string;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleAccountsId } };
  }
}

// One load per page, shared across mounts (and Strict Mode's double effect).
let gsiLoader: Promise<GoogleAccountsId> | null = null;

function loadGsi(): Promise<GoogleAccountsId> {
  if (window.google?.accounts?.id) return Promise.resolve(window.google.accounts.id);
  if (gsiLoader) return gsiLoader;

  gsiLoader = new Promise<GoogleAccountsId>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GSI_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      const id = window.google?.accounts?.id;
      if (id) resolve(id);
      else reject(new Error('Google Identity Services loaded without accounts.id'));
    };
    script.onerror = () => reject(new Error('Could not load Google Identity Services'));
    document.head.appendChild(script);
  }).catch((err) => {
    // Let a later mount retry instead of replaying the same failure forever.
    gsiLoader = null;
    throw err;
  });

  return gsiLoader;
}

interface GoogleSignInButtonProps {
  /** Receives the raw ID token; verifying it is the backend's job. */
  onCredential: (idToken: string) => void;
  onLoadError?: () => void;
  isRegister: boolean;
  disabled?: boolean;
}

/**
 * Google's own rendered button (Google Identity Services). It must be Google's
 * markup — the branding rules forbid restyling it into a clay button — so it
 * sits inside a fixed-width box and the theme only picks outline vs. dark.
 */
export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onCredential,
  onLoadError,
  isRegister,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  // GIS keeps the first callback it was given, so it calls through a ref to
  // always reach the latest props.
  const callbackRef = useRef({ onCredential, onLoadError });
  callbackRef.current = { onCredential, onLoadError };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGsi()
      .then((gsi) => {
        const container = containerRef.current;
        if (cancelled || !container) return;

        gsi.initialize({
          client_id: GOOGLE_CLIENT_ID,
          ux_mode: 'popup',
          context: isRegister ? 'signup' : 'signin',
          itp_support: true,
          callback: (response) => {
            if (response.credential) callbackRef.current.onCredential(response.credential);
          },
        });

        container.innerHTML = '';
        gsi.renderButton(container, {
          type: 'standard',
          theme: document.documentElement.classList.contains('dark') ? 'filled_black' : 'outline',
          size: 'large',
          text: isRegister ? 'signup_with' : 'signin_with',
          shape: 'pill',
          logo_alignment: 'center',
          // GIS takes a fixed pixel width (max 400), not a CSS length.
          width: Math.min(400, Math.round(container.getBoundingClientRect().width) || 320),
          locale: 'vi',
        });
        setIsReady(true);
      })
      .catch((err) => {
        console.warn(err);
        if (!cancelled) callbackRef.current.onLoadError?.();
      });

    return () => {
      cancelled = true;
    };
  }, [isRegister]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div
      className={`w-full flex justify-center min-h-[44px] transition-opacity ${
        disabled ? 'opacity-60 pointer-events-none' : ''
      } ${isReady ? '' : 'opacity-0'}`}
      aria-busy={!isReady}
    >
      <div ref={containerRef} className="w-full flex justify-center" />
    </div>
  );
};
