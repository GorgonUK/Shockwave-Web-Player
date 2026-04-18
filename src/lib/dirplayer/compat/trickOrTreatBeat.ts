/**
 * Placeholder for title-specific compatibility notes.
 *
 * This title historically failed with `No built-in handler: getPos(...)` after
 * the start screen rendered. The actual runtime patch now lives in vendored
 * DirPlayer source (`vendor/dirplayer-rs`), so this registry entry remains only
 * as a title matcher for diagnostics and future investigation.
 */

import { registerCompatibilityPatch } from './registry';

registerCompatibilityPatch({
  id: 'trick-or-treat-beat-getpos-note',
  description:
    'Tracks the historical getPos compatibility gap for this title; VM patch now lives in vendored DirPlayer source.',
  matchMovieName: (name) => {
    const n = name.toLowerCase();
    return n === 'game.dcr' || n.endsWith('/game.dcr') || n.endsWith('\\game.dcr');
  },
  missingHandler: 'getPos',
});
