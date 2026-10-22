"use client";

import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { StatusBadge } from "@/widgets/_primitives/status";
import { MetaBlock, ValueTable } from "../_shared/detail";
import { useMtbf } from "./data";

export function Detail() {
  const { payload } = useMtbf();
  if (!payload) return <p className="muted">Memuat…</p>;
  return (
    <div className="detail">
      {payload.rows.map((row) => (
        <section key={row.key} className="detail-block">
          <h3>{getIndicator(row.key).name} <StatusBadge status={row.status} /></h3>
          <p>{row.count} kegagalan dalam {row.windowDays} hari · MTBF {row.mtbfDays === null ? "–" : `${formatFixed(row.mtbfDays, 0)} hari`}</p>
          <ValueTable head={["Tanggal kegagalan"]} rows={[...row.failures].reverse().map((date) => [new Date(date).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })])} />
          <MetaBlock keyName={row.key} />
        </section>
      ))}
    </div>
  );
}
