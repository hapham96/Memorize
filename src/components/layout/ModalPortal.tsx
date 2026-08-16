'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalPortalProps {
  children: React.ReactNode;
}

/**
 * Renders modal content into `document.body`.
 *
 * `MobileContainer` wraps the whole app in a `backdrop-blur-xl` + `overflow-hidden`
 * card. A backdrop-filter creates a containing block for `position: fixed`
 * descendants, so a modal rendered inside it anchors to the card instead of the
 * viewport and gets clipped by `overflow-hidden`. Portalling to body escapes both.
 *
 * Also locks background scroll while the modal is mounted.
 */
export const ModalPortal: React.FC<ModalPortalProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
};
