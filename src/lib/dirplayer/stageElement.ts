/**
 * Locate the interactive stage element created by DirPlayer.
 *
 * The upstream runtime uses `#stage_canvas_container`, but local/runtime
 * variants may rename wrappers. We keep a small fallback chain so focus and
 * pointer-size sync continue to work across builds.
 */
export function findDirectorStageElement(root: ParentNode): HTMLElement | null {
  const byKnownId = root.querySelector<HTMLElement>('#stage_canvas_container');
  if (byKnownId) return byKnownId;

  const byAria = root.querySelector<HTMLElement>('[aria-label="stage"], [data-stage-container]');
  if (byAria) return byAria;

  const byLooseId = root.querySelector<HTMLElement>('[id*="stage"][id*="container"]');
  if (byLooseId) return byLooseId;

  const canvas = root.querySelector('canvas');
  if (canvas instanceof HTMLCanvasElement) {
    if (canvas.parentElement instanceof HTMLElement) return canvas.parentElement;
    return canvas;
  }

  return null;
}
