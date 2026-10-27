import { defineOpsWidget } from "../_shared/define";
import { PhaseThreeDetail, PhaseThreeWidget } from "../_shared/phase-monitor";

export const opsPhaseT = defineOpsWidget({ id: "ops-phase-t", title: "Fasa 3 · L3 (Fasa T)", component: PhaseThreeWidget, detail: PhaseThreeDetail, pics: ["Ega"] });
