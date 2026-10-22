import { defineOpsWidget } from "../_shared/define";
import { Detail, Widget } from "./widget";

export const opsStatusSummary = defineOpsWidget({ id: "ops-status-summary", title: "Ringkasan Status", component: Widget, detail: Detail });
