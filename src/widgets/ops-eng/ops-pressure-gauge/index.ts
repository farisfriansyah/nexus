import { defineOpsWidget } from "../_shared/define";
import { Detail, Widget } from "./widget";

export const opsPressureGauge = defineOpsWidget({ id: "ops-pressure-gauge", title: "Tekanan Boiler", component: Widget, detail: Detail, pics: ["Dovan"] });
