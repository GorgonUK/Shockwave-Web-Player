import { detectKind, validateFile } from './validation';

export interface DropAssignment {
  movie: File | null;
  cast: File | null;
  ignored: File[];
  rejected: { file: File; reason: string }[];
  warnings: string[];
}

/**
 * Distribute a multi-file drop into our two slots:
 *  - first valid .dcr  -> movie
 *  - first valid .cct  -> cast
 *  - extras of either kind -> ignored (with a warning)
 *  - unsupported types -> rejected (with a reason)
 */
export function assignDrops(files: File[]): DropAssignment {
  const result: DropAssignment = {
    movie: null,
    cast: null,
    ignored: [],
    rejected: [],
    warnings: [],
  };

  for (const file of files) {
    const validation = validateFile(file);
    if (!validation.ok) {
      result.rejected.push({ file, reason: validation.reason });
      continue;
    }
    const kind = detectKind(file);
    if (kind === 'dcr') {
      if (!result.movie) result.movie = file;
      else result.ignored.push(file);
    } else if (kind === 'cct') {
      if (!result.cast) result.cast = file;
      else result.ignored.push(file);
    }
  }

  if (result.ignored.length > 0) {
    const dcrIgnored = result.ignored.filter((f) => detectKind(f) === 'dcr').length;
    const cctIgnored = result.ignored.filter((f) => detectKind(f) === 'cct').length;
    if (dcrIgnored > 0)
      result.warnings.push(
        `Ignored ${dcrIgnored} extra .dcr file${dcrIgnored > 1 ? 's' : ''} — only one movie can be loaded.`,
      );
    if (cctIgnored > 0)
      result.warnings.push(
        `Ignored ${cctIgnored} extra .cct file${cctIgnored > 1 ? 's' : ''} — only one cast can be loaded.`,
      );
  }

  return result;
}
