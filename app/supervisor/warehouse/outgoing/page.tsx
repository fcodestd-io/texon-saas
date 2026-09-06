import {
  getOutgoingMasterDataAction,
  getWarehouseOutgoingHistoryAction,
} from "./action";
import { WarehouseOutgoingPageClient } from "./page-client";

export default async function WarehouseOutgoingPage() {
  const [masterData, history] = await Promise.all([
    getOutgoingMasterDataAction(),
    getWarehouseOutgoingHistoryAction(),
  ]);

  return (
    <WarehouseOutgoingPageClient
      initialMarketplaces={masterData.marketplacesList || []}
      initialVariants={masterData.variantsList || []}
      initialHistory={history || []}
    />
  );
}
