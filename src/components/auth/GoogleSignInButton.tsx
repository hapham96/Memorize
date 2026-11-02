'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

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

/** Google's four-colour "G", per the sign-in branding guidelines. */
const GoogleLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
  </svg>
);

/**
 * A clay button that looks like the rest of the form, with Google Identity
 * Services' real button laid invisibly over it. GIS only issues an ID token
 * through its own rendered button (an iframe we cannot style), so the click
 * has to land on that iframe — the visible button is decoration underneath.
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
          theme: 'outline',
          size: 'large',
          text: isRegister ? 'signup_with' : 'signin_with',
          shape: 'pill',
          // GIS takes a fixed pixel width (max 400), not a CSS length; matching
          // the visible button's width keeps the whole face clickable.
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

  const label = isRegister ? 'Đăng ký bằng Google' : 'Đăng nhập bằng Google';

  return (
    <div
      className={`group relative w-full ${disabled || !isReady ? 'pointer-events-none' : ''}`}
      aria-busy={!isReady || disabled}
    >
      {/* What the user sees. Hover follows the iframe above it, since hovering a child hovers its ancestors. */}
      <div
        aria-hidden="true"
        className={`w-full py-3.5 rounded-button bg-white dark:bg-slate-800 border-clay border-slate-200 dark:border-slate-700 shadow-clay text-slate-700 dark:text-slate-100 font-semibold text-sm flex items-center justify-center gap-2.5 transition-all ease-clay group-hover:-translate-y-0.5 group-hover:border-blue-300 dark:group-hover:border-blue-500 ${
          disabled || !isReady ? 'opacity-60' : ''
        }`}
      >
        {disabled ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <GoogleLogo className="w-5 h-5" />
        )}
        <span>{label}</span>
      </div>

      {/* The real GIS button: invisible, stretched over the visible one so every click reaches it. */}
      <div
        ref={containerRef}
        title={label}
        className="absolute inset-0 flex items-center justify-center overflow-hidden opacity-[0.01] scale-y-[1.35]"
      />
    </div>
  );
};
