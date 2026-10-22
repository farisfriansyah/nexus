"use client";

import { StatusBadge } from "@/widgets/_primitives/status";
import { MetaBlock } from "../_shared/detail";
import { useSafety } from "./data";

export function Detail() {
  const { payload } = useSafety();
  if (!payload) return <p className="muted">Memuat…</p>;
  return (
    <div className="detail">
      <section className="detail-block">
        <h3>Keselamatan Kerja <StatusBadge status={payload.status} /></h3>
        <dl className="dstats">
          <div><dt>Hari tanpa kecelakaan</dt><dd>{payload.daysSince ?? "–"}</dd></div>
          <div><dt>Kasus bulan ini</dt><dd>{payload.casesThisMonth ?? "–"}</dd></div>
          <div><dt>Kecelakaan terakhir</dt><dd>{payload.lastIncidentDate ? new Date(payload.lastIncidentDate).toLocaleDateString("id-ID", { dateStyle: "long" }) : "–"}</dd></div>
        </dl>
        <MetaBlock keyName="k3.kecelakaan" />
      </section>
    </div>
  );
}
