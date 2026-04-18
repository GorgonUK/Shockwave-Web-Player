export function toErrorMessage(err: unknown, fallback = 'Unknown error'): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err) {
    const m = (err as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return fallback;
}

export function describeError(err: unknown): string {
  if (err instanceof Error && err.stack) return err.stack;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}
