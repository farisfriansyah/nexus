import { defineOpsWidget } from "../_shared/define";
import { TravoSummaryDetail, TravoSummaryWidget } from "../_shared/phase-monitor";

export const opsTravoSummary = defineOpsWidget({ id: "ops-travo-summary", title: "Ringkasan Sistem", component: TravoSummaryWidget, detail: TravoSummaryDetail, pics: ["Ega"] });
