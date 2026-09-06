import {
  getProductionLogsHistoryAction,
  getActiveCuttingTargetsAction,
} from "./action";
import { TrackingPageClient } from "./page-client";

export const dynamic = "force-dynamic";

export default async function TrackingPage() {
  const logsData = await getProductionLogsHistoryAction().catch(() => []);
  const activeTargetsData = await getActiveCuttingTargetsAction().catch(
    () => [],
  );

  return (
    <TrackingPageClient
      initialLogs={logsData || []}
      activeTargets={activeTargetsData || []}
    />
  );
}
