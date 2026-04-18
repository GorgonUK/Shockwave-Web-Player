/**
 * Placeholder for game-specific compatibility hooks (example: "Trick or Treat Beat").
 *
 * Observed failure: `No built-in handler: getPos(...)` after the start screen renders.
 * That message is produced inside DirPlayer (Rust/WASM); there is no JS registration
 * API in the polyfill bundle today, so we cannot implement `getPos` correctly from
 * the shell without upstream support.
 *
 * When/if the polyfill exposes builtin registration, add `onMissingBuiltin` here
 * with a documented return shape — until then, leave shims unset and rely on
 * runtime diagnostics + README notes.
 */

import { registerCompatibilityPatch } from './registry';

registerCompatibilityPatch({
  id: 'trick-or-treat-beat-getpos-note',
  description:
    'Tracks known missing built-in getPos for local testing; does not patch the VM.',
  matchMovieName: (name) => {
    const n = name.toLowerCase();
    return n === 'game.dcr' || n.endsWith('/game.dcr') || n.endsWith('\\game.dcr');
  },
  missingHandler: 'getPos',
});
