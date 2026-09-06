import { getPurchaseOrdersAction, getAllMaterialsAction } from "./action";
import { PurchaseClient } from "./purchase-client";

export const metadata = {
  title: "Pembelian Bahan Baku (PO) | Supervisor Produksi",
  description: "Manajemen transaksi pembelian dan penerimaan bahan baku",
};

export default async function PurchasePage() {
  // Fetch data awal secara paralel dari database
  const [initialPOList, materialsList] = await Promise.all([
    getPurchaseOrdersAction("all"),
    getAllMaterialsAction(),
  ]);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      {/* Header Halaman */}
      <div className="pb-2 border-b border-neutral-800">
        <h1 className="text-sm font-bold uppercase tracking-wider text-neutral-100 font-mono">
          PEMBELIAN BAHAN BAKU (PURCHASE ORDER)
        </h1>
        <p className="text-[11px] text-neutral-400 mt-0.5">
          Catat estimasi pembelian bahan dan konfirmasi kuantitas barang yang
          tiba.
        </p>
      </div>

      {/* Client Component Utama */}
      <PurchaseClient
        initialPOList={initialPOList || []}
        materialsList={materialsList || []}
      />
    </div>
  );
}
