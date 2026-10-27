import type { BandDef, IndicatorDef } from "@/widgets/ops-eng/schemas";

type BandStatus = BandDef["status"];

/** Band: [min, max] dengan flag inklusif; null = tak terbatas. */
export const band = (status: BandStatus, min: number | null, max: number | null, minInclusive = false, maxInclusive = false): BandDef => ({
  status, min, max, minInclusive: min === null ? false : minInclusive, maxInclusive: max === null ? false : maxInclusive
});

/** [ASUMSI] on_target (−∞,T] | warning (T,1.5T] | critical (1.5T,+∞) */
export const downtimeBands = (target: number): BandDef[] => [
  band("on_target", null, target, false, true),
  band("warning", target, Math.round(target * 1.5 * 100) / 100, false, true),
  band("critical", Math.round(target * 1.5 * 100) / 100, null)
];

/** [ASUMSI] on_target (−∞,1] | warning (1,2] | critical (2,+∞) */
export const caseBands = (): BandDef[] => [band("on_target", null, 1, false, true), band("warning", 1, 2, false, true), band("critical", 2, null)];

const monthlyDefaults = { cadence: "ANALYTIC", sourceAsIs: "Jurnal harian" } as const;
const liveDefaults = { cadence: "REALTIME", sourceAsIs: "Plant Vision", staleAfterSec: 120 } as const;

const downtimeFormula = "Jam berhenti tanpa rencana per bulan ÷ total hour counter × 100%";
const downtimeReason = "Menjaga ketersediaan mesin agar target produksi tercapai.";

function downtime(key: string, label: string, target: number, source = "Jurnal harian", extra: Partial<IndicatorDef> = {}): IndicatorDef {
  return {
    key, name: `Downtime ${label}`, label, unit: "%", decimals: 2, direction: "LOWER_IS_BETTER", ...monthlyDefaults, sourceAsIs: source,
    targetValue: target, bands: downtimeBands(target), pic: "Usman", division: "Ops.eng", formula: downtimeFormula, reason: downtimeReason, ...extra
  };
}

function downtimeCases(key: string, label: string, pic: string, division: string): IndicatorDef {
  return {
    key, name: `Downtime ${label}`, label, unit: "kasus", decimals: 0, direction: "LOWER_IS_BETTER", ...monthlyDefaults,
    targetValue: 1, targetText: "≤ 1 kasus / bulan", bands: caseBands(), pic, division,
    formula: "Jumlah kejadian berhenti tanpa rencana per bulan", reason: downtimeReason
  };
}

function mtbf(key: string, label: string, windowDays: number, targetText: string): IndicatorDef {
  return {
    key, name: `MTBF ${label}`, label, unit: "kasus", decimals: 0, direction: "LOWER_IS_BETTER", ...monthlyDefaults, sourceAsIs: "Infinity",
    targetValue: 1, targetText, bands: caseBands(), pic: "Erwina", division: "Ops.eng", entityKey: key,
    formula: `Jumlah kegagalan pada jendela ${windowDays} hari; MTBF = hari pengamatan ÷ jumlah kegagalan`,
    reason: "Memantau keandalan aset kritis."
  };
}

function live(key: string, label: string, unit: string, decimals: number, pic: string, entityKey: string, parameterKey: string, rest: Partial<IndicatorDef>): IndicatorDef {
  return {
    key, name: `${entityKey.toUpperCase()} ${label}`, label, unit, decimals, direction: "IN_RANGE", ...liveDefaults, bands: [], pic, division: "Ops.eng", entityKey, parameterKey, ...rest
  };
}

const reactors = [["sb_ma1", "SB MA1"], ["sb_ma4", "SB MA4"], ["wb_ma1", "WB MA1"], ["wb_ma4", "WB MA4"]] as const;
const compressorUnits = ["sullair", "boge", "kobelco", "hitachi"] as const;
const compressorLabel: Record<(typeof compressorUnits)[number], string> = { sullair: "Sullair", boge: "Boge", kobelco: "Kobelco", hitachi: "Hitachi" };

