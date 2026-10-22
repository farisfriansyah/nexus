import { opsBoiler } from "./ops-boiler";
import { opsCompressorMatrix } from "./ops-compressor-matrix";
import { opsCoolingTower } from "./ops-cooling-tower";
import { opsDowntimePacking } from "./ops-downtime-packing";
import { opsDowntimeReaktor } from "./ops-downtime-reaktor";
import { opsDowntimeUtility } from "./ops-downtime-utility";
import { opsDowntimeVehicle } from "./ops-downtime-vehicle";
import { opsKalibrasi } from "./ops-kalibrasi";
import { opsMaintenanceCost } from "./ops-maintenance-cost";
import { opsMonthlyAttainment } from "./ops-monthly-attainment";
import { opsMtbf } from "./ops-mtbf";
import { opsMttr } from "./ops-mttr";
import { opsOvertime } from "./ops-overtime";
import { opsPanelMeter } from "./ops-panel-meter";
import { opsPressureGauge } from "./ops-pressure-gauge";
import { opsReactorTemp } from "./ops-reactor-temp";
import { opsSafetyCounter } from "./ops-safety-counter";
import { opsStatusSummary } from "./ops-status-summary";

/** Daftar widget tab Ops. Eng — tambahkan widget baru di sini. */
export const opsEngWidgets = [
  opsStatusSummary, opsMonthlyAttainment, opsSafetyCounter,
  opsPanelMeter, opsCoolingTower, opsBoiler, opsCompressorMatrix,
  opsDowntimeReaktor, opsDowntimePacking, opsDowntimeUtility, opsDowntimeVehicle,
  opsMttr, opsMtbf, opsKalibrasi, opsOvertime, opsMaintenanceCost,
  opsPressureGauge, opsReactorTemp
];
