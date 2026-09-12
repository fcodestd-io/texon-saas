"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  StockMovementsReportData,
  MovementLogItem,
  getPaginatedMovementsAction,
} from "./action";
import {
  Boxes,
  Shirt,
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  X,
  History,
} from "lucide-react";

interface StockMovementsClientProps {
  initialData: StockMovementsReportData;
  initialYear: number;
  initialMonth: number;
  vendorId: string;
}

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

// Helper formatting angka Indonesia tanpa pembulatan tidak sengaja
function formatQty(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 4,
  }).format(value);
}

export function StockMovementsClient({
  initialData,
  initialYear,
  initialMonth,
  vendorId,
}: StockMovementsClientProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<"MATERIAL" | "PRODUCT">(
    "MATERIAL",
  );
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);

  const [openMaterialAccordion, setOpenMaterialAccordion] = useState<
    string | null
  >(null);
  const [openProductAccordion, setOpenProductAccordion] = useState<
    string | null
  >(null);

  // State Modal Infinite Scroll
  const [modalConfig, setModalConfig] = useState<{
    title: string;
    subtitle: string;
    unitName: string;
    itemType: "MATERIAL" | "PRODUCT";
    itemId: string;
    materialColorId?: string | null;
  } | null>(null);

  const [logs, setLogs] = useState<MovementLogItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const observerTarget = useRef<HTMLDivElement | null>(null);

  const handleFilterDateChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    router.push(
      `/dashboard/reports/stock-movements?year=${newYear}&month=${newMonth}`,
    );
  };

  const handleOpenModal = (config: typeof modalConfig) => {
    setLogs([]);
    setPage(1);
    setHasMore(true);
    setModalConfig(config);
  };

  const fetchLogs = useCallback(
    async (pageNum: number) => {
      if (!modalConfig || isLoadingLogs) return;

      setIsLoadingLogs(true);
      try {
        const newLogs = await getPaginatedMovementsAction({
          vendorId,
          itemType: modalConfig.itemType,
          itemId: modalConfig.itemId,
          materialColorId: modalConfig.materialColorId,
          year,
          month,
          page: pageNum,
          limit: 10,
        });

        if (newLogs.length < 10) {
          setHasMore(false);
        }

        setLogs((prev) => (pageNum === 1 ? newLogs : [...prev, ...newLogs]));
      } catch (err) {
        console.error("Failed to load logs:", err);
      } finally {
        setIsLoadingLogs(false);
      }
    },
    [modalConfig, isLoadingLogs, vendorId, year, month],
  );

  useEffect(() => {
    if (modalConfig) {
      fetchLogs(1);
    }
  }, [modalConfig]);

  useEffect(() => {
    const target = observerTarget.current;
    if (!target || !hasMore || isLoadingLogs) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingLogs) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchLogs(nextPage);
        }
      },
      { threshold: 0.5 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, isLoadingLogs, page, fetchLogs]);

  const getMovementBadge = (type: string) => {
    switch (type.toLowerCase()) {
      case "in":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5">
            <ArrowDownLeft className="w-3 h-3" /> STOK MASUK
          </span>
        );
      case "out":
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5">
            <ArrowUpRight className="w-3 h-3" /> STOK KELUAR
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5">
            <RefreshCw className="w-3 h-3" /> {type.toUpperCase()}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* HEADER & FILTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-200 dark:border-neutral-800 pb-6">
        <div>
          <h1 className="text-xl font-light tracking-[0.2em] text-neutral-900 dark:text-neutral-100 uppercase">
            LAPORAN PERGERAKAN STOK
          </h1>
          <p className="text-xs font-extralight tracking-wider text-neutral-500 uppercase mt-1">
            Monitoring Ringkasan Stok & Kartu Mutasi
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 px-3 py-1.5 text-xs">
            <Calendar className="w-4 h-4 text-neutral-500" />
            <select
              value={month}
              onChange={(e) =>
                handleFilterDateChange(year, Number(e.target.value))
              }
              className="bg-transparent text-neutral-900 dark:text-neutral-100 font-light focus:outline-none"
            >
              {MONTHS.map((m, idx) => (
                <option
                  key={idx}
                  value={idx + 1}
                  className="bg-neutral-900 text-white"
                >
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) =>
                handleFilterDateChange(Number(e.target.value), month)
              }
              className="bg-transparent text-neutral-900 dark:text-neutral-100 font-light focus:outline-none border-l border-neutral-300 dark:border-neutral-700 pl-2"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-neutral-900 text-white">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveTab("MATERIAL")}
          className={`flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase transition-colors border-b-2 ${
            activeTab === "MATERIAL"
              ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-medium"
              : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          <Boxes className="w-4 h-4" /> RINGKASAN STOK BAHAN
        </button>
        <button
          onClick={() => setActiveTab("PRODUCT")}
          className={`flex items-center gap-2 px-6 py-3 text-xs tracking-widest uppercase transition-colors border-b-2 ${
            activeTab === "PRODUCT"
              ? "border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100 font-medium"
              : "border-transparent text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300"
          }`}
        >
          <Shirt className="w-4 h-4" /> RINGKASAN STOK PRODUK
        </button>
      </div>

      {/* TAB 1: BAHAN BAKU */}
      {activeTab === "MATERIAL" && (
        <div className="space-y-4">
          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
            {initialData.materials.map((mat) => {
              const isOpen = openMaterialAccordion === mat.id;

              return (
                <div key={mat.id}>
                  <div
                    onClick={() =>
                      mat.hasColors &&
                      setOpenMaterialAccordion(isOpen ? null : mat.id)
                    }
                    className={`p-4 flex items-center justify-between gap-4 ${
                      mat.hasColors
                        ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <Boxes className="w-5 h-5 text-neutral-400 shrink-0" />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal text-neutral-900 dark:text-neutral-100">
                            {mat.name}
                          </span>
                          <span className="text-[9px] px-2 py-0.5 uppercase bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400">
                            {mat.category}
                          </span>
                        </div>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          Satuan Pakai:{" "}
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {mat.baseUnitName}
                          </span>{" "}
                          &bull; Satuan Beli:{" "}
                          <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                            {mat.purchaseUnitName}
                          </span>{" "}
                          (1 {mat.purchaseUnitName} ={" "}
                          {formatQty(mat.conversionValue)} {mat.baseUnitName})
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500">
                          Total Stok Saat Ini
                        </p>
                        <p className="text-xs font-normal text-neutral-900 dark:text-neutral-100">
                          {formatQty(mat.totalStock)} {mat.baseUnitName}
                        </p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extralight">
                          &asymp; {formatQty(mat.totalPurchaseStock)}{" "}
                          {mat.purchaseUnitName}
                        </p>
                      </div>

                      {!mat.hasColors ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenModal({
                              title: `KARTU STOK: ${mat.name}`,
                              subtitle: `Kategori: ${mat.category.toUpperCase()}`,
                              unitName: mat.baseUnitName,
                              itemType: "MATERIAL",
                              itemId: mat.id,
                            });
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[10px] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase tracking-wider"
                        >
                          <History className="w-3 h-3 text-neutral-500" /> KARTU
                          STOK
                        </button>
                      ) : isOpen ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {mat.hasColors && isOpen && (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/20 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
                      {mat.colors.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-3 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950"
                        >
                          <span className="text-xs font-normal text-neutral-800 dark:text-neutral-200">
                            Warna: {c.colorName}
                          </span>

                          <div className="flex items-center gap-6">
                            <div className="text-right">
                              <span className="text-xs text-neutral-500 block">
                                Stok:{" "}
                                <strong className="text-neutral-900 dark:text-neutral-100">
                                  {formatQty(c.stock)} {mat.baseUnitName}
                                </strong>
                              </span>
                              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-extralight block">
                                &asymp; {formatQty(c.purchaseStock)}{" "}
                                {mat.purchaseUnitName}
                              </span>
                            </div>

                            <button
                              onClick={() =>
                                handleOpenModal({
                                  title: `KARTU STOK: ${mat.name} (${c.colorName})`,
                                  subtitle: `Warna: ${c.colorName}`,
                                  unitName: mat.baseUnitName,
                                  itemType: "MATERIAL",
                                  itemId: mat.id,
                                  materialColorId: c.id,
                                })
                              }
                              className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase tracking-wider"
                            >
                              <History className="w-3 h-3 text-neutral-500" />{" "}
                              KARTU STOK
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
        </div>
      )}

      {/* TAB 2: PRODUK */}
      {activeTab === "PRODUCT" && (
        <div className="space-y-4">
          <div className="border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-neutral-950">
            {initialData.products.map((prod) => {
              const isOpen = openProductAccordion === prod.id;

              return (
                <div key={prod.id}>
                  <div
                    onClick={() =>
                      setOpenProductAccordion(isOpen ? null : prod.id)
                    }
                    className="p-4 flex items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                  >
                    <div className="flex items-center gap-4">
                      <Shirt className="w-5 h-5 text-neutral-400" />
                      <div>
                        <p className="text-xs font-normal text-neutral-900 dark:text-neutral-100">
                          {prod.name}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">
                          {prod.variants.length} Varian SKU
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-[10px] text-neutral-500">
                          Stok Gabungan
                        </p>
                        <p className="text-xs font-normal text-neutral-900 dark:text-neutral-100">
                          {formatQty(prod.totalStock)} Pcs
                        </p>
                      </div>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-neutral-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-neutral-500" />
                      )}
                    </div>
                  </div>

                  {isOpen && (
                    <div className="p-4 bg-neutral-50 dark:bg-neutral-900/20 border-t border-neutral-200 dark:border-neutral-800">
                      <table className="w-full text-left text-[11px] font-light">
                        <thead>
                          <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[9px] tracking-wider">
                            <th className="pb-2">SKU</th>
                            <th className="pb-2">BARCODE</th>
                            <th className="pb-2">VARIAN</th>
                            <th className="pb-2 text-right">STOK SAAT INI</th>
                            <th className="pb-2 text-center">AKSI</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-200/50 dark:divide-neutral-800/50">
                          {prod.variants.map((v) => (
                            <tr
                              key={v.id}
                              className="text-neutral-700 dark:text-neutral-300"
                            >
                              <td className="py-2.5 font-normal">{v.sku}</td>
                              <td className="py-2.5 text-neutral-500">
                                {v.barcode || "-"}
                              </td>
                              <td className="py-2.5">
                                {v.colorName} / {v.sizeName}
                              </td>
                              <td className="py-2.5 text-right font-medium">
                                {formatQty(v.stock)} Pcs
                              </td>
                              <td className="py-2.5 text-center">
                                <button
                                  onClick={() =>
                                    handleOpenModal({
                                      title: `KARTU STOK: ${v.sku}`,
                                      subtitle: `${prod.name} (${v.colorName} / ${v.sizeName})`,
                                      unitName: "Pcs",
                                      itemType: "PRODUCT",
                                      itemId: v.id,
                                    })
                                  }
                                  className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 uppercase tracking-wider"
                                >
                                  <History className="w-3 h-3 text-neutral-500" />{" "}
                                  KARTU STOK
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL KARTU STOK DENGAN INFINITE SCROLL */}
      {modalConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 w-full max-w-3xl shadow-2xl space-y-4 p-6">
            <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-4">
              <div>
                <h3 className="text-sm font-normal text-neutral-900 dark:text-neutral-100 uppercase tracking-widest">
                  {modalConfig.title}
                </h3>
                <p className="text-[10px] text-neutral-500 mt-0.5">
                  {modalConfig.subtitle} &bull; Periode: {MONTHS[month - 1]}{" "}
                  {year}
                </p>
              </div>
              <button
                onClick={() => setModalConfig(null)}
                className="p-1 hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded"
              >
                <X className="w-5 h-5 text-neutral-500" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-1">
              <table className="w-full text-left text-[11px]">
                <thead>
                  <tr className="text-neutral-500 text-[9px] uppercase border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-950 z-10">
                    <th className="pb-2">TIPE MUTASI</th>
                    <th className="pb-2 text-right">QTY</th>
                    <th className="pb-2 text-right">SEBELUM</th>
                    <th className="pb-2 text-right">SESUDAH</th>
                    <th className="pb-2 pl-4">REFERENSI & CATATAN</th>
                    <th className="pb-2 text-right">TANGGAL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                  {logs.map((m) => (
                    <tr
                      key={m.id}
                      className="text-neutral-700 dark:text-neutral-300"
                    >
                      <td className="py-2.5">{getMovementBadge(m.type)}</td>
                      <td className="py-2.5 text-right font-medium">
                        {formatQty(m.quantity)} {modalConfig.unitName}
                      </td>
                      <td className="py-2.5 text-right text-neutral-500">
                        {formatQty(m.stockBefore)}
                      </td>
                      <td className="py-2.5 text-right text-neutral-500">
                        {formatQty(m.stockAfter)}
                      </td>
                      <td className="py-2.5 pl-4 text-neutral-500">
                        <span className="uppercase text-[9px] text-neutral-400 block">
                          {m.referenceType || "-"}
                        </span>
                        {m.notes || "-"}
                      </td>
                      <td className="py-2.5 text-right text-neutral-500">
                        {new Date(m.createdAt).toLocaleString("id-ID")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div ref={observerTarget} className="py-4 text-center">
                {isLoadingLogs && (
                  <div className="flex items-center justify-center gap-2 text-xs text-neutral-500">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat data
                    mutasi...
                  </div>
                )}
                {!hasMore && logs.length > 0 && (
                  <p className="text-[10px] text-neutral-400 uppercase tracking-wider">
                    -- Semua riwayat mutasi telah ditampilkan --
                  </p>
                )}
                {!isLoadingLogs && logs.length === 0 && (
                  <p className="text-xs text-neutral-500 py-6">
                    Tidak ada riwayat pergerakan stok pada bulan terpilih
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
              <button
                onClick={() => setModalConfig(null)}
                className="px-4 py-2 bg-neutral-900 text-neutral-50 dark:bg-neutral-100 dark:text-neutral-900 text-xs font-light tracking-wider uppercase"
              >
                TUTUP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
