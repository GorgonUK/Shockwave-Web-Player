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

**Why not pass `blob:` straight into DirPlayer?** The WASM runtime resolves relative paths using Rust’s `url` crate; `blob:` URLs are not valid bases and trigger `RelativeUrlWithCannotBeABaseBase` in `get_base_url`. Before mount, [`ensureWasmSafeBlobSession`](src/lib/dirplayer/wasmSafeMovieUrl.ts) registers the `File` (and optional `.cct` from the Cast slot) in the **Cache API** under one `/__dirplayer-blob/<uuid>/` prefix so relative loads like `sound.cct` resolve next to `movie.dcr`. The small Service Worker [`public/dirplayer-blob-sw.js`](public/dirplayer-blob-sw.js) serves those requests from the cache (no backend). Service Workers are required for this path; use HTTPS or `localhost`.

### Runtime compatibility (DirPlayer / Lingo gaps)

Even with a valid same-origin movie URL, some titles stop with **script errors** from the emulator — for example `Script error: No built-in handler: getPos(...)`. Those strings originate in the **DirPlayer WASM runtime** (not this React shell). The launcher:

- Intercepts `alert("Script error: …")` via [`runtimeErrorBridge`](src/lib/dirplayer/runtimeErrorBridge.ts) and records structured events.
- Parses messages in [`runtimeDiagnostics`](src/lib/dirplayer/runtimeDiagnostics.ts) (handler name, args preview, classification).
- Sets player status to **playback-issue**, shows a **compatibility banner**, and lists events under **Runtime compatibility** in the diagnostics panel.

**Source-level status:** we now vendor the matching DirPlayer `v0.4.1` source and patch the runtime locally at the actual built-in dispatch layer. `getPos` already existed for list and prop-list datum handlers; the missing piece was the global built-in dispatcher, which handled `findPos` but not `getPos`. This remains provisional compatibility work, but it is a real VM patch, not a UI-layer shim.

### About the `.cct` external cast

Director resolves files like `sound.cct` **relative to the movie URL**. For local uploads, add the `.cct` in the **Cast** slot: the app registers it in the same `/__dirplayer-blob/<uuid>/` Cache API session as the `.dcr`, so `fetch(…/sound.cct)` succeeds. Use the filename the game expects (commonly `sound.cct`). For static hosting, you can instead serve the folder at a real path and load the `.dcr` from there without the blob proxy.

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
3. Optional: set **`VITE_DIRPLAYER_RUNTIME_SOURCE=local`** in the project’s environment variables if you want production to use the patched [`public/dirplayer/dirplayer-polyfill.local.js`](public/dirplayer/dirplayer-polyfill.local.js) (e.g. after `npm run dirplayer:build-local` and commit). Default production builds use the stock **`dirplayer-polyfill.js`** because `.env.development` does not apply to `vite build`.
4. Done. No server runtime needed — everything runs in the user's browser.

## Local DirPlayer workflow

The repo now vendors the matching DirPlayer runtime source at:

```text
vendor/dirplayer-rs/
```

The app supports two browser bundle slots:

```text
public/dirplayer/dirplayer-polyfill.js
public/dirplayer/dirplayer-polyfill.local.js
```

- `dirplayer-polyfill.js` is the checked-in upstream bundle.
- `dirplayer-polyfill.local.js` is a locally rebuilt / patched bundle copied from `vendor/dirplayer-rs/dist-polyfill/dirplayer-polyfill.js`.

**Development defaults to the local bundle:** [`.env.development`](.env.development) sets `VITE_DIRPLAYER_RUNTIME_SOURCE=local`, so `npm run dev` loads `/dirplayer/dirplayer-polyfill.local.js` (the patched WASM). Override when comparing against stock upstream:

```bash
VITE_DIRPLAYER_RUNTIME_SOURCE=upstream npm run dev
```

Or copy [`.env.example`](.env.example) to `.env.development.local` (gitignored) and set `VITE_DIRPLAYER_RUNTIME_SOURCE=upstream` there.

The local rebuild workflow is:

```bash
npm run dirplayer:build-local
```

That script:

- installs vendored JS dependencies
- builds the Rust wasm package
- builds the standalone browser polyfill
- copies the result into `public/dirplayer/dirplayer-polyfill.local.js`

Current `getPos` finding:

- source inspection of vendored DirPlayer `v0.4.1` shows `getPos` already exists for list and prop-list datum handlers
- the real gap was the built-in dispatcher in `vm-rust/src/player/handlers/manager.rs`, which handled `findPos` but not `getPos`
- a bare Lingo call like `getPos(list, item)` therefore hit the missing built-in fallback even though the list-search logic already existed

For the observed game call:

```lingo
getPos([#ts_cn01_01, #ts_cn01_02, ..., #ts_h10_56], #ts_b01)
```

the most likely meaning is "find the 1-based position of `#ts_b01` inside the symbol list". That makes it a list/index helper, not a geometry-position API.

The longer investigation note is in [`docs/dirplayer-getpos-investigation.md`](docs/dirplayer-getpos-investigation.md).

### Browser console noise

- **`mobile-web-app-capable`**: [`index.html`](index.html) includes both the standard meta tag and legacy `apple-mobile-web-app-capable` for iOS.
- **`init()` deprecation**: The vendored VM uses wasm-bindgen’s preferred `init({ module_or_path: url })` form (see `VMProvider.tsx`); rebuild the local polyfill after changing vendor code.
- **DirPlayer warnings** such as “Cast … has no CAS* chunk”, “Loading system font”, or font/cast messages come from the **WASM runtime** and reflect how a given `.dcr` references built-in casts — not something the React shell can silence without upstream emulator changes.

## Current limitations

- Real Shockwave playback depends on the polyfill bundle. Without it, the launcher renders a polished placeholder rather than fake playback.
- iPhone Safari blocks element-fullscreen; the viewport simply scales to fit instead.
- iOS Safari requires a user gesture before audio can start — pressing **Load** counts.
- External `.cct` resolution from local uploads is structurally limited (see above).
- Files are kept in memory as `Blob` + object URLs; very large `.dcr` files (>250 MB) are rejected at validation.

## License

MIT — the launcher is yours to adapt. The DirPlayer polyfill bundle is licensed by its respective authors.
