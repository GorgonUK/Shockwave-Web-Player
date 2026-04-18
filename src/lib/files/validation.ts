import type { AssetKind } from '@/types/assets';

export const ACCEPTED_EXTENSIONS = ['.dcr', '.cct'] as const;
export const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.join(',');

/** 250 MB. Hard ceiling for the upload surface. */
export const MAX_FILE_BYTES = 250 * 1024 * 1024;

export type ValidationResult =
  | { ok: true; kind: AssetKind }
  | { ok: false; reason: string };

export function getExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

export function detectKind(file: File): AssetKind | null {
  const ext = getExtension(file.name);
  if (ext === '.dcr') return 'dcr';
  if (ext === '.cct') return 'cct';
  return null;
}

export function validateFile(file: File): ValidationResult {
  const kind = detectKind(file);
  if (!kind) {
    return {
      ok: false,
      reason: `"${file.name}" is not a Director file. Expected ${ACCEPTED_EXTENSIONS.join(' or ')}.`,
    };
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      reason: `"${file.name}" is too large (max 250 MB).`,
    };
  }
  if (file.size === 0) {
    return { ok: false, reason: `"${file.name}" is empty.` };
  }
  return { ok: true, kind };
}
