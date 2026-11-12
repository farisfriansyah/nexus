import { defineOpsWidget } from "../_shared/define";
import { TravoEnergyDetail, TravoEnergyWidget } from "../_shared/phase-monitor";

export const opsTravoEnergy = defineOpsWidget({ id: "ops-travo-energy", title: "Total Energi Aktif", component: TravoEnergyWidget, detail: TravoEnergyDetail, pics: ["Ega"] });
