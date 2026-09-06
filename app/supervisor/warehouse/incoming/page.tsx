import {
  getAllPendingIncomingVariantsAction,
  getWarehouseIncomingHistoryAction,
} from "./action";
import { WarehouseIncomingPageClient } from "./page-client";

export default async function WarehouseIncomingPage() {
  const [pendingVariants, history] = await Promise.all([
    getAllPendingIncomingVariantsAction(),
    getWarehouseIncomingHistoryAction(),
  ]);

  return (
    <WarehouseIncomingPageClient
      initialVariants={pendingVariants || []}
      initialHistory={history || []}
    />
  );
}
