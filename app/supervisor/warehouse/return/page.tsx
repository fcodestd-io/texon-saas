import {
  getReturnMasterDataAction,
  getWarehouseReturnHistoryAction,
} from "./action";
import { WarehouseReturnPageClient } from "./page-client";

export default async function WarehouseReturnPage() {
  const [masterData, history] = await Promise.all([
    getReturnMasterDataAction(),
    getWarehouseReturnHistoryAction(),
  ]);

  return (
    <WarehouseReturnPageClient
      initialMarketplaces={masterData.marketplacesList || []}
      initialVariants={masterData.variantsList || []}
      initialHistory={history || []}
    />
  );
}
