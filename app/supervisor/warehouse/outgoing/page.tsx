import { WarehouseOutgoingPageClient } from "./page-client";
import {
  getOutgoingMasterDataAction,
  getWarehouseOutgoingHistoryAction,
} from "./action";

// Memaksa Next.js untuk selalu merender halaman ini secara dinamis (mencegah caching statis yang merusak state)
export const dynamic = "force-dynamic";

export default async function WarehouseOutgoingPage() {
  let masterData = { marketplacesList: [], variantsList: [] };
  let historyList: any[] = [];

  try {
    // Ambil data awal secara paralel di Server Component
    const [masterRes, historyRes] = await Promise.all([
      getOutgoingMasterDataAction(),
      getWarehouseOutgoingHistoryAction(),
    ]);

    if (masterRes) masterData = masterRes;
    if (Array.isArray(historyRes)) historyList = historyRes;
  } catch (error) {
    console.error("Gagal memuat data awal Outgoing Page:", error);
    // Fallback aman agar halaman tetap ter-render tanpa crash
  }

  return (
    <WarehouseOutgoingPageClient
      initialMarketplaces={masterData.marketplacesList || []}
      initialVariants={masterData.variantsList || []}
      initialHistory={historyList || []}
    />
  );
}
