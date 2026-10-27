import { defineOpsWidget } from "../_shared/define";
import { PhaseOneDetail, PhaseOneWidget } from "../_shared/phase-monitor";

export const opsPhaseR = defineOpsWidget({ id: "ops-phase-r", title: "Fasa 1 · L1 (Fasa R)", component: PhaseOneWidget, detail: PhaseOneDetail, pics: ["Ega"] });
