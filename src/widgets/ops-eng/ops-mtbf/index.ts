import { defineOpsWidget } from "../_shared/define";
import { Detail } from "./detail";
import { Widget } from "./widget";

export const opsMtbf = defineOpsWidget({ id: "ops-mtbf", title: "MTBF", component: Widget, detail: Detail, pics: ["Erwina"] });