export const indicators: IndicatorDef[] = [
  downtime("downtime.reaktor.pvac", "Reaktor PVAC", 1),
  downtime("downtime.reaktor.neoprene", "Reaktor Neoprene", 1),
  downtime("downtime.reaktor.acrylic", "Reaktor Acrylic", 1),
  downtime("downtime.packing.autopack", "Autopack", 2, "Jurnal harian (auto pack)"),
  downtime("downtime.packing.opsol", "Opsol", 1, "Jurnal harian (produksi)"),
  downtime("downtime.packing.tgm", "TGM", 1, "Jurnal harian (packing)"),
  downtime("downtime.packing.kentex", "Kentex", 1, "Jurnal harian (packing)"),
  downtimeCases("downtime.utility.boiler", "Boiler", "Usman", "Ops.eng"),
  downtimeCases("downtime.utility.cooling_tower", "Cooling Tower", "Usman", "Ops.eng"),
  downtimeCases("downtime.utility.kompresor", "Kompresor", "Usman", "Ops.eng"),
  downtimeCases("downtime.utility.genset", "Genset", "Usman", "Ops.eng"),
  downtimeCases("downtime.vehicle.armada", "Armada", "Julianto", "Bkl"),
  downtimeCases("downtime.vehicle.forklift", "Forklift", "Julianto", "Bkl"),
  {
    key: "mttr", name: "MTTR", label: "MTTR", unit: "hari", decimals: 0, direction: "LOWER_IS_BETTER", ...monthlyDefaults, sourceAsIs: "Infinity",
    targetValue: 30, targetText: "≤ 30 hari / bulan", pic: "Erwina", division: "Ops.eng",
    bands: [band("on_target", null, 30, false, true), band("warning", 30, 36, false, true), band("critical", 36, null)],
    formula: "Total waktu perbaikan ÷ jumlah perbaikan", reason: "Mengukur kecepatan pemulihan aset."
  },
  mtbf("mtbf.gearbox_reaktor", "Gearbox Reaktor", 365, "≤ 1 kasus / tahun"),
  mtbf("mtbf.kompresor_utility", "Kompresor Utility", 365, "≤ 1 kasus / tahun"),
  mtbf("mtbf.gearpump_filling", "Gearpump Filling", 30, "≤ 1 kasus / bulan"),

  live("panel.volt", "Tegangan", "V", 0, "Ega", "panel", "volt", {
    domain: [365, 415],
    bands: [band("critical", null, 380), band("warning", 380, 387, true), band("on_target", 387, 396, true, true), band("warning", 396, 403), band("critical", 403, null, true)]
  }),
  ...([
    ["r", "Fasa R", "L1"],
    ["s", "Fasa S", "L2"],
    ["t", "Fasa T", "L3"]
  ] as const).flatMap(([phase, label, line]) => [
    live(`panel.phase.${phase}.voltage`, `${label} Tegangan`, "V", 1, "Ega", `panel.phase.${phase}`, "voltage", {
      name: `${line} Tegangan Fasa-N`, domain: [220, 245],
      bands: [band("critical", null, 225), band("warning", 225, 230, true), band("on_target", 230, 240, true, true), band("warning", 240, 243, false, true), band("critical", 243, null)]
    }),
    live(`panel.phase.${phase}.current`, `${label} Arus`, "A", 2, "Ega", `panel.phase.${phase}`, "current", {
      name: `${line} Arus Fasa`, direction: "NEUTRAL", domain: [0, 250], bands: []
    })
  ]),
  live("panel.cos_total", "Cos Total", "", 3, "Ega", "panel", "cos_total", {
    direction: "IN_RANGE", domain: [0, 1],
    bands: [band("critical", null, 0.8), band("warning", 0.8, 0.86, true), band("on_target", 0.86, null, true)]
  }),
  live("panel.cosphi", "Cos φ", "", 2, "Ega", "panel", "cosphi", {
    domain: [0.6, 1],
    // [ASUMSI] batas atas dibuat terbuka agar band tanpa celah
    bands: [band("critical", null, 0.8), band("warning", 0.8, 0.86, true), band("on_target", 0.86, null, true)]
  }),
  live("panel.amp", "Arus", "A", 0, "Ega", "panel", "amp", { direction: "NEUTRAL" }),
  live("panel.kwh", "Energi", "kWh", 1, "Ega", "panel", "kwh", { direction: "NEUTRAL" }),
  live("ct.ma1.temp", "Suhu", "°C", 1, "Rozak", "ct.ma1", "temp", {
    name: "Cooling Tower MA1 Suhu", domain: [25, 45],
    bands: [band("on_target", null, 35, false, true), band("warning", 35, 38), band("critical", 38, null, true)]
  }),
  live("ct.ma4.temp", "Suhu", "°C", 1, "Rozak", "ct.ma4", "temp", {
    name: "Cooling Tower MA4 Suhu", domain: [25, 45],
    bands: [band("on_target", null, 35, false, true), band("warning", 35, 38), band("critical", 38, null, true)]
  }),
  ...reactors.map(([id, label]) => live(`reactor.${id}.temp`, "Suhu", "°C", 1, "Rozak", `reactor.${id}`, "temp", {
    name: `${label} Suhu`, domain: [20, 60],
    bands: [band("on_target", null, 35, false, true), band("warning", 35, 45), band("critical", 45, null, true)]
  })),
  live("boiler.ma4.stack_temp", "Suhu cerobong", "°C", 0, "Dovan", "boiler.ma4", "stack_temp", {
    name: "Boiler MA4 Suhu Cerobong", domain: [150, 260],
    bands: [band("on_target", null, 200, false, true), band("warning", 200, 230, false, true), band("critical", 230, null)]
  }),
  live("boiler.ma4.pressure", "Tekanan", "bar", 2, "Dovan", "boiler.ma4", "pressure", {
    name: "Boiler MA4 Tekanan", domain: [3.5, 5.1], debounce: { escalateSec: 5, deescalateSec: 60 },
    bands: [band("critical", null, 2.5), band("warning", 2.5, 4, true), band("on_target", 4, 4.9, true, true), band("warning", 4.9, 4.95, false, true), band("critical", 4.95, null)]
  }),
  ...compressorUnits.flatMap((unit) => [
    live(`compressor.${unit}.temp`, "Suhu", "°C", 0, "Rozak", `compressor.${unit}`, "temp", {
      name: `Kompresor ${compressorLabel[unit]} Suhu`, domain: [60, 110],
      bands: [band("on_target", null, 90), band("warning", 90, 95, true, true), band("critical", 95, null)]
    }),
    live(`compressor.${unit}.pressure`, "Tekanan", "bar", 1, "Rozak", `compressor.${unit}`, "pressure", {
      name: `Kompresor ${compressorLabel[unit]} Tekanan`, domain: [4.5, 8],
      bands: [band("critical", null, 5), band("warning", 5, 5.2, true, true), band("on_target", 5.2, 6.2, false, true), band("warning", 6.2, 7.2, false, true), band("critical", 7.2, null)]
    })
  ]),

  {
    key: "kalibrasi", name: "Kalibrasi", label: "Kalibrasi", unit: "%", decimals: 0, direction: "HIGHER_IS_BETTER", ...monthlyDefaults,
    targetValue: 70, targetText: "≥ 70% (realisasi vs rencana)", pic: "Dovan", division: "Ops.eng",
    bands: [band("critical", null, 60), band("warning", 60, 70, true), band("on_target", 70, null, true)],
    formula: "Realisasi kalibrasi ÷ rencana kalibrasi × 100%", reason: "Menjamin akurasi instrumen ukur."
  },
  {
    key: "overtime", name: "Overtime", label: "Overtime", unit: "%", decimals: 1, direction: "LOWER_IS_BETTER", ...monthlyDefaults, sourceAsIs: "PGA",
    targetValue: 5, pic: "Usman", division: "Ops.eng",
    bands: [band("on_target", null, 5, false, true), band("warning", 5, 7, false, true), band("critical", 7, null)],
    formula: "Jam overtime ÷ jam kerja normal × 100%", reason: "Mengendalikan beban kerja dan biaya tenaga kerja."
  },
  {
    key: "k3.kecelakaan", name: "Kecelakaan Kerja", label: "Kecelakaan", unit: "kasus", decimals: 0, direction: "LOWER_IS_BETTER", ...monthlyDefaults, sourceAsIs: "K3",
    targetValue: 0, pic: "Usman", division: "Ops.eng & Bkl",
    // [ASUMSI] kasus bulat: (−∞,0] dan (0,+∞) agar tanpa celah
    bands: [band("on_target", null, 0, false, true), band("critical", 0, null)],
    formula: "Jumlah kecelakaan kerja", reason: "Zero accident."
  },
  {
    key: "maintenance_cost", name: "Maintenance Cost", label: "Maintenance Cost", unit: "Rp/kg", decimals: 2, direction: "NEUTRAL", ...monthlyDefaults, sourceAsIs: "FAA",
    targetText: "Kebijakan Top Mgmt", pic: "Usman", division: "Ops.eng", bands: [],
    formula: "Biaya maintenance ÷ kg produksi", reason: "Target belum ditetapkan."
  }
];

export const indicatorByKey: ReadonlyMap<string, IndicatorDef> = new Map(indicators.map((def) => [def.key, def]));

export function getIndicator(key: string): IndicatorDef {
  const def = indicatorByKey.get(key);
  if (!def) throw new Error(`Indikator tidak dikenal: ${key}`);
  return def;
}

export const liveKeys = indicators.filter((def) => def.cadence === "REALTIME").map((def) => def.key);
export const monthlyKeys = indicators.filter((def) => def.cadence === "ANALYTIC").map((def) => def.key);
export const compressorIds = compressorUnits;
export const compressorNames = compressorLabel;
