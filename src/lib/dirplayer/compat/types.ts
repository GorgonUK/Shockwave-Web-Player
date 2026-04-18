/**
 * Future game-specific compatibility hooks. Patches run only when a matcher
 * returns true — never globally unless explicitly registered.
 *
 * Real handler implementations belong in DirPlayer (Rust/WASM). This layer is
 * for orchestration, logging, and **future** official extension points if the
 * polyfill adds them.
 */

export interface MovieContext {
  /** e.g. game.dcr */
  movieFileName: string;
  /** Director file version if known */
  movieVersion?: number;
}

export type HandlerShimResult =
  | { applied: false; reason: string }
  | { applied: true; note: string };

/**
 * Reserved for when DirPlayer exposes a way to register builtins from JS.
 * Until then, implementations should remain empty and return `applied: false`.
 */
export type BuiltinShimFn = (
  argsPreview: string,
  ctx: MovieContext,
) => HandlerShimResult | Promise<HandlerShimResult>;

export interface CompatibilityRegistration {
  id: string;
  /** Match movie filename (case-insensitive), suffix, or regex via string test */
  matchMovieName: (name: string) => boolean;
  /** Optional: only run when this handler name is reported missing */
  missingHandler?: string;
  /** Document intent — no silent hacks */
  description: string;
  /** Placeholder — wire when polyfill supports registration */
  onMissingBuiltin?: BuiltinShimFn;
}
