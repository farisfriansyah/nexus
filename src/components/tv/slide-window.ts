export const SLIDE_PRELOAD_RADIUS = 3;

export function mountedSlideIndices(count: number, selected: number, visible: readonly number[]): Set<number> {
  const mounted = new Set<number>();
  if (count === 0) return mounted;

  if (selected >= 0 && selected < count) {
    for (let offset = -SLIDE_PRELOAD_RADIUS; offset <= SLIDE_PRELOAD_RADIUS; offset += 1) {
      mounted.add(((selected + offset) % count + count) % count);
    }
  }
  for (const index of visible) {
    if (index >= 0 && index < count) mounted.add(index);
  }
  return mounted;
}
