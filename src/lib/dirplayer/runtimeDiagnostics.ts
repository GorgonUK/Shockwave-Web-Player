/**
 * PHASE 1 — DirPlayer script errors originate in the WASM VM; the JS bundle
 * forwards them via `onScriptError` → Redux and `alert(\`Script error: ${message}\`)`
 * (see polyfill ~5226052). The message string is assembled in Rust — we do not
 * ship its source in this repo. We parse common patterns from the alert/console text.
 *
 * Built-in handlers: resolved inside vm_rust when executing Lingo bytecode. A call
 * like `getPos(...)` is dispatched to a registry; "No built-in handler" means the
 * emulator has no implementation for that symbol yet — not something our React
 * shell can fix without a DirPlayer (Rust) change or an official extension API.
 *
 * Hypothesis for `getPos` (document only — verify against your movie’s scripts):
 * - Not a canonical Lingo keyword in classic docs (sprites use `loc`, `locH`, `locV`).
 * - May be a game-specific helper, Xtra, or D7+ API name surfaced as a "built-in"
 *   slot in this VM. Arguments `[...]` suggest a list/point/tuple — could be
 *   mouse, sprite channel, or scroll position depending on the game.
 * - Feasibility of a JS shim: **not without** DirPlayer exposing a hook to register
 *   bytecode builtins. Do not fake return values here.
 */

export type MovieUrlKind = 'upload-sw-proxy' | 'upload-blob-raw' | 'hosted-http' | 'unknown';

export function inferMovieUrlKind(effectiveDcrUrl: string): MovieUrlKind {
  if (effectiveDcrUrl.includes('/__dirplayer-blob/')) return 'upload-sw-proxy';
  if (effectiveDcrUrl.startsWith('blob:')) return 'upload-blob-raw';
  if (/^https?:\/\//i.test(effectiveDcrUrl)) return 'hosted-http';
  return 'unknown';
}

/** Parsed "No built-in handler: name(args)" */
export interface ParsedMissingBuiltin {
  kind: 'missing-builtin';
  /** Identifier after "No built-in handler:" */
  handlerName: string;
  /** Parenthetical / bracket argument text, truncated */
  argsPreview: string;
}

export interface ParsedScriptErrorGeneric {
  kind: 'generic-script';
  summary: string;
}

export type ParsedDirPlayerScriptMessage = ParsedMissingBuiltin | ParsedScriptErrorGeneric;

const MISSING_BUILTIN_RE =
  /No\s+built-?in\s+handler:\s*([A-Za-z_][\w]*)\s*\(([\s\S]*)\)/i;

/**
 * Best-effort parse of DirPlayer script error lines. Tolerant of whitespace.
 */
export function parseDirPlayerScriptMessage(raw: string): ParsedDirPlayerScriptMessage {
  const trimmed = raw.trim();
  const m = trimmed.match(MISSING_BUILTIN_RE);
  if (m?.[1]) {
    const args = (m[2] ?? '').trim();
    const argsPreview = args.length > 400 ? `${args.slice(0, 400)}…` : args;
    return { kind: 'missing-builtin', handlerName: m[1], argsPreview };
  }
  return { kind: 'generic-script', summary: trimmed.length > 500 ? `${trimmed.slice(0, 500)}…` : trimmed };
}

export function classifyPlaybackIssue(
  parsed: ParsedDirPlayerScriptMessage,
): 'missing-builtin' | 'script' | 'unknown' {
  if (parsed.kind === 'missing-builtin') return 'missing-builtin';
  if (parsed.kind === 'generic-script') return 'script';
  return 'unknown';
}
