"use client";

import { useState, useEffect } from "react";
import CountUp from "react-countup";
import {
  getCashflowMetricsAction,
  getCashflowLogsPaginatedAction,
  CashflowLogItem,
} from "./action";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Filter,
  Loader2,
  Receipt,
  UserCheck,
  PackageCheck,
  RotateCcw,
  ChevronDown,
  Wallet,
} from "lucide-react";

interface CashflowPageClientProps {
  initialMonth: string;
  initialYear: string;
  initialMetrics: {
    totalCashIn: number;
    totalCashOut: number;
    netCashflow: number;
  };
  initialLogs: {
    items: CashflowLogItem[];
    hasMore: boolean;
  };
}

export function CashflowPageClient({
  initialMonth,
  initialYear,
  initialMetrics,
  initialLogs,
}: CashflowPageClientProps) {
  const [selectedMonth, setSelectedMonth] = useState(initialMonth);
  const [selectedYear, setSelectedYear] = useState(initialYear);
  const [filterType, setFilterType] = useState<"ALL" | "IN" | "OUT">("ALL");

  const [metrics, setMetrics] = useState(initialMetrics);
  const [logs, setLogs] = useState<CashflowLogItem[]>(initialLogs.items);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialLogs.hasMore);

  const [isLoadingMetrics, setIsLoadingMetrics] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Fetch ulang data ketika bulan/tahun/filter tipe berubah
  useEffect(() => {
    setIsLoadingMetrics(true);
    setIsLoadingLogs(true);

    getCashflowMetricsAction(selectedMonth, selectedYear).then((res) => {
      if (res) setMetrics(res);
      setIsLoadingMetrics(false);
    });

    setPage(1);
    getCashflowLogsPaginatedAction(
      selectedMonth,
      selectedYear,
      1,
      10,
      filterType,
    ).then((res) => {
      setLogs(res.items);
      setHasMore(res.hasMore);
      setIsLoadingLogs(false);
    });
  }, [selectedMonth, selectedYear, filterType]);

  // Load More Infinite Scroll
  const handleLoadMore = () => {
    if (!hasMore || isLoadingLogs) return;

    const nextPage = page + 1;
    setIsLoadingLogs(true);
    getCashflowLogsPaginatedAction(
      selectedMonth,
      selectedYear,
      nextPage,
      10,
      filterType,
    ).then((res) => {
      setLogs((prev) => [...prev, ...res.items]);
      setHasMore(res.hasMore);
      setPage(nextPage);
      setIsLoadingLogs(false);
    });
  };

  return (
    <div className="space-y-6 text-xs font-mono max-w-6xl mx-auto p-4">
      {/* CONTROL BAR FILTER */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-neutral-800">
        <div>
          <span className="text-[9px] tracking-widest text-amber-500 uppercase font-bold block">
            LAPORAN KAS & KEUANGAN
          </span>
          <h1 className="text-sm font-bold text-neutral-100 uppercase">
            ARUS KAS (CASHFLOW)
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {(isLoadingMetrics || isLoadingLogs) && (
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
          )}

          <div className="flex items-center gap-2 border border-neutral-800 bg-neutral-900 px-3 py-1.5 rounded focus-within:border-amber-500">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-neutral-900 text-xs font-mono focus:outline-none text-neutral-100 cursor-pointer"
            >
              <option value="01">Januari</option>
              <option value="02">Februari</option>
              <option value="03">Maret</option>
              <option value="04">April</option>
              <option value="05">Mei</option>
              <option value="06">Juni</option>
              <option value="07">Juli</option>
              <option value="08">Agustus</option>
              <option value="09">September</option>
              <option value="10">Oktober</option>
              <option value="11">November</option>
              <option value="12">Desember</option>
            </select>
          </div>

          <div className="border border-neutral-800 bg-neutral-900 px-3 py-1.5 rounded focus-within:border-amber-500">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-neutral-900 text-xs font-mono focus:outline-none text-neutral-100 cursor-pointer"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* 2 CARDS UTAMA DENGAN ANIMASI AUTOCOUNT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CARD UANG MASUK */}
        <div className="border border-neutral-800 p-5 space-y-2 bg-neutral-900/60 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              TOTAL UANG MASUK
            </span>
            <div className="p-1.5 rounded bg-emerald-950/60 border border-emerald-800 text-emerald-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-emerald-400">
            Rp{" "}
            <CountUp
              end={metrics.totalCashIn}
              duration={1.2}
              separator="."
              decimal=","
            />
          </p>
          <p className="text-[10px] text-neutral-500">
            Penjualan bersih (setelah dipotong fee marketplace & retur)
          </p>
        </div>

        {/* CARD UANG KELUAR */}
        <div className="border border-neutral-800 p-5 space-y-2 bg-neutral-900/60 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              TOTAL UANG KELUAR
            </span>
            <div className="p-1.5 rounded bg-red-950/60 border border-red-800 text-red-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tracking-tight text-red-400">
            Rp{" "}
            <CountUp
              end={metrics.totalCashOut}
              duration={1.2}
              separator="."
              decimal=","
            />
          </p>
          <p className="text-[10px] text-neutral-500">
            Akumulasi Pembelian PO Bahan Baku & Payroll Gaji Karyawan
          </p>
        </div>

        {/* CARD NET CASHFLOW */}
        <div className="border border-neutral-800 p-5 space-y-2 bg-neutral-900/60 rounded-xl">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">
              NET CASHFLOW (ARUS KAS BERSIH)
            </span>
            <div className="p-1.5 rounded bg-amber-950/60 border border-amber-800 text-amber-400">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <p
            className={`text-2xl font-bold font-mono tracking-tight ${
              metrics.netCashflow < 0 ? "text-red-500" : "text-amber-400"
            }`}
          >
            Rp{" "}
            <CountUp
              end={metrics.netCashflow}
              duration={1.2}
              separator="."
              decimal=","
            />
          </p>
          <p className="text-[10px] text-neutral-500">
            Selisih Uang Masuk dikurangi Uang Keluar
          </p>
        </div>
      </div>

      {/* LOG LIST CASHFLOW DENGAN INFINITE SCROLL */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl overflow-hidden space-y-3 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-neutral-800">
          <div>
            <h3 className="text-xs font-bold text-neutral-200 uppercase tracking-wider">
              RIWAYAT TRANSAKSI KAS
            </h3>
            <span className="text-[10px] text-neutral-500">
              PERIODE BULAN {selectedMonth} / {selectedYear}
            </span>
          </div>

          {/* TAB FILTER IN / OUT / ALL */}
          <div className="flex items-center gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-800 text-[10px] font-bold">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === "ALL"
                  ? "bg-amber-500 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              SEMUA
            </button>
            <button
              onClick={() => setFilterType("IN")}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === "IN"
                  ? "bg-emerald-500 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              UANG MASUK
            </button>
            <button
              onClick={() => setFilterType("OUT")}
              className={`px-3 py-1 rounded transition-colors ${
                filterType === "OUT"
                  ? "bg-red-500 text-neutral-950"
                  : "text-neutral-400 hover:text-neutral-200"
              }`}
            >
              UANG KELUAR
            </button>
          </div>
        </div>

        {/* LIST LOG TRANSAKSI */}
        <div className="divide-y divide-neutral-800">
          {logs.length === 0 && !isLoadingLogs ? (
            <div className="p-8 text-center text-neutral-500 italic">
              Belum ada riwayat transaksi kas pada periode/filter ini.
            </div>
          ) : (
            logs.map((item) => (
              <div
                key={item.id}
                className="py-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-neutral-800/30 px-2 rounded transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* ICON KATEGORI */}
                  <div className="p-2 rounded-lg bg-neutral-950 border border-neutral-800">
                    {item.category === "SALES" && (
                      <Receipt className="w-4 h-4 text-emerald-400" />
                    )}
                    {item.category === "RETURN" && (
                      <RotateCcw className="w-4 h-4 text-amber-400" />
                    )}
                    {item.category === "PO" && (
                      <PackageCheck className="w-4 h-4 text-blue-400" />
                    )}
                    {item.category === "PAYROLL" && (
                      <UserCheck className="w-4 h-4 text-purple-400" />
                    )}
                  </div>

                  <div>
                    <h4 className="font-bold text-neutral-100 text-xs">
                      {item.title}
                    </h4>
                    <div className="flex items-center gap-2 text-[10px] text-neutral-500 mt-0.5">
                      <span>
                        {new Date(item.date).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <span>•</span>
                      <span className="text-amber-500/90 font-semibold">
                        PIC: {item.operatorName}
                      </span>
                      <span>•</span>
                      <span>{item.notes}</span>
                    </div>
                  </div>
                </div>

                {/* NOMINAL KAS */}
                <div className="text-right w-full sm:w-auto">
                  <span
                    className={`text-sm font-bold block ${
                      item.amount < 0
                        ? "text-red-400"
                        : item.type === "IN"
                          ? "text-emerald-400"
                          : "text-red-400"
                    }`}
                  >
                    {item.amount < 0 ? "-" : item.type === "IN" ? "+" : "-"} Rp{" "}
                    {Math.abs(item.amount).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* TOMBOL INFINITE SCROLL */}
        {hasMore && (
          <div className="pt-3 border-t border-neutral-800 text-center">
            <button
              onClick={handleLoadMore}
              disabled={isLoadingLogs}
              className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold rounded text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {isLoadingLogs ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
              <span>TAMPILKAN LEBIH BANYAK LOG</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
