"use client";

import { GenerateWidget } from "@/components/generate-widget"; // Sesuaikan komponen GenerateWidget Basekit

interface SalesReportChartsProps {
  marketplaceShare: { name: string; totalQty: number; netOmset: number }[];
  netOmset: number;
  returnAmount: number;
}

export function SalesReportCharts({
  marketplaceShare,
  netOmset,
  returnAmount,
}: SalesReportChartsProps) {
  return (
    <div className="grid grid-[#111] grid-cols-1 lg:grid-cols-2 gap-6">
      {/* DONUT CHART MARKETPLACE */}
      <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
        <h3 className="text-xs font-light tracking-widest text-neutral-500 uppercase mb-4">
          PANGSA MARKETPLACE TERLARIS (NET OMSET)
        </h3>
        <GenerateWidget type="inline_visualization" height="320px">
          ```
          <skills>chart</skills>

          **Idea:** Visualisasikan kontribusi omset bersih per marketplace dalam bentuk Donut Chart.
          **Visual type:** doughnut
          **Data specification:**
          - **Data structure:** { labels: string[], datasets: [{ data: number[] }] }
          - **Initial values:**
            labels: {JSON.stringify(marketplaceShare.map((m) => m.name))}
            data: {JSON.stringify(marketplaceShare.map((m) => m.netOmset))}
          **User controls:** None — hover/click for details
          **Interactivity:** Hover segmen untuk melihat detail persentase dan nominal omset.
          ```
        </GenerateWidget>
      </div>

      {/* BAR CHART OMSET VS RETURN */}
      <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50">
        <h3 className="text-xs font-light tracking-widest text-neutral-500 uppercase mb-4">
          PERBANDINGAN OMSET BERSIH VS RETURN
        </h3>
        <GenerateWidget type="inline_visualization" height="320px">
  
          <skills>chart</skills>

       
          { labels: string[], datasets: [{ label: string, data: number[] }] }
       
            labels: ["Metrik Keuangan"]
            datasets: [
              { label: "Net Omset", data: [{netOmset}] },
              { label: "Nominal Return", data: [{returnAmount}] }
            ]
          **User controls:** None — hover/click for details
          **Interactivity:** Hover batang untuk melihat angka eksak.

        </GenerateWidget>
      </div>
    </div>
  );
}