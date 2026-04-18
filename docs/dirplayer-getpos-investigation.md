# DirPlayer `getPos` Investigation

## Root cause

The checked-in app originally consumed a static browser bundle at `public/dirplayer/dirplayer-polyfill.js` and treated DirPlayer as a black box. We now vendor the matching upstream runtime source under `vendor/dirplayer-rs/` at the same `v0.4.1` version string embedded in the bundle.

Source inspection shows:

- The browser bundle exposes `window.DirPlayer = { init }` and auto-initializes unless `data-manual-init` is present.
- The bundle does not contain a `getPos` string, which already suggested the missing handler was not wired at the built-in dispatch layer.
- In vendored Rust source, `getPos` already exists for datum handlers:
  - `vm-rust/src/player/handlers/datum_handlers/list_handlers.rs`
  - `vm-rust/src/player/handlers/datum_handlers/prop_list.rs`
- The actual failure is higher up in `vm-rust/src/player/handlers/manager.rs`:
  bare built-in calls are routed through `BuiltInHandlerManager::call_handler()`, which had a `findPos` branch but no `getPos` branch.

That means a Lingo call shaped like `getPos(list, item)` was falling into:

- `No built-in handler: getPos(...)`

even though the list-search logic already existed elsewhere in the VM.

## What `getPos` most likely means here

Observed call shape:

```lingo
getPos([#ts_cn01_01, #ts_cn01_02, ..., #ts_h10_56], #ts_b01)
```

Most likely interpretation:

- First argument is a Director symbol list.
- Second argument is the symbol to search for.
- Return value is a 1-based integer position, or `0` / `VOID` if not found depending on datum type.

Why this is the best fit:

- The first argument is a literal list, not an object with geometric coordinates.
- The second argument is a single symbol target, which matches list membership lookup.
- Vendored list handler implementations already use `position(...) + 1` semantics.
- Vendored prop-list handlers distinguish `findPos` from `getPos`:
  - `findPos` searches by key
  - `getPos` searches by value

So for this title, `getPos` is much more likely to be a list/index helper than any geometry-position API.

## Local patch status

The local patch is intentionally narrow:

- add `getpos` support to `BuiltInHandlerManager::call_handler()`
- route list calls to existing list-search logic
- route prop-list calls to the existing prop-list value-search logic
- emit runtime trace messages when:
  - built-in fallback is reached
  - the local `getPos` patch is invoked
  - the patched handler returns

This is a provisional compatibility patch, not yet a claim that DirPlayer's upstream API surface is complete.

## Follow-up: `getPos` always returning `0` (not found)

After wiring the global `getPos` built-in, runtime traces showed `return: int = 0` on every call while argument types were `list, symbol`.

In `list_handlers.rs`, `find_pos` / `getOne` used [`datum_equals`](../vendor/dirplayer-rs/vm-rust/src/player/compare.rs), which **always returns false for `String` vs `Symbol`**. Director lists can store entries as one type while the search key is the other, so no element matched and the VM reported **not found** (`-1 + 1` → `0`).

**Fix (vendored):** `datum_equals_list_search` in the same file treats string/symbol pairs as equal when the text matches (case-insensitive), and reuses the same symbol/int rule as prop-list lookups. `find_pos`, `get_one`, and `delete_one`’s value fallback now use it.

## Build and switch workflow

1. Vendored source lives at `vendor/dirplayer-rs/`.
2. Rebuild and copy the local browser bundle:

```bash
npm run dirplayer:build-local
```

3. Run the app against the local patched bundle:

```bash
VITE_DIRPLAYER_RUNTIME_SOURCE=local npm run dev
```

4. Switch back to the checked-in upstream bundle:

```bash
VITE_DIRPLAYER_RUNTIME_SOURCE=upstream npm run dev
```

The local build is copied into:

- `public/dirplayer/dirplayer-polyfill.local.js`

The central selection point is:

- `src/lib/dirplayer/constants.ts`
