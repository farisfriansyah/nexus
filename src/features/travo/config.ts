export type TravoConfig = { machineId: string; listenerApiPort: string };

export function configForTravoUnit(configs: TravoConfig[], unit: number): TravoConfig | null {
  return Number.isInteger(unit) && unit >= 1 && unit <= 4 ? configs[unit - 1] ?? null : null;
}

export function travoUnitForSlideId(slideId: string): number | null {
  const match = /^(?:travo|phase-monitor-reactor)-([1-4])$/.exec(slideId);
  return match ? Number(match[1]) : null;
}
