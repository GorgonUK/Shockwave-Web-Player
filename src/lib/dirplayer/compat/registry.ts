import type { CompatibilityRegistration } from './types';

const registrations: CompatibilityRegistration[] = [];

export function registerCompatibilityPatch(reg: CompatibilityRegistration): void {
  registrations.push(reg);
}

export function getCompatibilityRegistrations(): readonly CompatibilityRegistration[] {
  return registrations;
}

/** Registrations that target this movie + missing built-in symbol (both must match). */
export function findHandlersForMissingBuiltin(
  movieFileName: string,
  handlerName: string,
): CompatibilityRegistration[] {
  return registrations.filter(
    (r) =>
      r.matchMovieName(movieFileName) &&
      r.missingHandler != null &&
      r.missingHandler.toLowerCase() === handlerName.toLowerCase(),
  );
}
