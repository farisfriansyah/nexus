import { z } from "zod";

export const statusSchema = z.enum(["on_target", "warning", "critical", "no_data", "neutral"]);
export type Status = z.infer<typeof statusSchema>;

export const bandDefSchema = z.object({
  status: z.enum(["on_target", "warning", "critical"]),
  min: z.number().nullable(),
  max: z.number().nullable(),
  minInclusive: z.boolean(),
  maxInclusive: z.boolean()
});
export type BandDef = z.infer<typeof bandDefSchema>;

export const indicatorDefSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  label: z.string().min(1),
  unit: z.string(),
  decimals: z.number().int().min(0).max(4),
  direction: z.enum(["LOWER_IS_BETTER", "HIGHER_IS_BETTER", "IN_RANGE", "NEUTRAL"]),
  cadence: z.enum(["REALTIME", "ANALYTIC"]),
  targetValue: z.number().optional(),
  targetText: z.string().optional(),
  bands: z.array(bandDefSchema),
  domain: z.tuple([z.number(), z.number()]).optional(),
  pic: z.string(),
  division: z.string(),
  sourceAsIs: z.string(),
  sourceToBe: z.string().optional(),
  formula: z.string().optional(),
  reason: z.string().optional(),
  entityKey: z.string().optional(),
  parameterKey: z.string().optional(),
  staleAfterSec: z.number().positive().optional(),
  debounce: z.object({ escalateSec: z.number().nonnegative(), deescalateSec: z.number().nonnegative() }).optional()
});
export type IndicatorDef = z.infer<typeof indicatorDefSchema>;

export const trendPointSchema = z.object({ t: z.number(), v: z.number().nullable() });
export const liveReadingSchema = z.object({
  key: z.string(),
  value: z.number().nullable(),
  ts: z.number(),
  trend: z.array(trendPointSchema).min(60)
});
export type LiveReading = z.infer<typeof liveReadingSchema>;

export const monthlyPointSchema = z.object({
  period: z.string().regex(/^\d{4}-\d{2}$/),
  value: z.number().nullable(),
  count: z.number().optional(),
  updatedAt: z.string()
});
export type MonthlyPoint = z.infer<typeof monthlyPointSchema>;

export interface MonthlyRow {
  key: string;
  label: string;
  unit: string;
  value: number | null;
  target: number | null;
  status: Status;
  deltaMoM: number | null;
  series: MonthlyPoint[];
  updatedAt: string;
  done?: number;
  planned?: number;
}

export interface MonthlyPayload {
  period: string;
  rows: MonthlyRow[];
  updatedAt: string;
}

export interface MtbfRow {
  key: string;
  label: string;
  windowDays: number;
  failures: string[];
  count: number;
  daysSinceLast: number | null;
  mtbfDays: number | null;
  status: Status;
  updatedAt: string;
}
export interface MtbfPayload { period: string; rows: MtbfRow[]; updatedAt: string }

export interface SafetyPayload {
  lastIncidentDate: string | null;
  daysSince: number | null;
  casesThisMonth: number | null;
  target: number;
  status: Status;
  updatedAt: string;
}

export const scenarios = ["normal", "mixed", "all-critical", "all-nodata", "stale"] as const;
export type Scenario = (typeof scenarios)[number];
export const DEFAULT_SCENARIO: Scenario = "mixed";

export function parseScenario(value: string | null | undefined): Scenario {
  return (scenarios as readonly string[]).includes(value ?? "") ? (value as Scenario) : DEFAULT_SCENARIO;
}

export interface OpsDataset {
  scenario: Scenario;
  generatedAt: number;
  monthly: Record<string, MonthlyPoint[]>;
  extras: Record<string, { done?: number; planned?: number }>;
  mtbf: Record<string, { failures: string[]; updatedAt: string; noData?: boolean }>;
  safety: { lastIncidentDate: string | null; casesThisMonth: number | null; updatedAt: string };
}
