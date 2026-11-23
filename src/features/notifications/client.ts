"use client";

import { useQuery } from "@tanstack/react-query";
import type { listNotifications, NotificationUpdate } from "./store";

export type NotificationPage = Awaited<ReturnType<typeof listNotifications>>;
export type Notification = NotificationPage["items"][number];

export function useNotifications(before?: number) {
  return useQuery({
    queryKey: ["notifications", before ?? null],
    queryFn: async (): Promise<NotificationPage> => {
      const response = await fetch(`/api/notifications${before ? `?before=${before}` : ""}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Gagal memuat notifikasi");
      return response.json();
    },
    refetchInterval: 10_000
  });
}

export async function changeNotifications(update: NotificationUpdate): Promise<void> {
  const response = await fetch("/api/notifications", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(update)
  });
  if (!response.ok) {
    const body = await response.json() as { error?: string };
    throw new Error(body.error ?? "Gagal memperbarui notifikasi");
  }
}
