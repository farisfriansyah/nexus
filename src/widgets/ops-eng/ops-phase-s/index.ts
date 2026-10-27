import { defineOpsWidget } from "../_shared/define";
import { PhaseTwoDetail, PhaseTwoWidget } from "../_shared/phase-monitor";

export const opsPhaseS = defineOpsWidget({ id: "ops-phase-s", title: "Fasa 2 · L2 (Fasa S)", component: PhaseTwoWidget, detail: PhaseTwoDetail, pics: ["Ega"] });
