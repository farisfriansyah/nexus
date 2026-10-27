import { defineOpsWidget } from "../_shared/define";
import { CosTotalDetail, CosTotalWidget } from "../_shared/phase-monitor";

export const opsCosTotal = defineOpsWidget({ id: "ops-cos-total", title: "Cos Total", component: CosTotalWidget, detail: CosTotalDetail, pics: ["Ega"] });
