import type { BandDef } from "@/widgets/ops-eng/schemas";

const overrides = new Map<string, BandDef[]>();
const listeners = new Set<() => void>();
let revision = 0;

export function getIndicatorBandsOverride(key: string): BandDef[] | undefined {
  return overrides.get(key);
}

export function getIndicatorThresholdRevision(): number {
  return revision;
}

export function subscribeIndicatorThresholds(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function applyIndicatorThresholds(entries: readonly { key: string; bands: BandDef[] }[]): void {
  let changed = false;
  for (const entry of entries) {
    const previous = overrides.get(entry.key);
    if (!previous || JSON.stringify(previous) !== JSON.stringify(entry.bands)) {
      overrides.set(entry.key, entry.bands);
      changed = true;
    }
  }
  if (!changed) return;
  revision += 1;
  listeners.forEach((listener) => listener());
}
