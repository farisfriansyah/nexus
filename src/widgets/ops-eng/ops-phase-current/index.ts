import { defineOpsWidget } from "../_shared/define";
import { CurrentTrendDetail, CurrentTrendWidget } from "../_shared/phase-monitor";

export const opsPhaseCurrent = defineOpsWidget({ id: "ops-phase-current", title: "Arus Fasa", component: CurrentTrendWidget, detail: CurrentTrendDetail, pics: ["Ega"] });
