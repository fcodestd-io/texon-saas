"use client";

import { useState } from "react";
import Link from "next/link";
import {
  submitMaterialStockAdjustmentAction,
  getMaterialStockMovementsAction,
  getMaterialStockAdjustmentHistoryAction,
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

export function MaterialStockAdjustmentClient({
  initialMaterials = [],
}: {
  initialMaterials: any[];
}) {
  const [materialsList, setMaterialsList] = useState<any[]>(initialMaterials);
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
  const [selectedTargetInfo, setSelectedTargetInfo] = useState<any>(null);
  const [stockMovements, setStockMovements] = useState<any[]>([]);
  const [isLoadingMovements, setIsLoadingMovements] = useState(false);

  // State Modal Riwayat Opname
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Helper pembulatan desimal
  const roundTo2 = (num: number) =>
    Math.round((num + Number.EPSILON) * 100) / 100;

  // Format tampilan angka maksimal 2 angka di belakang koma
  const formatNum = (num: number) =>
    roundTo2(num).toLocaleString("id-ID", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    });

  const handleOpenAdjustModal = () => {
    const initialMap: Record<string, number> = {};
    materialsList.forEach((mat) => {
      if (mat.category !== "accessory" && mat.variants.length > 0) {
        mat.variants.forEach((v: any) => {
          initialMap[`var_${v.id}`] = roundTo2(v.stockPurchase);
        });
      } else {
        initialMap[`mat_${mat.id}`] = roundTo2(mat.stockPurchase);
      }
    });

    setActualStocksMap(initialMap);
    setAdjustTitle(`Opname Material ${new Date().toLocaleDateString("id-ID")}`);
    setAdjustNotes("");
    setIsAdjustModalOpen(true);
  };

  const handleOpenMovements = async (
    title: string,
    params: {
      materialId: string;
      materialColorId?: string | null;
      purchaseUnitName: string;
      baseUnitName: string;
      conversionValue: number;
    },
  ) => {
    setSelectedTargetInfo({ title, ...params });
    setIsMovementModalOpen(true);
    setIsLoadingMovements(true);

    const movements = await getMaterialStockMovementsAction(params);
    setStockMovements(movements || []);
    setIsLoadingMovements(false);
  };

  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    setIsLoadingHistory(true);

    const history = await getMaterialStockAdjustmentHistoryAction();
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

    materialsList.forEach((mat) => {
      const conversionVal = mat.conversionValue || 1;

      if (mat.category !== "accessory" && mat.variants.length > 0) {
        mat.variants.forEach((v: any) => {
          const actualPurchase = roundTo2(
            actualStocksMap[`var_${v.id}`] ?? v.stockPurchase,
          );
          adjustmentsList.push({
            materialId: mat.id,
            materialColorId: v.id,
            systemStockPurchase: roundTo2(v.stockPurchase),
            actualStockPurchase: actualPurchase,
            conversionValue: conversionVal,
          });
        });
      } else {
        const actualPurchase = roundTo2(
          actualStocksMap[`mat_${mat.id}`] ?? mat.stockPurchase,
        );
        adjustmentsList.push({
          materialId: mat.id,
          materialColorId: null,
          systemStockPurchase: roundTo2(mat.stockPurchase),
          actualStockPurchase: actualPurchase,
          conversionValue: conversionVal,
        });
      }
    });

    const res = await submitMaterialStockAdjustmentAction({
      title: adjustTitle,
      notes: adjustNotes,
      adjustments: adjustmentsList,
    });

    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setIsAdjustModalOpen(false);

      // Sync local state UI
      setMaterialsList((prev) =>
        prev.map((mat) => {
          const conversionVal = mat.conversionValue || 1;

          if (mat.category !== "accessory" && mat.variants.length > 0) {
            return {
              ...mat,
              variants: mat.variants.map((v: any) => {
                const newPurchase = roundTo2(
                  actualStocksMap[`var_${v.id}`] ?? v.stockPurchase,
                );
                return {
                  ...v,
                  stockPurchase: newPurchase,
                  stockBase: roundTo2(newPurchase * conversionVal),
                };
              }),
            };
          } else {
            const newPurchase = roundTo2(
              actualStocksMap[`mat_${mat.id}`] ?? mat.stockPurchase,
            );
            return {
              ...mat,
              stockPurchase: newPurchase,
              stockBase: roundTo2(newPurchase * conversionVal),
            };
          }
        }),
      );
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-4 text-xs font-sans max-w-md mx-auto">
      {/* Top Bar Navigation */}
      <div className="flex items-center justify-between font-mono">
        <Link
          href="/supervisor/production/dashboard"
          className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold text-[10px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE MENU PRODUKSI</span>
        </Link>
      </div>

      {/* Action Header Card */}
      <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold block">
            RAW MATERIAL CONTROL & AUDIT
          </span>
          <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide font-mono mt-0.5">
            OPNAME MATERIAL PRODUKSI
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleOpenAdjustModal}
            className="p-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-lg flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider shadow transition-colors"
          >
            <SlidersHorizontal className="w-4 h-4" /> OPNAME STOK
          </button>

          <button
            onClick={handleOpenHistory}
            className="p-2.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-200 border border-neutral-800 font-bold rounded-lg flex items-center justify-center gap-1.5 uppercase font-mono tracking-wider transition-colors"
          >
            <History className="w-4 h-4 text-amber-500" /> RIWAYAT OPNAME
          </button>
        </div>
      </div>

      {/* Accordion Material List */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-neutral-500 uppercase px-1">
          DAFTAR BAHAN BAKU ({materialsList.length}):
        </p>

        {materialsList.map((mat) => {
          const isGroupable = mat.category !== "accessory";
          const isOpen = openAccordionId === mat.id;

          const totalStockPurchase = roundTo2(
            isGroupable
              ? mat.variants.reduce(
                  (sum: number, v: any) => sum + v.stockPurchase,
                  0,
                )
              : mat.stockPurchase,
          );

          const totalStockBase = roundTo2(
            totalStockPurchase * mat.conversionValue,
          );

          return (
            <div
              key={mat.id}
              className="bg-neutral-900 border border-neutral-800/90 rounded-xl overflow-hidden transition-all"
            >
              <div className="p-3.5 flex items-center justify-between text-left">
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-neutral-100 uppercase font-mono text-xs">
                      {mat.name}
                    </h3>
                    <span className="text-[8px] font-mono uppercase bg-neutral-800 text-amber-400 px-1.5 py-0.5 rounded border border-neutral-700">
                      {mat.category}
                    </span>
                  </div>

                  {/* Info Dua Satuan */}
                  <div className="text-[10px] font-mono text-neutral-400 space-y-0.5">
                    <div>
                      Simpan:{" "}
                      <span className="text-amber-400 font-bold">
                        {formatNum(totalStockPurchase)} {mat.purchaseUnitName}
                      </span>
                    </div>
                    <div>
                      Pakai (Stok Utm):{" "}
                      <span className="text-emerald-400 font-bold">
                        {formatNum(totalStockBase)} {mat.baseUnitName}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  {!isGroupable && (
                    <button
                      onClick={() =>
                        handleOpenMovements(mat.name, {
                          materialId: mat.id,
                          materialColorId: null,
                          purchaseUnitName: mat.purchaseUnitName,
                          baseUnitName: mat.baseUnitName,
                          conversionValue: mat.conversionValue,
                        })
                      }
                      className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-800 rounded transition-colors"
                      title="Kartu Stok Aksesoris"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {isGroupable && (
                    <button
                      onClick={() => setOpenAccordionId(isOpen ? null : mat.id)}
                      className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-neutral-400 border border-neutral-800 rounded flex items-center gap-1 text-[10px]"
                    >
                      <span>{mat.variants.length} WARNA</span>
                      {isOpen ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Varian Warna */}
              {isOpen && isGroupable && (
                <div className="p-3 bg-neutral-950 border-t border-neutral-800/80 space-y-2">
                  {mat.variants.map((v: any) => {
                    return (
                      <div
                        key={v.id}
                        className="p-2.5 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between font-mono"
                      >
                        <div>
                          <span className="font-bold text-neutral-200 block text-[11px]">
                            {v.colorName || "Netral"}
                          </span>
                          <span className="text-[9px] text-neutral-500 block">
                            {formatNum(v.stockPurchase)} {mat.purchaseUnitName}{" "}
                            ➔{" "}
                            <span className="text-emerald-400">
                              {formatNum(v.stockBase)} {mat.baseUnitName}
                            </span>
                          </span>
                        </div>

                        <button
                          onClick={() =>
                            handleOpenMovements(
                              `${mat.name} (${v.colorName || "Netral"})`,
                              {
                                materialId: mat.id,
                                materialColorId: v.id,
                                purchaseUnitName: mat.purchaseUnitName,
                                baseUnitName: mat.baseUnitName,
                                conversionValue: mat.conversionValue,
                              },
                            )
                          }
                          className="p-1.5 bg-neutral-950 hover:bg-neutral-800 text-amber-400 border border-neutral-800 rounded transition-colors"
                          title="Kartu Stok Warna Ini"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL 1: FORM OPNAME MATERIAL */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <h3 className="font-bold uppercase text-neutral-100 flex items-center gap-1.5">
                <SlidersHorizontal className="w-4 h-4 text-amber-500" />
                FORM OPNAME MATERIAL FISIK
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
                  placeholder="Catatan hasil audit bahan..."
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-[10px] font-mono text-amber-400 font-bold uppercase">
                INPUT STOK FISIK (DALAM SATUAN BELI/SIMPAN):
              </p>

              {materialsList.map((mat) => {
                const isGroupable =
                  mat.category !== "accessory" && mat.variants.length > 0;

                return (
                  <div key={mat.id} className="space-y-1.5">
                    <span className="text-[10px] font-bold font-mono text-neutral-300 uppercase block">
                      {mat.name}
                    </span>

                    {isGroupable ? (
                      mat.variants.map((v: any) => {
                        const key = `var_${v.id}`;
                        const actualPurchaseVal = roundTo2(
                          actualStocksMap[key] ?? v.stockPurchase,
                        );
                        const diffPurchase = roundTo2(
                          actualPurchaseVal - v.stockPurchase,
                        );
                        const actualBaseVal = roundTo2(
                          actualPurchaseVal * mat.conversionValue,
                        );

                        return (
                          <div
                            key={v.id}
                            className="p-2.5 bg-neutral-950 border border-neutral-800 rounded font-mono space-y-1"
                          >
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-neutral-200">
                                {v.colorName || "Netral"}
                              </span>

                              <div className="flex items-center gap-2">
                                {diffPurchase !== 0 && (
                                  <span
                                    className={`text-[10px] font-bold ${
                                      diffPurchase > 0
                                        ? "text-emerald-400"
                                        : "text-red-400"
                                    }`}
                                  >
                                    {diffPurchase > 0
                                      ? `+${formatNum(diffPurchase)}`
                                      : formatNum(diffPurchase)}
                                  </span>
                                )}

                                <input
                                  type="number"
                                  step="0.01"
                                  value={actualPurchaseVal}
                                  onChange={(e) =>
                                    setActualStocksMap({
                                      ...actualStocksMap,
                                      [key]: roundTo2(
                                        parseFloat(e.target.value) || 0,
                                      ),
                                    })
                                  }
                                  className="w-20 p-1 bg-neutral-900 border border-neutral-800 text-amber-400 font-bold text-center rounded focus:outline-none"
                                />
                                <span className="text-[10px] text-neutral-400">
                                  {mat.purchaseUnitName}
                                </span>
                              </div>
                            </div>

                            {/* Live Kalkulasi Satuan Pakai */}
                            <div className="text-[9px] text-neutral-500 flex justify-between border-t border-neutral-900 pt-1">
                              <span>
                                Sistem: {formatNum(v.stockPurchase)}{" "}
                                {mat.purchaseUnitName}
                              </span>
                              <span>
                                Setara Stok Utm:{" "}
                                <strong className="text-emerald-400 font-normal">
                                  {formatNum(actualBaseVal)} {mat.baseUnitName}
                                </strong>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-2.5 bg-neutral-950 border border-neutral-800 rounded font-mono space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-neutral-400 text-[10px]">
                            Aksesoris / Material Utama
                          </span>

                          <div className="flex items-center gap-2">
                            {actualStocksMap[`mat_${mat.id}`] !==
                              mat.stockPurchase && (
                              <span
                                className={`text-[10px] font-bold ${
                                  (actualStocksMap[`mat_${mat.id}`] ??
                                    mat.stockPurchase) > mat.stockPurchase
                                    ? "text-emerald-400"
                                    : "text-red-400"
                                }`}
                              >
                                {(actualStocksMap[`mat_${mat.id}`] ??
                                  mat.stockPurchase) -
                                  mat.stockPurchase >
                                0
                                  ? `+${formatNum(
                                      (actualStocksMap[`mat_${mat.id}`] ??
                                        mat.stockPurchase) - mat.stockPurchase,
                                    )}`
                                  : formatNum(
                                      (actualStocksMap[`mat_${mat.id}`] ??
                                        mat.stockPurchase) - mat.stockPurchase,
                                    )}
                              </span>
                            )}

                            <input
                              type="number"
                              step="0.01"
                              value={
                                actualStocksMap[`mat_${mat.id}`] ??
                                mat.stockPurchase
                              }
                              onChange={(e) =>
                                setActualStocksMap({
                                  ...actualStocksMap,
                                  [`mat_${mat.id}`]: roundTo2(
                                    parseFloat(e.target.value) || 0,
                                  ),
                                })
                              }
                              className="w-20 p-1 bg-neutral-900 border border-neutral-800 text-amber-400 font-bold text-center rounded focus:outline-none"
                            />
                            <span className="text-[10px] text-neutral-400">
                              {mat.purchaseUnitName}
                            </span>
                          </div>
                        </div>

                        {/* Live Kalkulasi Satuan Pakai */}
                        <div className="text-[9px] text-neutral-500 flex justify-between border-t border-neutral-900 pt-1">
                          <span>
                            Sistem: {formatNum(mat.stockPurchase)}{" "}
                            {mat.purchaseUnitName}
                          </span>
                          <span>
                            Setara Stok Utm:{" "}
                            <strong className="text-emerald-400 font-normal">
                              {formatNum(
                                (actualStocksMap[`mat_${mat.id}`] ??
                                  mat.stockPurchase) * mat.conversionValue,
                              )}{" "}
                              {mat.baseUnitName}
                            </strong>
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
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

      {/* MODAL 2: KARTU STOK MATERIAL */}
      {isMovementModalOpen && selectedTargetInfo && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <div>
                <h3 className="font-bold uppercase text-neutral-100">
                  KARTU STOK MATERIAL
                </h3>
                <span className="text-[10px] text-amber-400 block mt-0.5">
                  {selectedTargetInfo.title}
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
                Belum ada histori pergerakan stok untuk material ini.
              </p>
            ) : (
              <div className="space-y-2">
                {stockMovements.map((mov) => {
                  const isPositive = mov.quantity > 0;
                  const conv = selectedTargetInfo.conversionValue || 1;

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

                      {/* Tampilan Pergerakan dalam Satuan Utama (Pakai) */}
                      <div className="flex justify-between items-center pt-1 border-t border-neutral-900 text-neutral-200">
                        <span>
                          {formatNum(mov.stockBefore)} ➔{" "}
                          {formatNum(mov.stockAfter)}{" "}
                          {selectedTargetInfo.baseUnitName}
                        </span>
                        <span
                          className={`font-bold ${
                            isPositive ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {isPositive
                            ? `+${formatNum(mov.quantity)}`
                            : formatNum(mov.quantity)}{" "}
                          {selectedTargetInfo.baseUnitName}
                        </span>
                      </div>

                      {/* Tampilan Setara Satuan Simpan/Beli */}
                      <div className="text-[9px] text-neutral-500 text-right">
                        Setara: {formatNum(mov.quantity / conv)}{" "}
                        {selectedTargetInfo.purchaseUnitName}
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

      {/* MODAL 3: RIWAYAT OPNAME MATERIAL */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
          <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-4 rounded-xl space-y-3 max-h-[85vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <h3 className="font-bold uppercase text-neutral-100 flex items-center gap-1.5">
                <History className="w-4 h-4 text-amber-500" />
                RIWAYAT AUDIT OPNAME MATERIAL
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
                Belum ada catatan riwayat opname material.
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
                        const diff = it.difference;
                        return (
                          <div
                            key={it.id}
                            className="flex justify-between items-center text-[9.5px] text-neutral-300"
                          >
                            <span>
                              {it.materialName}{" "}
                              {it.colorName ? `(${it.colorName})` : ""}
                            </span>
                            <span className="font-bold">
                              {formatNum(it.systemStock)} ➔{" "}
                              {formatNum(it.actualStock)} {it.purchaseUnitName}{" "}
                              (
                              <span
                                className={
                                  diff > 0
                                    ? "text-emerald-400"
                                    : diff < 0
                                      ? "text-red-400"
                                      : "text-neutral-500"
                                }
                              >
                                {diff > 0
                                  ? `+${formatNum(diff)}`
                                  : formatNum(diff)}
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
