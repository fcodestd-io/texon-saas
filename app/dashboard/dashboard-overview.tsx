"use client";

import { useState } from "react";
import CountUp from "react-countup";
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
  EyeOff,
  Filter,
  ArrowUpRight,
} from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface DashboardOverviewProps {
  isOwner: boolean;
}

export function DashboardOverview({ isOwner }: DashboardOverviewProps) {
  const [selectedMonth, setSelectedMonth] = useState("09");
  const [selectedYear, setSelectedYear] = useState("2026");

  // Helper untuk mendapatkan jumlah hari dalam bulan yang dipilih
  const getDaysInMonth = (monthStr: string, yearStr: string) => {
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    return new Date(year, month, 0).getDate();
  };

  const totalDays = getDaysInMonth(selectedMonth, selectedYear);

  // Generate label tanggal harian (Tgl 1 - Tgl Akhir Bulan)
  const dailyLabels = Array.from(
    { length: totalDays },
    (_, i) => `Tgl ${i + 1}`,
  );

  // Mock data omset & laba harian untuk visualisasi grafik
  const mockDailyOmset = Array.from({ length: totalDays }, (_, i) =>
    Math.floor(3000000 + Math.sin(i) * 1500000 + (i % 5) * 800000),
  );

  const mockDailyLaba = mockDailyOmset.map((val) => Math.floor(val * 0.28));

  const chartData = {
    labels: dailyLabels,
    datasets: [
      {
        label: "Omset Harian (Rp)",
        data: mockDailyOmset,
        backgroundColor: "rgba(23, 23, 23, 0.9)",
        borderColor: "#171717",
        borderWidth: 1,
      },
      {
        label: "Laba Bersih Harian (Rp)",
        data: mockDailyLaba,
        backgroundColor: "rgba(163, 163, 163, 0.5)",
        borderColor: "#737373",
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
          font: { family: "var(--font-jakarta), sans-serif", size: 11 },
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
        ticks: { font: { size: 9 }, maxRotation: 45, minRotation: 0 },
      },
      y: {
        grid: { color: "rgba(212, 212, 212, 0.2)" },
        ticks: {
          font: { size: 10 },
          callback: (value: any) => `Rp ${(value / 1000000).toFixed(1)}Jt`,
        },
      },
    },
  };

  return (
    <div className="space-y-10">
      {/* Control Bar: Filter Bulan & Tahun */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <h2 className="text-sm font-light uppercase tracking-wider text-neutral-900 dark:text-neutral-100">
            METRIKS & ANALISIS OPERASIONAL
          </h2>
          <p className="text-xs font-extralight text-neutral-500">
            Periode Tampilan: Bulan {selectedMonth} / {selectedYear} (
            {totalDays} Hari)
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5">
            <Filter className="w-3.5 h-3.5 text-neutral-400" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-light focus:outline-none text-neutral-900 dark:text-neutral-100 cursor-pointer"
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

          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-1.5">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-light focus:outline-none text-neutral-900 dark:text-neutral-100 cursor-pointer"
            >
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="2026">2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid 4 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Omset Penjualan */}
        {isOwner ? (
          <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-3 bg-white dark:bg-neutral-900/40">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-extralight tracking-widest uppercase">
                OMSET PENJUALAN
              </span>
              <DollarSign className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100">
              Rp{" "}
              <CountUp
                end={164000000}
                duration={1.5}
                separator="."
                decimal=","
              />
            </p>
            <p className="text-[10px] font-extralight text-emerald-600 dark:text-emerald-400">
              +14.2% dibanding periode sebelumnya
            </p>
          </div>
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-3 bg-neutral-100/50 dark:bg-neutral-900/20 opacity-70">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-extralight tracking-widest uppercase">
                OMSET PENJUALAN
              </span>
              <EyeOff className="w-4 h-4" />
            </div>
            <p className="text-sm font-light text-neutral-400 italic">
              Akses terbatas untuk Admin
            </p>
            <p className="text-[10px] font-extralight text-neutral-400">
              Membutuhkan hak akses Owner
            </p>
          </div>
        )}

        {/* Card 2: Laba Bersih */}
        {isOwner ? (
          <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-3 bg-white dark:bg-neutral-900/40">
            <div className="flex items-center justify-between text-neutral-500">
              <span className="text-[10px] font-extralight tracking-widest uppercase">
                ESTIMASI LABA BERSIH
              </span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100">
              Rp{" "}
              <CountUp
                end={48900000}
                duration={1.5}
                separator="."
                decimal=","
              />
            </p>
            <p className="text-[10px] font-extralight text-emerald-600 dark:text-emerald-400">
              Margin bersih ~29.8%
            </p>
          </div>
        ) : (
          <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-3 bg-neutral-100/50 dark:bg-neutral-900/20 opacity-70">
            <div className="flex items-center justify-between text-neutral-400">
              <span className="text-[10px] font-extralight tracking-widest uppercase">
                ESTIMASI LABA BERSIH
              </span>
              <EyeOff className="w-4 h-4" />
            </div>
            <p className="text-sm font-light text-neutral-400 italic">
              Akses terbatas untuk Admin
            </p>
            <p className="text-[10px] font-extralight text-neutral-400">
              Membutuhkan hak akses Owner
            </p>
          </div>
        )}

        {/* Card 3: Total Qty Terjual */}
        <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-3 bg-white dark:bg-neutral-900/40">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-extralight tracking-widest uppercase">
              TOTAL QTY TERJUAL
            </span>
            <Shirt className="w-4 h-4 text-neutral-500" />
          </div>
          <p className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100">
            <CountUp end={3850} duration={1.5} separator="." />{" "}
            <span className="text-xs font-light text-neutral-500">Pcs</span>
          </p>
          <p className="text-[10px] font-extralight text-neutral-500">
            Terdistribusi ke kanal marketplace
          </p>
        </div>

        {/* Card 4: Total Stok Barang Ready */}
        <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-3 bg-white dark:bg-neutral-900/40">
          <div className="flex items-center justify-between text-neutral-500">
            <span className="text-[10px] font-extralight tracking-widest uppercase">
              TOTAL STOK BARANG READY
            </span>
            <PackageCheck className="w-4 h-4 text-neutral-500" />
          </div>
          <p className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100">
            <CountUp end={5420} duration={1.5} separator="." />{" "}
            <span className="text-xs font-light text-neutral-500">Pcs</span>
          </p>
          <p className="text-[10px] font-extralight text-neutral-500">
            Pakaian jadi di etalase siap kirim
          </p>
        </div>
      </div>

      {/* Grafik Batang Per Hari (Tgl 1 - Tgl Akhir Bulan) */}
      <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 bg-white dark:bg-neutral-900/40 space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800/80">
          <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100">
            GRAFIK HARIAN OMSET & LABA BERSIH (TGL 1 - {totalDays})
          </h3>
          <span className="text-[10px] font-extralight text-neutral-400 uppercase">
            {isOwner ? "AKSES OWNER VERIFIED" : "DISEMBUNYIKAN UNTUK ADMIN"}
          </span>
        </div>

        <div className="h-80 w-full">
          {isOwner ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <div className="h-full flex items-center justify-center bg-neutral-100/30 dark:bg-neutral-900/20 border border-dashed border-neutral-200 dark:border-neutral-800">
              <p className="text-xs font-light text-neutral-400 italic flex items-center gap-2">
                <EyeOff className="w-4 h-4" /> Grafik pendapatan harian
                disembunyikan untuk akses Admin.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Tabel Singkat Ringkasan */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Tabel Top Selling Products */}
        <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800/80 flex justify-between items-center">
            <span className="text-xs font-extralight tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <PackageCheck className="w-3.5 h-3.5 text-neutral-400" />
              PRODUK TERLARIS (TOP SALES)
            </span>
            <span className="text-[10px] font-extralight text-neutral-400">
              BULAN {selectedMonth}/{selectedYear}
            </span>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80 text-xs font-light">
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <p className="text-neutral-900 dark:text-neutral-100">
                  Mukena Silk Premium (MKN-SLK-BLK)
                </p>
                <p className="text-[10px] text-neutral-500">Varian: Black</p>
              </div>
              <span className="font-normal text-neutral-900 dark:text-neutral-100">
                1.240 Pcs
              </span>
            </div>
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <p className="text-neutral-900 dark:text-neutral-100">
                  Hoodie Oversize Heavyweight (HD-OVS-GREY)
                </p>
                <p className="text-[10px] text-neutral-500">
                  Varian: Light Grey
                </p>
              </div>
              <span className="font-normal text-neutral-900 dark:text-neutral-100">
                890 Pcs
              </span>
            </div>
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <p className="text-neutral-900 dark:text-neutral-100">
                  Gamis Rayon Premium (GMS-RYN-NVY)
                </p>
                <p className="text-[10px] text-neutral-500">Varian: Navy</p>
              </div>
              <span className="font-normal text-neutral-900 dark:text-neutral-100">
                650 Pcs
              </span>
            </div>
          </div>
        </div>

        {/* Tabel Status SPK Produksi Aktif */}
        <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800/80 flex justify-between items-center">
            <span className="text-xs font-extralight tracking-widest text-neutral-500 uppercase flex items-center gap-2">
              <Shirt className="w-3.5 h-3.5 text-neutral-400" />
              STATUS SPK PRODUKSI AKTIF
            </span>
            <a
              href="#"
              className="text-[10px] font-extralight text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 flex items-center gap-0.5"
            >
              LIHAT SEMUA <ArrowUpRight className="w-3 h-3" />
            </a>
          </div>
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80 text-xs font-light">
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <p className="text-neutral-900 dark:text-neutral-100">
                  SPK-2026-0901 (Kemeja Linen)
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tahap: Sewing (Penjahitan)
                </p>
              </div>
              <span className="text-[10px] border border-emerald-300 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 px-2 py-0.5">
                ON PROGRESS (80%)
              </span>
            </div>
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <p className="text-neutral-900 dark:text-neutral-100">
                  SPK-2026-0902 (Mukena Travel)
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tahap: Cutting (Pemotongan)
                </p>
              </div>
              <span className="text-[10px] border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 px-2 py-0.5">
                CUTTING (35%)
              </span>
            </div>
            <div className="p-3.5 flex justify-between items-center">
              <div>
                <p className="text-neutral-900 dark:text-neutral-100">
                  SPK-2026-0903 (Kaos Polos Combed)
                </p>
                <p className="text-[10px] text-neutral-500">
                  Tahap: Finishing & QC
                </p>
              </div>
              <span className="text-[10px] border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 px-2 py-0.5">
                QC CHECK
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
