"use client";

import { ScrollArea } from "radix-ui";
import { getIndicator } from "@/config/ops-eng/indicators";
import { formatFixed } from "@/lib/format";
import { evaluateStatus } from "@/lib/status/engine";
import { thresholdSentences } from "@/lib/status/describe";
import { monthLabel, periodLabel } from "@/lib/status/time";
import { liveHistory24h } from "@/mocks/ops-eng/live";
import { StatusBadge } from "@/widgets/_primitives/status";
import { TrendChart } from "@/widgets/_primitives/trend-chart";
import type { Status } from "@/widgets/ops-eng/schemas";
import { useScenario } from "./data";
import { useMonthly, useMounted, useUnits } from "./hooks";
import "./detail.css";

export function MetaBlock({ keyName }: { keyName: string }) {
  const def = getIndicator(keyName);
  const rows: [string, string | undefined][] = [
    ["PIC", def.pic], ["Divisi", def.division], ["Sumber data", def.sourceToBe ? `${def.sourceAsIs} → ${def.sourceToBe}` : def.sourceAsIs],
    ["Target", def.targetText ?? (def.targetValue !== undefined ? `${def.targetValue} ${def.unit}` : undefined)], ["Formula", def.formula], ["Alasan", def.reason]
  ];
  const sentences = thresholdSentences(def);
  return (
    <div className="dmeta">
      <dl>{rows.filter(([, value]) => value).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {sentences.length > 0 && <ul className="dthresholds">{sentences.map((sentence) => <li key={sentence}>{sentence}</li>)}</ul>}
    </div>
  );
}

export function ValueTable({ head, rows }: { head: string[]; rows: (string | React.ReactNode)[][] }) {
  return (
    <ScrollArea.Root className="dtable-root">
      <ScrollArea.Viewport className="dtable-viewport">
        <table className="dtable">
          <thead><tr>{head.map((cell) => <th key={cell}>{cell}</th>)}</tr></thead>
          <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </ScrollArea.Viewport>
      <ScrollArea.Scrollbar orientation="vertical" className="dscroll"><ScrollArea.Thumb className="dscroll-thumb" /></ScrollArea.Scrollbar>
    </ScrollArea.Root>
  );
}

export function MonthlyDetail({ keys }: { keys: string[] }) {
  const { payload } = useMonthly(keys);
  if (!payload) return <p className="muted">Memuat…</p>;
  return (
    <div className="detail">
      <p className="muted">Periode: {periodLabel(payload.period)} (12 bulan terakhir)</p>
      {payload.rows.map((row) => {
        const def = getIndicator(row.key);
        return (
          <section key={row.key} className="detail-block">
            <h3>{def.name} <StatusBadge status={row.status} /></h3>
            <TrendChart kind="bar" unit={def.unit} bands={def.bands} targetValue={def.targetValue} format={(value) => formatFixed(value, def.decimals > 1 ? 1 : def.decimals)}
              points={row.series.map((point) => ({ label: monthLabel(point.period), value: point.value }))} />
            <ValueTable head={["Bulan", `Nilai (${def.unit})`, "Status"]}
              rows={[...row.series].reverse().map((point) => [monthLabel(point.period), formatFixed(point.value, def.decimals), <StatusBadge key={point.period} status={evaluateStatus(def, point.value)} compact />])} />
            <MetaBlock keyName={row.key} />
          </section>
        );
      })}
    </div>
  );
}

export function LiveDetail({ keys }: { keys: string[] }) {
  const scenario = useScenario();
  const mounted = useMounted();
  if (!mounted) return <p className="muted">Memuat…</p>;
  return (
    <div className="detail">
      <p className="muted">Riwayat 24 jam terakhir (interval 5 menit, data simulasi)</p>
      {keys.map((key) => {
        const def = getIndicator(key);
        const history = liveHistory24h(key, scenario);
        const values = history.map((point) => point.v).filter((value): value is number => value !== null);
        const statuses = history.map((point) => evaluateStatus(def, point.v));
        const share = (status: Status) => (statuses.length ? Math.round((statuses.filter((item) => item === status).length / statuses.length) * 100) : 0);
        const avg = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
        return (
          <section key={key} className="detail-block">
            <h3>{def.name}</h3>
            <TrendChart unit={def.unit} bands={def.bands} domain={def.domain} format={(value) => formatFixed(value, def.decimals)}
              points={history.map((point, index) => ({ label: index % 36 === 0 ? new Date(point.t).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "", value: point.v }))} />
            <dl className="dstats">
              <div><dt>Min</dt><dd>{formatFixed(values.length ? Math.min(...values) : null, def.decimals)} {def.unit}</dd></div>
              <div><dt>Maks</dt><dd>{formatFixed(values.length ? Math.max(...values) : null, def.decimals)} {def.unit}</dd></div>
              <div><dt>Rata-rata</dt><dd>{formatFixed(avg, def.decimals)} {def.unit}</dd></div>
              <div><dt>% On target</dt><dd>{share("on_target")}%</dd></div>
              <div><dt>% Warning</dt><dd>{share("warning")}%</dd></div>
              <div><dt>% Critical</dt><dd>{share("critical")}%</dd></div>
            </dl>
            <MetaBlock keyName={key} />
          </section>
        );
      })}
    </div>
  );
}

export function UnitsDetail() {
  const { units } = useUnits();
  return (
    <div className="detail">
      <ValueTable head={["Unit", "Grup", "PIC", "Status"]} rows={units.map((unit) => [unit.label, unit.group, unit.pic, <StatusBadge key={unit.id} status={unit.status} />])} />
    </div>
  );
}
