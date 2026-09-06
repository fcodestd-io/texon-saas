"use client";

import { useState } from "react";
import Link from "next/link";
import {
  submitStockAdjustmentAction,
  getStockMovementsByVariantAction,
  getStockAdjustmentHistoryAction,
} from "./action";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronUp,
  History,
  SlidersHorizontal,
  FileText,
  X,
  Loader2,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowLeft,
} from "lucide-react";

export function StockAdjustmentPageClient({
  initialProducts = [],
}: {
  initialProducts: any[];
}) {
  const [products, setProducts] = useState<any[]>(initialProducts);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  // State Modal Adjust Stok (Opname)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustTitle, setAdjustTitle] = useState("");
  const [adjustNotes, setAdjustNotes] = useState("");
  const [actualStocksMap, setActualStocksMap] = useState<
    Record<string, number>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State Modal Kartu Stok
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [selectedVariantInfo, setSelectedVariantInfo] = useState<any>(null);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // State Modal Riwayat Opname
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const handleOpenAdjustModal = () => {
    const initialMap: Record<string, number> = {};
    products.forEach((prod) => {
      prod.variants.forEach((v: any) => {
        initialMap[v.id] = v.stock;
      });
    });
    setActualStocksMap(initialMap);
    setAdjustTitle(`Opname Stok ${new Date().toLocaleDateString("id-ID")}`);
    setAdjustNotes("");
    setIsAdjustModalOpen(true);
  };

  const handleOpenMovements = async (variant: any, productName: string) => {
    setSelectedVariantInfo({ ...variant, productName });
    setIsMovementModalOpen(true);
    setIsLoadingMovements(true);

    const movements = await getStockMovementsByVariantAction(variant.id);
    setStockMovements(movements || []);
    setIsLoadingMovements(false);
  };

  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);

    const history = await getStockAdjustmentHistoryAction();
    setHistoryList(history || []);
    setIsLoadingHistory(false);
  };

  const handleSubmitAdjustment = async () => {
    if (!adjustTitle.trim()) {
      toast.warning("Judul penyesuaian stok wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const adjustmentsList: any[] = [];

    products.forEach((prod) => {
      prod.variants.forEach((v: any) => {
        const actual = actualStocksMap[v.id] ?? v.stock;
        adjustmentsList.push({
          productVariantId: v.id,
          systemStock: v.stock,
          actualStock: actual,
        });
      });
    });

    const res = await submitStockAdjustmentAction({
      title: adjustTitle,
      notes: adjustNotes,
      adjustments: adjustmentsList,
    });

    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setIsAdjustModalOpen(false);

      // Update state stok sistem di UI
      setProducts((prev) =>
        prev.map((prod) => ({
          ...prod,
          variants: prod.variants.map((v: any) => ({
            ...v,
            stock: actualStocksMap[v.id] ?? v.stock,
          })),
        })),
      );
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
          className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold text-[10px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE MENU UTAMA</span>
        </Link>
      </div>

      {/* Action Header Card */}
      <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold block">
            STOCK CONTROL & AUDIT
          </span>
          <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide font-mono mt-0.5">
            PENYESUAIAN STOK GUDANG
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpenAdjustModal}
            className="p-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider shadow transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" /> SESUAIKAN STOK
          </button>

          <button
            onClick={handleOpenHistory}
            className="p-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-bold rounded-lg flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider transition-colors"
          >
            <History className="w-4 h-4 text-amber-500" /> RIWAYAT OPNAME
          </button>
        </div>
      </div>

      {/* Accordion Model Produk */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-neutral-500 uppercase px-1">
          DAFTAR MODEL PRODUK ({products.length}):
        </p>

        {products.map((prod) => {
          const isOpen = openAccordionId === prod.id;
          const totalStock = prod.variants.reduce(
            (sum: number, v: any) => sum + v.stock,
            0,
          );

          return (
            <div
              key={prod.id}
              className="bg-neutral-900 border border-neutral-800/90 rounded-xl overflow-hidden transition-all"
            >
              <button
                onClick={() => setOpenAccordionId(isOpen ? null : prod.id)}
                className="w-full p-3.5 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-neutral-100 uppercase font-mono text-xs">
                    {prod.name}
                  </h3>
                  <span className="text-[10px] text-neutral-500 font-mono">
                    {prod.variants.length} SKU / VARIANT
                  </span>
                </div>

                <div className="flex items-center gap-3 font-mono">
                  <div className="text-right">
                    <span className="text-[9px] text-neutral-500 block">
                      TOTAL STOK
                    </span>
                    <span className="text-amber-400 font-bold text-xs">
                      {totalStock} SET
                    </span>
                  </div>
                  {isOpen ? (
                    <ChevronUp className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  )}
                </div>
              </button>

              {isOpen && (
                <div className="p-3 bg-neutral-950 border-t border-neutral-800/80 space-y-2">
                  {prod.variants.map((v: any) => (
                    <div
                      key={v.id}
                      className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between font-mono"
                    >
                      <div>
                        <span className="font-bold text-neutral-200 block text-[11px]">
                          {v.color} - {v.size}
                        </span>
                        <span className="text-[9px] text-neutral-500 block">
                          SKU: {v.sku}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-right mr-1">
                          <span className="text-[9px] text-neutral-500 block">
                            STOK SISTEM
                          </span>
                          <span className="text-emerald-400 font-extrabold text-xs">
                            {v.stock}
                          </span>
                        </div>

                        {/* Tombol Kartu Stok */}
                        <button
                          onClick={() => handleOpenMovements(v, prod.name)}
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-800 rounded transition-colors"
                          title="Lihat Kartu Stok"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: FORM PENYESUAIAN STOK */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <h3 className="font-bold uppercase text-neutral-100 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                FORM OPNAME STOK GUDANG
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            <div className="space-y-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono">
              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">
                  JUDUL PENYESUAIAN / OPNAME *
                </label>
                <input
                  type="text"
                  value={adjustTitle}
                  onChange={(e) => setAdjustTitle(e.target.value)}
                  placeholder="Misal: Opname Pekan Ini"
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[10px] text-neutral-400 block mb-1">
                  CATATAN OPNAME (OPSIONAL)
                </label>
                <input
                  type="text"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  placeholder="Catatan mandor..."
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                INPUT STOK AKTUAL PER SKU:
              </p>

              {products.map((prod) => (
                <div key={prod.id} className="space-y-1.5">
                  <span className="text-[10px] font-bold font-mono text-neutral-400 uppercase">
                    {prod.name}
                  </span>

                  {prod.variants.map((v: any) => {
                    const actualVal = actualStocksMap[v.id] ?? v.stock;
                    const diff = actualVal - v.stock;

                    return (
                      <div
                        key={v.id}
                        className="p-2 bg-neutral-950 border border-neutral-800 rounded flex items-center justify-between text-[11px] font-mono"
                      >
                        <div>
                          <span className="font-bold text-neutral-200 block">
                            {v.color} - {v.size}
                          </span>
                          <span className="text-[9px] text-neutral-500">
                            SISTEM: {v.stock}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {diff !== 0 && (
                            <span
                              className={`text-[10px] font-bold ${
                                diff > 0 ? "text-emerald-400" : "text-red-400"
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          )}

                          <input
                            type="number"
                            value={actualVal}
                            onChange={(e) =>
                              setActualStocksMap({
                                ...actualStocksMap,
                                [v.id]: parseFloat(e.target.value) || 0,
                              })
                            }
                            className="w-20 p-1 bg-neutral-900 border border-neutral-800 text-amber-400 font-bold text-center rounded focus:outline-none"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            <button
              onClick={handleSubmitAdjustment}
              disabled={isSubmitting}
              className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-mono disabled:opacity-50 transition-colors"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>SIMPAN & UPDATE STOK FISIK</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: KARTU STOK PER SKU */}
      {isMovementModalOpen && selectedVariantInfo && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <div>
                <h3 className="font-bold uppercase text-neutral-100">
                  KARTU STOK PRODUK
                </h3>
                <span className="text-[10px] text-amber-400 block mt-0.5">
                  {selectedVariantInfo.productName} ({selectedVariantInfo.color}{" "}
                  - {selectedVariantInfo.size})
                </span>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            {isLoadingMovements ? (
              <div className="p-8 text-center text-neutral-500 font-mono flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Memuat pergerakan stok...</span>
              </div>
            ) : stockMovements.length === 0 ? (
              <p className="p-6 text-center text-neutral-500 font-mono italic bg-neutral-950 rounded border border-neutral-800">
                Belum ada histori pergerakan stok untuk SKU ini.
              </p>
            ) : (
              <div className="space-y-2">
                {stockMovements.map((mov) => {
                  const isPositive = parseFloat(mov.quantity) > 0;

                  return (
                    <div
                      key={mov.id}
                      className="p-2.5 bg-neutral-950 border border-neutral-800 rounded space-y-1 font-mono text-[10px]"
                    >
                      <div className="flex justify-between items-center">
                        <span className="flex items-center gap-1 font-bold text-neutral-300 uppercase">
                          {isPositive ? (
                            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <ArrowDownLeft className="w-3.5 h-3.5 text-red-400" />
                          )}
                          TIPE: {mov.type}
                        </span>

                        <span className="text-neutral-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(mov.createdAt).toLocaleString("id-ID", {
                            dateStyle: "short",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-1 border-t border-neutral-900 text-neutral-200">
                        <span>
                          Sebelum: {mov.stockBefore} ➔ Setelah: {mov.stockAfter}
                        </span>
                        <span
                          className={`font-bold ${
                            isPositive ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPositive ? `+${mov.quantity}` : mov.quantity}
                        </span>
                      </div>

                      {mov.notes && (
                        <p className="text-[9px] text-neutral-500 italic pt-0.5">
                          Ket: "{mov.notes}"
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 3: RIWAYAT AUDIT OPNAME */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <h3 className="font-bold uppercase text-neutral-100 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-500" />
                RIWAYAT OPNAME STOK
              </h3>
              <button onClick={() => setIsHistoryModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            {isLoadingHistory ? (
              <div className="p-8 text-center text-neutral-500 font-mono flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>Memuat riwayat opname...</span>
              </div>
            ) : historyList.length === 0 ? (
              <p className="p-6 text-center text-neutral-500 font-mono italic bg-neutral-950 rounded border border-neutral-800">
                Belum ada catatan riwayat opname stok.
              </p>
            ) : (
              <div className="space-y-3">
                {historyList.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2 font-mono text-[10px]"
                  >
                    <div className="flex justify-between items-start pb-1.5 border-b border-neutral-900">
                      <div>
                        <span className="font-bold text-neutral-100 block text-[11px]">
                          {hist.title}
                        </span>
                        {hist.notes && (
                          <span className="text-[9px] text-neutral-500 block">
                            "{hist.notes}"
                          </span>
                        )}
                      </div>
                      <span className="text-neutral-500 text-[9px]">
                        {new Date(hist.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {hist.items?.map((it: any) => {
                        const diff = parseFloat(it.difference);
                        return (
                          <div
                            key={it.id}
                            className="flex justify-between items-center text-[9.5px] text-neutral-300"
                          >
                            <span>
                              {it.sku} ({it.colorName || "-"} -{" "}
                              {it.sizeName || "-"})
                            </span>
                            <span className="font-bold">
                              {it.systemStock} ➔ {it.actualStock} (
                              <span
                                className={
                                  diff > 0
                                    ? "text-emerald-400"
                                    : diff < 0
                                      ? "text-red-400"
                                      : "text-neutral-500"
                                }
                              >
                                {diff > 0 ? `+${diff}` : diff}
                              </span>
                              )
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
