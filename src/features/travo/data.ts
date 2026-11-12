"use client";

import { useQuery } from "@tanstack/react-query";
import { travoApiErrorSchema, travoLivePayloadSchema } from "./schema";
import { recordTravoSnapshot } from "./live";

export const TRAVO_POLL_INTERVAL_MS = 5_000;

export async function fetchTravo(unit: number, signal?: AbortSignal) {
  const response = await fetch(`/api/travo/${unit}`, { cache: "no-store", signal });
  if (!response.ok) {
    const body = travoApiErrorSchema.safeParse(await response.json());
    throw new Error(body.success ? body.data.error : `Gagal memuat Travo ${unit} (${response.status})`);
  }

  const payload = travoLivePayloadSchema.parse(await response.json());
  recordTravoSnapshot(payload);
  return payload;
}

export function useTravo(unit: number, enabled = true) {
  return useQuery({
    queryKey: ["travo", unit],
    queryFn: ({ signal }) => fetchTravo(unit, signal),
    enabled,
    refetchInterval: TRAVO_POLL_INTERVAL_MS,
    staleTime: 0,
    retry: 1,
    retryDelay: 1_000
  });
}
