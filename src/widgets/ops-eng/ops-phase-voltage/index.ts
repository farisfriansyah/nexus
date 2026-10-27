import { defineOpsWidget } from "../_shared/define";
import { VoltageTrendDetail, VoltageTrendWidget } from "../_shared/phase-monitor";

export const opsPhaseVoltage = defineOpsWidget({ id: "ops-phase-voltage", title: "Tegangan Fasa", component: VoltageTrendWidget, detail: VoltageTrendDetail, pics: ["Ega"] });
