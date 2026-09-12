import { auth } from "@/auth";
import {
  getCashflowMetricsAction,
  getCashflowLogsPaginatedAction,
} from "./action";
import { CashflowPageClient } from "./client";

export const dynamic = "force-dynamic";

export default async function CashflowPage() {
  const session = await auth();

  // Default bulan & tahun saat ini (September 2026)
  const now = new Date();
  const currentMonth = String(now.getUTCMonth() + 1).padStart(2, "0");
  const currentYear = String(now.getUTCFullYear());

  const initialMetrics = await getCashflowMetricsAction(
    currentMonth,
    currentYear,
  );
  const initialLogs = await getCashflowLogsPaginatedAction(
    currentMonth,
    currentYear,
    1,
    10,
    "ALL",
  );

  return (
    <CashflowPageClient
      initialMonth={currentMonth}
      initialYear={currentYear}
      initialMetrics={
        initialMetrics || {
          totalCashIn: 0,
          totalCashOut: 0,
          netCashflow: 0,
        }
      }
      initialLogs={initialLogs}
    />
  );
}
