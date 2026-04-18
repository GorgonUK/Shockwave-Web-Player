/**
 * Preflight check for bytes the DirPlayer WASM will parse as RIFX.
 * Must stay aligned with `DirectorFile::read` in vendor/dirplayer-rs/.../director/file.rs.
 */

/** Same packing as Rust `FOURCC` in vm-rust `director/utils.rs`. */
function directorFourCc(code: string): number {
  if (code.length !== 4) {
    throw new Error(`directorFourCc: expected 4 chars, got ${code.length}`);
  }
  const c0 = code.charCodeAt(0);
  const c1 = code.charCodeAt(1);
  const c2 = code.charCodeAt(2);
  const c3 = code.charCodeAt(3);
  return c3 | (c2 << 8) | (c1 << 16) | (c0 << 24);
}

function fourCcToAscii(n: number): string {
  return String.fromCharCode(
    (n >>> 24) & 0xff,
    (n >>> 16) & 0xff,
    (n >>> 8) & 0xff,
    n & 0xff,
  );
}

function isPrintableFourCc(n: number): boolean {
  for (const shift of [24, 16, 8, 0] as const) {
    const b = (n >> shift) & 0xff;
    const ok = b === 9 || b === 10 || b === 13 || (b >= 0x20 && b <= 0x7e);
    if (!ok) return false;
  }
  return true;
}

const RIFX = directorFourCc('RIFX');
const XFIR = directorFourCc('XFIR');
const MV93 = directorFourCc('MV93');
const MC95 = directorFourCc('MC95');
const MV95 = directorFourCc('MV95');
const FGDM = directorFourCc('FGDM');
const FGDC = directorFourCc('FGDC');

const SUPPORTED_CODECS = new Set([MV93, MC95, MV95, FGDM, FGDC]);

export type ValidateDirectorMovieResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Read the first bytes of an uploaded file and verify RIFX header + known codec.
 * Catches HTML/text or corrupt files before mounting the player.
 */
export async function validateDirectorMovieMagic(file: File): Promise<ValidateDirectorMovieResult> {
  const buf = await file.slice(0, 16).arrayBuffer();
  if (buf.byteLength < 12) {
    return {
      ok: false,
      message:
        'That file is too small to be a Shockwave Director movie (.dcr). Check that you selected the real game file.',
    };
  }

  const v = new DataView(buf);
  const meta = v.getUint32(0, false);

  let codec: number;
  if (meta === XFIR) {
    codec = v.getUint32(8, true);
  } else if (meta === RIFX) {
    codec = v.getUint32(8, false);
  } else {
    return {
      ok: false,
      message: `This does not look like a Director movie: the file should start with a RIFX header, but the first bytes decode as “${fourCcToAscii(meta)}”. It may be HTML, a text error page, or the wrong file — not a binary .dcr.`,
    };
  }

  if (SUPPORTED_CODECS.has(codec)) {
    return { ok: true };
  }

  const tag = fourCcToAscii(codec);
  let hint = `The RIFX “movie type” field is “${tag}” (0x${codec.toString(16).padStart(8, '0')}), which this player does not support.`;

  if (isPrintableFourCc(codec)) {
    hint +=
      ' Those bytes look like plain text (often a fragment of English), so the file is probably not a valid binary .dcr — it may be corrupted, an incomplete download, or a page saved with a .dcr extension.';
  }

  return { ok: false, message: hint };
}
