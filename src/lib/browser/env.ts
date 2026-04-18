/**
 * Lightweight browser/environment heuristics. UA sniffing is intentionally
 * minimal — used only for diagnostics and progressive enhancement, never for
 * gating core functionality.
 */

export interface BrowserEnv {
  isBrowser: boolean;
  isIOS: boolean;
  isIPad: boolean;
  isIPhone: boolean;
  isSafari: boolean;
  isMobile: boolean;
  isTouch: boolean;
  supportsFullscreen: boolean;
  prefersReducedMotion: boolean;
  userAgent: string;
  platform: string;
  language: string;
}

export function detectEnv(): BrowserEnv {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      isBrowser: false,
      isIOS: false,
      isIPad: false,
      isIPhone: false,
      isSafari: false,
      isMobile: false,
      isTouch: false,
      supportsFullscreen: false,
      prefersReducedMotion: false,
      userAgent: '',
      platform: '',
      language: '',
    };
  }

  const ua = navigator.userAgent;
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.platform ??
    '';

  const isIPhone = /iPhone/i.test(ua);
  // iPadOS reports as Mac; detect via touch + Mac-like platform.
  const isIPadOS =
    /iPad/i.test(ua) ||
    (/Mac/i.test(platform) && typeof document !== 'undefined' && navigator.maxTouchPoints > 1);
  const isIOS = isIPhone || isIPadOS;
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const isMobile = isIPhone || /Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);

  const docEl = document.documentElement as HTMLElement & {
    webkitRequestFullscreen?: () => void;
  };
  const supportsFullscreen =
    typeof document !== 'undefined' &&
    (Boolean(docEl.requestFullscreen) || Boolean(docEl.webkitRequestFullscreen));

  const prefersReducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return {
    isBrowser: true,
    isIOS,
    isIPad: isIPadOS,
    isIPhone,
    isSafari,
    isMobile,
    isTouch,
    supportsFullscreen,
    prefersReducedMotion,
    userAgent: ua,
    platform,
    language: navigator.language,
  };
}

/** Compact human-readable description for the status bar. */
export function describeBrowser(env: BrowserEnv): string {
  if (!env.isBrowser) return 'Server';
  const platform = env.isIPhone
    ? 'iPhone'
    : env.isIPad
      ? 'iPad'
      : env.isIOS
        ? 'iOS'
        : env.isMobile
          ? 'Mobile'
          : 'Desktop';
  const browser = env.isSafari ? 'Safari' : guessBrowserName(env.userAgent);
  return `${platform} · ${browser}`;
}

function guessBrowserName(ua: string): string {
  if (/Edg\//i.test(ua)) return 'Edge';
  if (/OPR\//i.test(ua)) return 'Opera';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Chrome\//i.test(ua)) return 'Chrome';
  return 'Browser';
}
