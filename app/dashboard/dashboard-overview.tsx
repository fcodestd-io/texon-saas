"use client";

import { useState, useEffect, Suspense } from "react";
import CountUp from "react-countup";
import {
  getDashboardMetricsAction,
  getTopProductsPaginatedAction,
} from "./action";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import {
  TrendingUp,
  DollarSign,
  Shirt,
  PackageCheck,
  Filter,
  Loader2,
  RotateCcw,
  Coins,
  ChevronDown,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

// Fallback Skeleton Component (Cards, Chart, dan Table Loader)
function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse font-mono">
      {/* 1. Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="border border-neutral-800 p-5 space-y-3 bg-neutral-900/60 rounded-xl"
          >
            <div className="flex justify-between items-center">
              <div className="h-3 w-28 bg-neutral-800 rounded"></div>
              <div className="h-4 w-4 bg-neutral-800 rounded-full"></div>
            </div>
            <div className="h-8 w-40 bg-neutral-800 rounded"></div>
            <div className="h-3 w-32 bg-neutral-800 rounded"></div>
          </div>
        ))}
      </div>

      {/* 2. Chart Skeleton */}
      <div className="border border-neutral-800 p-5 bg-neutral-900/60 rounded-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
          <div className="h-4 w-64 bg-neutral-800 rounded"></div>
          <div className="h-3 w-24 bg-neutral-800 rounded"></div>
        </div>
        <div className="h-72 w-full bg-neutral-950/60 rounded flex flex-col items-center justify-center gap-2 border border-neutral-800/50">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
          <span className="text-xs text-neutral-500">
            Kalkulasi Data & Agregasi Grafik...
          </span>
        </div>
      </div>

      {/* 3. Table Skeleton */}
      <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl p-4 space-y-3">
        <div className="flex justify-between items-center pb-3 border-b border-neutral-800">
          <div className="h-4 w-48 bg-neutral-800 rounded"></div>
          <div className="h-3 w-20 bg-neutral-800 rounded"></div>
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 w-full bg-neutral-950/60 rounded border border-neutral-800/40 flex justify-between items-center px-4"
            >
              <div className="space-y-1">
                <div className="h-3 w-36 bg-neutral-800 rounded"></div>
                <div className="h-2 w-20 bg-neutral-800 rounded"></div>
              </div>
              <div className="h-6 w-24 bg-neutral-800 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardContent() {
  const [selectedMonth, setSelectedMonth] = useState("09");
  const [selectedYear, setSelectedYear] = useState("2026");
  const [isLoading, setIsLoading] = useState(true);

  const [metrics, setMetrics] = useState<{
    grossOmset: number;
    returnOmset: number;
    netOmset: number;
    totalHpp: number;
    netProfit: number;
    totalQtySold: number;
    totalQtyReturned: number;
    totalDaysInMonth: number;
    chartDailyOmset: number[];
  } | null>(null);

  const [productsList, setProductsList] = useState<
    Array<{ productName: string; sku: string; totalQty: number }>
  >([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setMetrics(null); // Reset ke null agar memicu Suspense/Skeleton saat berpindah bulan

    Promise.all([
      getDashboardMetricsAction(selectedMonth, selectedYear),
      getTopProductsPaginatedAction(selectedMonth, selectedYear, 1, 5),
    ]).then(([metricsData, productsRes]) => {
      if (!isMounted) return;

      if (metricsData) {
        setMetrics(metricsData);
      }
      if (productsRes) {
        setProductsList(productsRes.items);
        setHasMore(productsRes.hasMore);
        setPage(1);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [selectedMonth, selectedYear]);

  const fetchProducts = async (pageNum: number) => {
    setIsLoadingProducts(true);
    const res = await getTopProductsPaginatedAction(
      selectedMonth,
      selectedYear,
      pageNum,
      5,
    );

    setProductsList((prev) => [...prev, ...res.items]);
    setHasMore(res.hasMore);
    setIsLoadingProducts(false);
  };

  const handleLoadMore = () => {
    if (!hasMore || isLoadingProducts) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchProducts(nextPage);
  };

  // Pengecekan kondisi data belum termuat / metrics masih null
  const isDataNotFullyLoaded = isLoading || metrics === null;

  const dailyLabels = Array.from(
    { length: metrics?.totalDaysInMonth || 30 },
    (_, i) => `Tgl ${i + 1}`,
  );

  const profitRatio =
    (metrics?.netOmset || 0) > 0
      ? (metrics?.netProfit || 0) / (metrics?.netOmset || 1)
      : 0;

  const chartDailyProfit = (metrics?.chartDailyOmset || []).map((val) =>
    Math.round(val * profitRatio),
  );

  const chartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: "Omset Bersih Harian (Rp)",
        data: metrics?.chartDailyOmset || [],
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderColor: "#10b981",
        borderWidth: 1,
      },
      {
        label: "Keuntungan Harian (Rp)",
        data: chartDailyProfit,
        backgroundColor:
          profitRatio < 0.1
            ? "rgba(239, 68, 68, 0.8)"
            : "rgba(245, 158, 11, 0.8)",
        borderColor: profitRatio < 0.1 ? "#ef4444" : "#f59e0b",
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
        labels: {
          font: { family: "monospace", size: 11 },
          color: "#a3a3a3",
          boxWidth: 12,
        },
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const val = context.raw || 0;
            return ` ${context.dataset.label}: Rp ${val.toLocaleString("id-ID")}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#737373", font: { size: 9 } },
      },
      y: {
        grid: { color: "rgba(38, 38, 38, 0.6)" },
        ticks: {
          color: "#737373",
          font: { size: 10 },
          callback: (value: any) => `Rp ${(value / 1000000).toFixed(1)}Jt`,
        },
      },
    },
  };

  return (
    <div className="space-y-6">
      {/* Control Bar Filter Periode */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-neutral-800">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-neutral-100 font-mono">
            METRIKS & ANALISIS OPERASIONAL
          </h2>
          <p className="text-xs font-light text-neutral-400 font-mono">
            Periode Tampilan: Bulan {selectedMonth} / {selectedYear}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isLoading && (
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

      {/* JIKA DATA BELUM TERMUAT SEPENUHNYA, TAMPILKAN SKELETON */}
      {isDataNotFullyLoaded ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Grid 4 Cards Utama */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* CARD 1: OMSET PENJUALAN */}
            <div className="border border-neutral-800/90 p-5 space-y-2 bg-neutral-900/60 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  OMSET PENJUALAN
                </span>
                <DollarSign className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight text-neutral-100">
                Rp{" "}
                <CountUp
                  end={metrics.grossOmset}
                  duration={1.2}
                  separator="."
                  decimal=","
                />
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-neutral-800/80">
                <span className="text-neutral-500">Nominal Retur:</span>
                <span className="font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/40 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" />
                  -Rp {metrics.returnOmset.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* CARD 2: HPP */}
            <div className="border border-neutral-800/90 p-5 space-y-2 bg-neutral-900/60 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  HPP (POKOK PRODUKSI)
                </span>
                <Coins className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-bold font-mono tracking-tight text-amber-400">
                Rp{" "}
                <CountUp
                  end={metrics.totalHpp}
                  duration={1.2}
                  separator="."
                  decimal=","
                />
              </p>
              <p className="text-[10px] font-mono text-neutral-500">
                BOM Material Bahan + Ongkos Jasa
              </p>
            </div>

            {/* CARD 3: KEUNTUNGAN BERSIH */}
            <div className="border border-neutral-800/90 p-5 space-y-2 bg-neutral-900/60 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  KEUNTUNGAN BERSIH
                </span>
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
              <p
                className={`text-2xl font-bold font-mono tracking-tight ${metrics.netProfit < 0 ? "text-red-500" : "text-emerald-400"}`}
              >
                Rp{" "}
                <CountUp
                  end={metrics.netProfit}
                  duration={1.2}
                  separator="."
                  decimal=","
                />
              </p>
              <p className="text-[10px] font-mono text-neutral-500">
                Selisih bersih (Omset - Retur - HPP)
              </p>
            </div>

            {/* CARD 4: QTY TERJUAL / RETUR */}
            <div className="border border-neutral-800/90 p-5 space-y-2 bg-neutral-900/60 rounded-xl shadow-sm">
              <div className="flex items-center justify-between text-neutral-500">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-neutral-400">
                  QTY TERJUAL / RETUR
                </span>
                <PackageCheck className="w-4 h-4 text-blue-500" />
              </div>
              <div className="flex items-baseline justify-between font-mono">
                <p className="text-2xl font-bold text-neutral-100">
                  <CountUp
                    end={metrics.totalQtySold}
                    duration={1.2}
                    separator="."
                  />{" "}
                  <span className="text-xs font-normal text-neutral-500">
                    Pcs
                  </span>
                </p>
                <div className="flex items-center gap-1 text-xs font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/50">
                  <RotateCcw className="w-3 h-3" />
                  <span>{metrics.totalQtyReturned} Retur</span>
                </div>
              </div>
              <p className="text-[10px] font-mono text-neutral-500">
                Total barang keluar & retur marketplace
              </p>
            </div>
          </div>

          {/* GRAFIK BAR CHART */}
          <div className="border border-neutral-800 p-5 bg-neutral-900/60 rounded-xl space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800 font-mono">
              <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                GRAFIK HARIAN OMSET BERSIH VS KEUNTUNGAN (TGL 1 -{" "}
                {metrics.totalDaysInMonth})
              </h3>
              <span className="text-[10px] text-neutral-500 uppercase">
                REALTIME REVENUE & PROFIT
              </span>
            </div>

            <div className="h-72 w-full pt-2">
              <Bar data={chartData} options={chartOptions} />
            </div>
          </div>

          {/* TABEL PRODUK TERLARIS */}
          <div className="border border-neutral-800 bg-neutral-900/60 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex justify-between items-center font-mono">
              <span className="text-xs font-bold tracking-wider text-amber-500 uppercase flex items-center gap-2">
                <Shirt className="w-4 h-4" />
                PRODUK TERLARIS PERIODE INI
              </span>
              <span className="text-[10px] text-neutral-500">
                BULAN {selectedMonth}/{selectedYear}
              </span>
            </div>

            <div className="divide-y divide-neutral-800 text-xs font-mono">
              {productsList.length === 0 && !isLoadingProducts ? (
                <div className="p-6 text-center text-neutral-500 italic">
                  Belum ada penjualan tercatat pada periode ini.
                </div>
              ) : (
                productsList.map((p, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 flex justify-between items-center hover:bg-neutral-800/40 transition-colors"
                  >
                    <div>
                      <p className="font-bold text-neutral-100">
                        {p.productName}
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        SKU: {p.sku}
                      </p>
                    </div>
                    <span className="font-bold text-amber-400 bg-amber-950/40 px-2 py-1 rounded border border-amber-900/50">
                      {p.totalQty.toLocaleString("id-ID")} Pcs Terjual
                    </span>
                  </div>
                ))
              )}
            </div>

            {hasMore && (
              <div className="p-3 border-t border-neutral-800 text-center font-mono">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadingProducts}
                  className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold rounded text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  {isLoadingProducts ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                  <span>TAMPILKAN LEBIH BANYAK</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Wrapper Suspense
export function DashboardOverview() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}
