import { z } from "zod";

const readingValueSchema = z.union([z.string().min(1), z.number().finite()]);

export const travoPhaseSchema = z.object({
  v: readingValueSchema,
  i: readingValueSchema,
  kw: readingValueSchema,
  pf: readingValueSchema,
  vl: readingValueSchema,
  vbar: readingValueSchema,
  ibar: readingValueSchema
});

export const travoWeightSchema = z.object({
  energy: readingValueSchema,
  pt: readingValueSchema,
  pft: readingValueSchema,
  freq: readingValueSchema,
  dem: readingValueSchema,
  l1: travoPhaseSchema,
  l2: travoPhaseSchema,
  l3: travoPhaseSchema,
  Zpt: readingValueSchema,
  Zqt: readingValueSchema,
  Zst: readingValueSchema,
  imbalance: readingValueSchema
});

export const travoApiPayloadSchema = z.object({
  rawWeight: travoWeightSchema,
  processedWeight: travoWeightSchema,
  timestamp: z.string().datetime({ offset: true })
});

export const travoLivePayloadSchema = travoApiPayloadSchema.extend({
  unit: z.number().int().min(1).max(4),
  machineId: z.string().min(1),
  port: z.string().regex(/^\d+$/)
});

export const travoApiErrorSchema = z.object({ error: z.string().min(1) });

export type TravoPhase = z.infer<typeof travoPhaseSchema>;
export type TravoWeight = z.infer<typeof travoWeightSchema>;
export type TravoLivePayload = z.infer<typeof travoLivePayloadSchema>;
