import { useSyncExternalStore } from 'react';

/**
 * Whether Memori may animate. Two things turn it off: the "Hoạt ảnh mascot"
 * setting, pushed in by `applySettingsEffects` like the sound engine's switch,
 * and the OS-level `prefers-reduced-motion`, which always wins.
 *
 * A module singleton rather than a prop because the mascot appears on nearly
 * every screen and the app has no Context — threading one boolean through all
 * of them would touch every component between `page.tsx` and each mascot.
 */
class MascotMotion {
  private settingEnabled = true;
  private reducedMotion = false;
  private listeners = new Set<() => void>();

  constructor() {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.reducedMotion = query.matches;
    query.addEventListener('change', (e) => {
      this.reducedMotion = e.matches;
      this.emit();
    });
  }

  public setEnabled(enabled: boolean) {
    if (this.settingEnabled === enabled) return;
    this.settingEnabled = enabled;
    this.emit();
  }

  public isEnabled = () => this.settingEnabled && !this.reducedMotion;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

export const mascotMotion = new MascotMotion();

/** Server render has no settings or media query to read, so it assumes still. */
export function useMascotMotion(): boolean {
  return useSyncExternalStore(mascotMotion.subscribe, mascotMotion.isEnabled, () => false);
}
