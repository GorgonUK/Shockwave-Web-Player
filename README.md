# Shockwave Web Player

A modern, fully-client-side frontend for playing Adobe Director (`.dcr`) movies in the browser via the [DirPlayer](https://github.com/jeppester/dirplayer) polyfill bundle. Designed for desktop and iPhone / iPad Safari, deployable to Vercel with zero server runtime.

> The runtime polyfill ships separately as a single self-contained JS bundle. This repo contains the launcher / shell — the polyfill is dropped into `public/dirplayer/` and integrated through a single thin abstraction (`src/lib/dirplayer/`).

## Features

- Drag-and-drop or click-to-browse upload of one `.dcr` movie + optional `.cct` external cast
- Polished dark UI with a styled player viewport, status bar, and collapsible diagnostics panel
- Lifecycle state machine: `idle → loading → mounted → error` (plus **playback-issue** when the Director runtime reports a script error), with safe cleanup of object URLs
- Detects whether the polyfill is installed and surfaces the state cleanly (no broken UI when the bundle is missing)
- Fullscreen support where the browser allows it (gracefully disabled on iPhone Safari)
- Mobile-first responsive layout with touch-friendly controls
- Toast notifications, keyboard accessibility, click-to-copy diagnostics dump
- Vercel-ready (`vercel.json` SPA rewrite + cache headers for the polyfill bundle)

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:5173.

```bash
npm run build      # production build → dist/
npm run preview    # serve dist/ locally
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
```

## Where to put the DirPlayer polyfill

The polyfill bundle belongs at:

```
public/dirplayer/dirplayer-polyfill.js
```

It is served at `/dirplayer/dirplayer-polyfill.js` in dev and prod. If you change the filename, update the single constant in [`src/lib/dirplayer/constants.ts`](src/lib/dirplayer/constants.ts):

```ts
export const POLYFILL_SRC = '/dirplayer/dirplayer-polyfill.js';
```

When the file is missing the app does not crash — it shows a calm "DirPlayer polyfill not installed yet" state in the player viewport and the diagnostics panel reports `Script not found (404)`.

## .dcr / .cct flow

```
┌─────────────┐  drop / browse  ┌──────────────────┐  load()  ┌────────────────────┐
│  User files │ ──────────────▶ │  AssetSlots state │ ───────▶ │  DirPlayer adapter │
│ .dcr (req.) │                 │  - movie          │          │ /lib/dirplayer/    │
│ .cct (opt.) │                 │  - cast (cct)     │          │ - loader.ts        │
└─────────────┘                 │  + objectURL      │          │ - mount.ts         │
                                └──────────────────┘          └─────────┬──────────┘
                                                                         │
                                                          window.<runtime>.load_movie_file(url)
                                                                         │
                                                              ┌──────────▼──────────┐
                                                              │  PlayerViewport     │
                                                              │  (the styled host)  │
                                                              └─────────────────────┘
```

`URL.createObjectURL(file)` produces an opaque `blob:` URL. The hook `useObjectUrls` tracks every URL it creates and revokes it on replace / clear / unmount, so there are no leaks.

**Why not pass `blob:` straight into DirPlayer?** The WASM runtime resolves relative paths using Rust’s `url` crate; `blob:` URLs are not valid bases and trigger `RelativeUrlWithCannotBeABaseBase` in `get_base_url`. Before mount, [`ensureWasmSafeDcrUrl`](src/lib/dirplayer/wasmSafeMovieUrl.ts) registers the `File` in the **Cache API** and passes a synthetic same-origin URL like `/__dirplayer-blob/<uuid>/movie.dcr`. The small Service Worker [`public/dirplayer-blob-sw.js`](public/dirplayer-blob-sw.js) serves those requests from the cache (no backend). Service Workers are required for this path; use HTTPS or `localhost`.

### Runtime compatibility (DirPlayer / Lingo gaps)

Even with a valid same-origin movie URL, some titles stop with **script errors** from the emulator — for example `Script error: No built-in handler: getPos(...)`. Those strings originate in the **DirPlayer WASM runtime** (not this React shell). The launcher:

- Intercepts `alert("Script error: …")` via [`runtimeErrorBridge`](src/lib/dirplayer/runtimeErrorBridge.ts) and records structured events.
- Parses messages in [`runtimeDiagnostics`](src/lib/dirplayer/runtimeDiagnostics.ts) (handler name, args preview, classification).
- Sets player status to **playback-issue**, shows a **compatibility banner**, and lists events under **Runtime compatibility** in the diagnostics panel.

**Feasibility:** implementing a missing built-in such as `getPos` correctly belongs in **DirPlayer upstream** unless the polyfill adds an official JS registration API. This repo does not fake VM builtins by default; optional game-specific hooks live under [`src/lib/dirplayer/compat/`](src/lib/dirplayer/compat/) (see `registry.ts`, `trickOrTreatBeat.ts` as a documented placeholder).

### About the `.cct` external cast

Director runtimes typically resolve external casts (e.g. `castLib("sound").preLoad()`) by relative **filename** next to the `.dcr`. Local uploads turn into `blob:` URLs which have no filename and no parent directory — so the runtime cannot satisfy that lookup using the URL alone.

The app keeps the `.cct` file (with its original filename and size) in state and forwards it into `MountConfig.cct` so the future bridge layer has everything it needs. Strategies to fully wire it later:

1. **Virtual filesystem hook** in the polyfill — register the cct under its original name before the movie initializes.
2. **Static hosting mode** — serve assets at predictable paths (e.g. `/games/<slug>/sound.cct`) and pass `basePath: '/games/<slug>/'` to the runtime.
3. **Custom fetch interceptor** — rewrite requests for `sound.cct` to the active blob URL.

A "Compatibility notes" card in the UI explains this for end users.

## What's left to wire

Three TODO blocks live in [`src/lib/dirplayer/dirPlayerMount.ts`](src/lib/dirplayer/dirPlayerMount.ts):

1. **`TODO(DirPlayer) #1` — base path / external cast registry.** Plug in the polyfill's actual API for registering an external cast under its original filename.
2. **`TODO(DirPlayer) #2` — load the `.dcr` movie.** Today we best-effort call `runtime.load_movie_file(url)` / `runtime.loadMovieFile(url)`. Confirm the canonical entry point and remove the dual call.
3. **`TODO(DirPlayer) #3` — stage size + input bridges.** Some bundles auto-attach mouse/keyboard listeners; others want the host page to forward `mouse_down(x, y)`, `key_down(code)`, etc.

Also in [`src/lib/dirplayer/constants.ts`](src/lib/dirplayer/constants.ts):

- `GLOBAL_PROBE_KEYS` is an over-broad list (`DirPlayer`, `dirPlayer`, `__DIRPLAYER__`, `dirplayer`). Once you confirm what global the bundle actually exposes, narrow this to the canonical key.
- Set `REQUIRE_GLOBAL_FOR_READY = true` if "loaded but no global" should be treated as an error rather than ready.

The rest of the app (state machine, UI, lifecycle) does not need to change when you wire the real integration.

## Project structure

```
public/
  dirplayer/
    dirplayer-polyfill.js      ← the runtime bundle
src/
  app/                         ← App shell + providers (no logic)
  components/
    layout/  upload/  player/  diagnostics/  ui/
  hooks/                       ← useDirPlayer, useObjectUrls, useFullscreen, …
  lib/
    dirplayer/                 ← the only place that knows the polyfill API
      compat/                  ← optional game-specific compatibility hooks (registry)
    files/                     ← validation, drop assignment, formatting
    browser/                   ← env detection
    utils/                     ← cn, ids, errors
  types/                       ← assets, player, diagnostics
  styles/globals.css           ← Tailwind v4 entry + design tokens
  main.tsx
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import on Vercel — it autodetects Vite. The included [`vercel.json`](vercel.json) sets the SPA rewrite and adds long-lived cache headers for `/dirplayer/*`.
3. Done. No environment variables, no server runtime needed — everything runs in the user's browser.

## Current limitations

- Real Shockwave playback depends on the polyfill bundle. Without it, the launcher renders a polished placeholder rather than fake playback.
- iPhone Safari blocks element-fullscreen; the viewport simply scales to fit instead.
- iOS Safari requires a user gesture before audio can start — pressing **Load** counts.
- External `.cct` resolution from local uploads is structurally limited (see above).
- Files are kept in memory as `Blob` + object URLs; very large `.dcr` files (>250 MB) are rejected at validation.

## License

MIT — the launcher is yours to adapt. The DirPlayer polyfill bundle is licensed by its respective authors.
