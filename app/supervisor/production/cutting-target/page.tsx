import {
  getCuttingTargetsByDateAction,
  getMasterProductsForTargetAction,
} from "./action";
import { CuttingTargetPageClient } from "./page-client";

export const metadata = {
  title: "Target Potongan | Supervisor Produksi",
  description: "Manajemen target & request potongan harian tim pemotong",
};

export default async function CuttingTargetPage() {
  // Ambil tanggal hari ini (Format YYYY-MM-DD)
  const todayStr = new Date().toISOString().split("T")[0];

  // Fetch data awal secara paralel dari server
  const [initialTargets, masterProducts] = await Promise.all([
    getCuttingTargetsByDateAction(todayStr),
    getMasterProductsForTargetAction(),
  ]);

  return (
    <CuttingTargetPageClient
      initialDate={todayStr}
      initialTargets={initialTargets || []}
      masterProducts={masterProducts || []}
    />
  );
}
