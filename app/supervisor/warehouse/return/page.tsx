import { WarehouseReturnPageClient } from "./page-client";
import {
  getReturnMasterDataAction,
  getWarehouseReturnHistoryAction,
} from "./action";

// Memaksa Next.js untuk selalu merender halaman ini secara dinamis
export const dynamic = "force-dynamic";

export default async function WarehouseReturnPage() {
  let masterData = { marketplacesList: [], variantsList: [] };
  let historyList: any[] = [];

  try {
    // Ambil data awal secara paralel di Server Component
    const [masterRes, historyRes] = await Promise.all([
      getReturnMasterDataAction(),
      getWarehouseReturnHistoryAction(),
    ]);

    if (masterRes) masterData = masterRes;
    if (Array.isArray(historyRes)) historyList = historyRes;
  } catch (error) {
    console.error("Gagal memuat data awal Return Page:", error);
    // Fallback aman agar halaman tetap ter-render tanpa crash
  }

  return (
    <WarehouseReturnPageClient
      initialMarketplaces={masterData.marketplacesList || []}
      initialVariants={masterData.variantsList || []}
      initialHistory={historyList || []}
    />
  );
}
