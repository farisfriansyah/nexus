// Membuat folder widget baru.
//   pnpm new:widget <id> "<Judul>" [PIC] [--tab <tab>] [--also <tab1,tab2|*>]
// Contoh:
//   pnpm new:widget energy-trend "Tren Energi" Ega
//   pnpm new:widget oee "OEE" Budi --tab plant-kpi
//   pnpm new:widget water-pressure "Tekanan Air" Rozak --tab ops-eng --also plant-kpi,reserved
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const TABS = { "plant-kpi": "plantKpiWidgets", "produksi-packing": "produksiPackingWidgets", "ops-eng": "opsEngWidgets", reserved: "reservedWidgets" };

const args = process.argv.slice(2);
const flags = {};
const positional = [];
for (let i = 0; i < args.length; i += 1) {
  if (args[i].startsWith("--")) flags[args[i].slice(2)] = args[++i];
  else positional.push(args[i]);
}
const [rawId, title, pic = "TBD"] = positional;
const tab = flags.tab ?? "ops-eng";
const also = (flags.also ?? "").split(",").map((value) => value.trim()).filter(Boolean);

function fail(message) {
  console.error(message);
  process.exit(1);
}
if (!rawId || !title || !/^[a-z0-9-]+$/.test(rawId)) fail('Pemakaian: pnpm new:widget <id-kebab-case> "<Judul>" [PIC] [--tab <tab>] [--also <tab,tab|*>]');
if (!TABS[tab]) fail(`Tab tidak dikenal: ${tab}. Pilihan: ${Object.keys(TABS).join(", ")}`);
for (const other of also) if (other !== "*" && !TABS[other]) fail(`Tab --also tidak dikenal: ${other}`);

const isOps = tab === "ops-eng";
const id = isOps ? `ops-${rawId}` : rawId;
const camel = id.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const root = join("src", "widgets", tab);
const dir = join(root, id);
if (existsSync(dir)) fail(`Folder sudah ada: ${dir}`);
const cls = `w-${rawId}`;
const tabsLine = also.length ? `, tabs: ${JSON.stringify(also)}` : "";

mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "widget.tsx"), `"use client";

import "./widget.css";
import { WidgetCard } from "@/widgets/_primitives/widget-card";
import type { WidgetProps } from "@/features/widgets-registry/types";

export function Widget({ mode, widgetId, title }: WidgetProps) {
  return (
    <WidgetCard mode={mode} widgetId={widgetId} title={title}>
      <div className="${cls}">Isi widget</div>
    </WidgetCard>
  );
}

export function Detail() {
  return <p>Detail ${title} belum dibuat.</p>;
}
`);
writeFileSync(join(dir, "widget.css"), `/* Gaya khusus widget ini. Awali class dengan ".${cls}" agar tidak bentrok. */\n.${cls} { display: grid; place-items: center; }\n`);

writeFileSync(join(dir, "index.ts"), isOps
  ? `import { defineOpsWidget } from "../_shared/define";
import { Detail, Widget } from "./widget";

export const ${camel} = defineOpsWidget({ id: "${id}", title: ${JSON.stringify(title)}, component: Widget, detail: Detail, pics: [${JSON.stringify(pic)}]${tabsLine} });
`
  : `import { defineWidget } from "@/widgets/_shared/define";
import { Detail, Widget } from "./widget";

export const ${camel} = defineWidget({ id: "${id}", tab: "${tab}", title: ${JSON.stringify(title)}, component: Widget, detail: Detail, pics: [${JSON.stringify(pic)}]${tabsLine} });
`);

// Daftarkan di index tab; placeholder dengan id yang sama dihapus.
const indexPath = join(root, "index.ts");
let index = readFileSync(indexPath, "utf8");
index = index.replace(new RegExp(`\\[\\s*"${id}"\\s*,\\s*"[^"]*"\\s*\\]\\s*,?\\s*`), "");
index = `import { ${camel} } from "./${id}";\n` + index;
const list = new RegExp(`(export const ${TABS[tab]}[^=]*=\\s*\\[)`);
if (!list.test(index)) fail(`Daftar ${TABS[tab]} tidak ditemukan di ${indexPath}; daftarkan manual.`);
index = index.replace(list, `$1\n  ${camel},`);
writeFileSync(indexPath, index);

console.log(`Widget dibuat di ${dir} dan didaftarkan di ${indexPath}.`);
console.log(`Langkah terakhir: tambahkan "${id}" lewat TV > Edit layout.`);
if (also.length) console.log(`Widget juga tersedia di tab: ${also.join(", ")}.`);
