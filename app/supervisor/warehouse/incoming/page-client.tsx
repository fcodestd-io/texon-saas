"use client";

import { useState } from "react";
import Link from "next/link";
import {
  submitGlobalWarehouseIncomingAction,
  getAllPendingIncomingVariantsAction,
  getWarehouseIncomingHistoryAction,
} from "./action";
import { toast } from "sonner";
import {
  PackagePlus,
  History,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  FileText,
  Boxes,
  ArrowLeft,
} from "lucide-react";

export function WarehouseIncomingPageClient({
  initialVariants = [],
  initialHistory = [],
}: {
  initialVariants: any[];
  initialHistory: any[];
}) {
  const [availableVariants, setAvailableVariants] =
    useState<any[]>(initialVariants);
  const [historyList, setHistoryList] = useState<any[]>(initialHistory);
  const [incomingNotes, setIncomingNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Accordion State untuk Riwayat
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  const refreshData = async () => {
    setIsRefreshing(true);
    const [updatedVariants, updatedHistory] = await Promise.all([
      getAllPendingIncomingVariantsAction(),
      getWarehouseIncomingHistoryAction(),
    ]);
    setAvailableVariants(updatedVariants || []);
    setHistoryList(updatedHistory || []);
    setIsRefreshing(false);
  };

  // Submit Penerimaan Gudang
  const handleSubmit = async () => {
    const validItems = availableVariants
      .filter((v) => (v.inputQty || 0) > 0)
      .map((v) => ({
        productVariantId: v.productVariantId,
        targetIds: v.targetIds,
        quantity: v.inputQty,
      }));

    if (validItems.length === 0) {
      toast.warning("Masukkan kuantitas produk yang diterima minimal 1.");
      return;
    }

    setIsSubmitting(true);
    const res = await submitGlobalWarehouseIncomingAction({
      notes: incomingNotes,
      items: validItems,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setIncomingNotes("");
      refreshData();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans max-w-md mx-auto">
      {/* Top Action Bar: Kembali ke Menu Utama */}
      <div className="flex items-center justify-between font-mono">
        <Link
          href="/supervisor/warehouse/dashboard"
          className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-emerald-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold text-[10px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE MENU UTAMA</span>
        </Link>
      </div>

      {/* Header Bar */}
      <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <span className="text-[9px] font-mono tracking-widest text-emerald-500 uppercase font-semibold block">
              GUDANG RECEIVING
            </span>
            <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide font-mono mt-0.5">
              PENERIMAAN PRODUK MASUK
            </h2>
          </div>

          <button
            onClick={refreshData}
            disabled={isRefreshing}
            className="p-2 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-bold rounded-lg flex items-center gap-1 uppercase font-mono transition-colors disabled:opacity-50"
          >
            {isRefreshing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
            ) : (
              <Boxes className="w-3.5 h-3.5 text-emerald-400" />
            )}
            <span>REFRESH</span>
          </button>
        </div>

        {/* Input Catatan */}
        <div className="space-y-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono">
          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">
              CATATAN PENERIMAAN GUDANG (OPSIONAL)
            </label>
            <input
              type="text"
              value={incomingNotes}
              onChange={(e) => setIncomingNotes(e.target.value)}
              placeholder="Misal: Penerimaan dari tim finishing..."
              className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* List SKU Varian Ready Lolos Finishing (Agregat All Targets) */}
      <div className="space-y-2">
        <div className="flex justify-between items-center px-1 font-mono">
          <p className="text-[10px] text-neutral-500 uppercase">
            DAFTAR SKU READY MASUK GUDANG ({availableVariants.length} VARIAN):
          </p>
        </div>

        {availableVariants.length === 0 ? (
          <p className="p-6 text-center text-neutral-500 font-mono italic bg-neutral-900/50 border border-neutral-800 rounded-xl">
            Tidak ada produk yang sedang mengantre untuk masuk gudang.
          </p>
        ) : (
          availableVariants.map((item, idx) => (
            <div
              key={item.productVariantId}
              className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 font-mono"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-neutral-100 uppercase text-xs">
                    {item.productName} ({item.color} - {item.size})
                  </h3>
                  <span className="text-[9px] text-neutral-500 block">
                    SKU: {item.sku} • STOK SISTEM: {item.currentVariantStock}{" "}
                    SET
                  </span>
                </div>

                <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-900/60">
                  READY: {item.availableQty} SET
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80">
                <span className="text-[9.5px] text-neutral-400">
                  TERIMA KE STOK GUDANG:
                </span>

                <input
                  type="number"
                  value={item.inputQty}
                  onChange={(e) => {
                    const copy = [...availableVariants];
                    copy[idx].inputQty = parseFloat(e.target.value) || 0;
                    setAvailableVariants(copy);
                  }}
                  className="w-24 p-1.5 bg-neutral-950 border border-neutral-800 font-mono text-emerald-400 font-extrabold text-center rounded focus:outline-none"
                />
              </div>
            </div>
          ))
        )}

        {availableVariants.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-mono disabled:opacity-50 transition-colors shadow-lg mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PackagePlus className="w-4 h-4" />
            )}
            <span>TERIMA & PROSES KE STOK GUDANG</span>
          </button>
        )}
      </div>

      {/* SECTION RIWAYAT BARANG MASUK (ACCORDION) */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between px-1 font-mono">
          <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-emerald-500" />
            RIWAYAT PRODUK MASUK ({historyList.length})
          </span>
        </div>

        {historyList.length === 0 ? (
          <p className="p-6 text-center text-neutral-500 font-mono italic bg-neutral-900/50 border border-neutral-800 rounded-xl">
            Belum ada riwayat transaksi produk masuk.
          </p>
        ) : (
          historyList.map((hist) => {
            const isOpen = openHistoryId === hist.id;
            const totalQtyReceived = hist.items.reduce(
              (sum: number, it: any) => sum + parseFloat(it.quantity || "0"),
              0,
            );

            return (
              <div
                key={hist.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden font-mono"
              >
                {/* Header Card Transaction */}
                <button
                  onClick={() => setOpenHistoryId(isOpen ? null : hist.id)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-emerald-400 text-xs block">
                      {hist.referenceNumber}
                    </span>
                    <span className="text-[9px] text-neutral-500 flex items-center gap-1 pt-0.5">
                      <Clock className="w-3 h-3 text-neutral-600" />
                      {new Date(hist.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[9px] text-neutral-500 block">
                        TOTAL
                      </span>
                      <span className="text-emerald-400 font-extrabold text-xs">
                        +{totalQtyReceived} SET
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {/* Accordion Detail Items */}
                {isOpen && (
                  <div className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-1.5 text-[10px]">
                    {hist.notes && (
                      <p className="text-[9px] text-neutral-400 italic mb-2">
                        Catatan: "{hist.notes}"
                      </p>
                    )}

                    <span className="text-[9px] text-neutral-500 uppercase block font-bold">
                      ITEM DETAIL YANG DITERIMA:
                    </span>

                    {hist.items?.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-2 bg-neutral-900 border border-neutral-800/80 rounded flex justify-between items-center text-neutral-200"
                      >
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-3 h-3 text-neutral-500" />
                          {it.sku} ({it.colorName || "-"} - {it.sizeName || "-"}
                          )
                        </span>

                        <span className="font-bold text-emerald-400">
                          +{parseFloat(it.quantity)} SET
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
