"use client";

import { useEffect, useRef } from "react";
import {
  Chart,
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { DailyChartData } from "./action";

Chart.register(
  BarController,
  BarElement,
  DoughnutController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

interface SalesChartProps {
  marketplaceShare: { name: string; totalQty: number; netOmset: number }[];
  dailyChart: DailyChartData[];
}

export function SalesChart({ marketplaceShare, dailyChart }: SalesChartProps) {
  const doughnutCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const barCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const doughnutChartRef = useRef<Chart | null>(null);
  const barChartRef = useRef<Chart | null>(null);

  useEffect(() => {
    // 1. DONUT CHART (Marketplace Share)
    if (doughnutCanvasRef.current) {
      if (doughnutChartRef.current) doughnutChartRef.current.destroy();

      const ctxDoughnut = doughnutCanvasRef.current.getContext("2d");
      if (ctxDoughnut) {
        doughnutChartRef.current = new Chart(ctxDoughnut, {
          type: "doughnut",
          data: {
            labels: marketplaceShare.map((m) => m.name),
            datasets: [
              {
                data: marketplaceShare.map((m) => m.netOmset),
                backgroundColor: [
                  "#3b82f6",
                  "#10b981",
                  "#f59e0b",
                  "#8b5cf6",
                  "#ec4899",
                ],
                borderWidth: 1,
                borderColor: "#171717",
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: "#a3a3a3", font: { size: 11 } },
              },
            },
          },
        });
      }
    }

    // 2. DAILY BAR CHART (Tanggal 1 s/d 30/31)
    if (barCanvasRef.current) {
      if (barChartRef.current) barChartRef.current.destroy();

      const ctxBar = barCanvasRef.current.getContext("2d");
      if (ctxBar) {
        barChartRef.current = new Chart(ctxBar, {
          type: "bar",
          data: {
            labels: dailyChart.map((d) => `Tgl ${d.day}`),
            datasets: [
              {
                label: "Net Omset",
                data: dailyChart.map((d) => d.netOmset),
                backgroundColor: "#10b981",
                borderRadius: 2,
              },
              {
                label: "Nominal Return",
                data: dailyChart.map((d) => d.returnAmount),
                backgroundColor: "#ef4444",
                borderRadius: 2,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: "bottom",
                labels: { color: "#a3a3a3", font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const val = ctx.parsed.y || 0;
                    return `${ctx.dataset.label}: Rp ${val.toLocaleString("id-ID")}`;
                  },
                },
              },
            },
            scales: {
              x: {
                barPercentage: 0.85,
                categoryPercentage: 0.8,
                grid: { display: false },
                ticks: { color: "#a3a3a3", font: { size: 9 } },
              },
              y: {
                grid: { color: "rgba(255, 255, 255, 0.08)" },
                ticks: {
                  color: "#a3a3a3",
                  font: { size: 10 },
                  callback: (value) => `Rp ${Number(value) / 1000}k`,
                },
              },
            },
          },
        });
      }
    }

    return () => {
      if (doughnutChartRef.current) doughnutChartRef.current.destroy();
      if (barChartRef.current) barChartRef.current.destroy();
    };
  }, [marketplaceShare, dailyChart]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* DONUT CHART */}
      <div className="lg:col-span-1 p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
        <h3 className="text-xs font-light tracking-widest text-neutral-500 uppercase mb-4">
          PANGSA MARKETPLACE (NET OMSET)
        </h3>
        <div className="w-full h-[320px] relative">
          <canvas ref={doughnutCanvasRef} />
        </div>
      </div>

      {/* BAR CHART HARIAN (1–30/31) */}
      <div className="lg:col-span-2 p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
        <h3 className="text-xs font-light tracking-widest text-neutral-500 uppercase mb-4">
          GRAFIK OMSET VS RETURN HARIAN
        </h3>
        <div className="w-full h-[320px] relative">
          <canvas ref={barCanvasRef} />
        </div>
      </div>
    </div>
  );
}
