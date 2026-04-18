/**
 * DirPlayer script errors originate in the WASM VM; the browser bundle forwards
 * them through `onScriptError` and then `alert(\`Script error: ${message}\`)`.
 *
 * We now vendor the matching DirPlayer `v0.4.1` source locally. Source inspection
 * shows that `getPos` already exists as a list / prop-list datum handler, but the
 * global built-in dispatch table was missing a `getPos` branch. That means a bare
 * Lingo call like `getPos(list, item)` fell into the built-in fallback even though
 * the underlying list-search logic already existed.
 *
 * For the observed game call shape:
 * - `getPos([#sym1, #sym2, ...], #target)`
 * - first arg is most likely a Director symbol list
 * - second arg is most likely the symbol to search for
 * - return value is most likely a 1-based integer position
 *
 * That makes `getPos` much closer to a generic list-search primitive than any
 * geometry / sprite-position API.
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

export const DIRPLAYER_RUNTIME_TRACE_PREFIX = '[ShockwaveWebPlayerRuntime]';

export interface ParsedDirPlayerRuntimeTrace {
  kind: 'runtime-trace';
  traceKind:
    | 'missing-builtin-fallback'
    | 'getpos-patch-invoked'
    | 'getpos-patch-result'
    | 'unknown';
  handlerName?: string;
  argTypes: string[];
  argsPreview?: string;
  returnType?: string;
  returnValue?: string;
  fields: Record<string, string>;
}

const MISSING_BUILTIN_RE = /No\s+built-?in\s+handler:\s*([A-Za-z_][\w]*)\s*\(([\s\S]*)\)/i;

/**
 * Best-effort parse of DirPlayer script error lines. Tolerant of whitespace.
 */
export function parseDirPlayerScriptMessage(raw: string): ParsedDirPlayerScriptMessage {
  const trimmed = raw.trim();
  const m = trimmed.match(MISSING_BUILTIN_RE);
  if (m?.[1]) {
    const args = (m[2] ?? '').trim();
    const argsPreview = args.length > 400 ? `${args.slice(0, 400)}...` : args;
    return { kind: 'missing-builtin', handlerName: m[1], argsPreview };
  }
  return {
    kind: 'generic-script',
    summary: trimmed.length > 500 ? `${trimmed.slice(0, 500)}...` : trimmed,
  };
}

export function classifyPlaybackIssue(
  parsed: ParsedDirPlayerScriptMessage,
): 'missing-builtin' | 'script' | 'unknown' {
  if (parsed.kind === 'missing-builtin') return 'missing-builtin';
  if (parsed.kind === 'generic-script') return 'script';
  return 'unknown';
}

export function parseDirPlayerRuntimeTraceMessage(raw: string): ParsedDirPlayerRuntimeTrace | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith(DIRPLAYER_RUNTIME_TRACE_PREFIX)) return null;

  const payload = trimmed.slice(DIRPLAYER_RUNTIME_TRACE_PREFIX.length).trim();
  const fields = Object.fromEntries(
    payload
      .split(';')
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const idx = segment.indexOf('=');
        if (idx === -1) return [segment, ''];
        return [segment.slice(0, idx).trim(), segment.slice(idx + 1).trim()];
      }),
  );

  return {
    kind: 'runtime-trace',
    traceKind: normalizeRuntimeTraceKind(fields.kind),
    handlerName: fields.handler || undefined,
    argTypes: fields.argTypes ? fields.argTypes.split('|').filter(Boolean) : [],
    argsPreview: fields.args || undefined,
    returnType: fields.returnType || undefined,
    returnValue: fields.returnValue || undefined,
    fields,
  };
}

function normalizeRuntimeTraceKind(
  rawKind: string | undefined,
): ParsedDirPlayerRuntimeTrace['traceKind'] {
  switch (rawKind) {
    case 'missing_builtin_fallback':
      return 'missing-builtin-fallback';
    case 'getpos_patch_invoked':
      return 'getpos-patch-invoked';
    case 'getpos_patch_result':
      return 'getpos-patch-result';
    default:
      return 'unknown';
  }
}
