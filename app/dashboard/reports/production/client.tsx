"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { TargetWorkflowReportItem } from "./action";
import {
  Calendar,
  Loader2,
  ChevronDown,
  ChevronUp,
  Scissors,
  CheckCircle2,
  Clock,
  UserCheck,
} from "lucide-react";

interface ProductionWorkflowClientProps {
  initialData: TargetWorkflowReportItem[];
  initialYear: number;
  initialMonth: number;
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

export function ProductionWorkflowClient({
  initialData,
  initialYear,
  initialMonth,
}: ProductionWorkflowClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [openAccordion, setOpenAccordion] = useState<string | null>(
    initialData.length > 0 ? initialData[0].id : null,
  );

  const handleFilterDateChange = (newYear: number, newMonth: number) => {
    setYear(newYear);
    setMonth(newMonth);
    startTransition(() => {
      router.push(
        `/dashboard/reports/production?year=${newYear}&month=${newMonth}`,
      );
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "finished":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <CheckCircle2 className="w-3 h-3" /> SELESAI
          </span>
        );
      case "started":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            <Clock className="w-3 h-3" /> PROSES PRODUKSI
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[9px] uppercase bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-300">
            DIBATALKAN
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
            WORKFLOW & PIPELINE PRODUKSI
          </h1>
          <p className="text-xs font-extralight tracking-wider text-neutral-500 uppercase mt-1">
            Tracking Alur Target &rarr; Cutting &rarr; Sewing &rarr; Overdeck
            &rarr; Finishing &rarr; Masuk Gudang
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
          {isPending && (
            <Loader2 className="w-4 h-4 animate-spin text-neutral-500" />
          )}
        </div>
      </div>

      {/* PIPELINE CARDS ACCORDION */}
      <div className="space-y-4">
        {initialData.length === 0 ? (
          <div className="p-12 text-center border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 text-xs font-extralight text-neutral-500">
            TIDAK ADA SPK / TARGET CUTTING PADA BULAN TERPILIH
          </div>
        ) : (
          initialData.map((target) => {
            const isOpen = openAccordion === target.id;

            const totalTarget = target.items.reduce(
              (acc, i) => acc + i.targetQty,
              0,
            );
            const totalFinishing = target.items.reduce(
              (acc, i) => acc + i.finishingQty,
              0,
            );
            const totalIncoming = target.items.reduce(
              (acc, i) => acc + i.warehouseIncomingQty,
              0,
            );
            const progressPercent =
              totalTarget > 0
                ? Math.min(100, Math.round((totalIncoming / totalTarget) * 100))
                : 0;

            return (
              <div
                key={target.id}
                className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 transition-colors"
              >
                {/* ACCORDION HEADER TARGET */}
                <div
                  onClick={() => setOpenAccordion(isOpen ? null : target.id)}
                  className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/30"
                >
                  <div className="flex items-start gap-4">
                    <Scissors className="w-5 h-5 text-neutral-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-neutral-900 dark:text-neutral-100 tracking-wider">
                          {target.title}
                        </span>
                        {getStatusBadge(target.status)}
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-1">
                        Tgl Target:{" "}
                        <span className="text-neutral-700 dark:text-neutral-300 font-medium">
                          {target.targetDate}
                        </span>{" "}
                        &bull; Dibuat oleh: {target.createdByName}
                      </p>
                    </div>
                  </div>

                  {/* PROGRESS PIPELINE RINGKAS */}
                  <div className="flex items-center justify-between lg:justify-end gap-8">
                    <div className="text-right">
                      <p className="text-[10px] uppercase text-neutral-400 tracking-wider">
                        PROGRESS MASUK GUDANG
                      </p>
                      <p className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                        {totalIncoming} / {totalTarget} Pcs ({progressPercent}%)
                      </p>
                      <div className="w-32 bg-neutral-200 dark:bg-neutral-800 h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {isOpen ? (
                      <ChevronUp className="w-5 h-5 text-neutral-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-neutral-500" />
                    )}
                  </div>
                </div>

                {/* ACCORDION BODY WORKFLOW PIPELINE */}
                {isOpen && (
                  <div className="p-6 bg-neutral-50/50 dark:bg-neutral-900/20 border-t border-neutral-200 dark:border-neutral-800 space-y-8">
                    {/* VISUAL PIPELINE FLOW STEPPER */}
                    <div className="p-4 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                      <p className="text-[10px] uppercase font-light text-neutral-400 tracking-widest mb-4">
                        VISUALISASI STAGE PIPELINE PRODUKSI
                      </p>
                      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-center text-[11px]">
                        <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-900/50">
                          <span className="block text-[9px] text-neutral-400 uppercase">
                            1. TARGET CUTTING
                          </span>
                          <span className="font-medium text-neutral-900 dark:text-neutral-100">
                            {totalTarget} Pcs
                          </span>
                        </div>
                        <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300">
                          <span className="block text-[9px] uppercase opacity-75">
                            2. CUTTING
                          </span>
                          <span className="font-medium">Sesuai Part</span>
                        </div>
                        <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300">
                          <span className="block text-[9px] uppercase opacity-75">
                            3. SEWING
                          </span>
                          <span className="font-medium">Sesuai Part</span>
                        </div>
                        <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300">
                          <span className="block text-[9px] uppercase opacity-75">
                            4. OVERDECK
                          </span>
                          <span className="font-medium">Sesuai Part</span>
                        </div>
                        <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300">
                          <span className="block text-[9px] uppercase opacity-75">
                            5. FINISHING
                          </span>
                          <span className="font-medium">
                            {totalFinishing} Pcs
                          </span>
                        </div>
                        <div className="p-2 border border-neutral-200 dark:border-neutral-800 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300">
                          <span className="block text-[9px] uppercase opacity-75">
                            6. MASUK GUDANG
                          </span>
                          <span className="font-medium">
                            {totalIncoming} Pcs
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TABLE BREAKDOWN ITEM & PARTS WORKFLOW */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-normal tracking-wider text-neutral-700 dark:text-neutral-300 uppercase">
                        BREAKDOWN HASIL POKOK BARANG & POLA PART
                      </h4>

                      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-x-auto">
                        <table className="w-full text-left text-[11px] font-light">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[9px] tracking-wider bg-neutral-50 dark:bg-neutral-900/50">
                              <th className="p-3">PRODUK & VARIAN</th>
                              <th className="p-3">PART / POLA</th>
                              <th className="p-3 text-right">FINISHING</th>
                              <th className="p-3 text-right">MASUK GUDANG</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {target.items.map((item) => (
                              <tr
                                key={item.id}
                                className="align-top text-neutral-700 dark:text-neutral-300"
                              >
                                <td className="p-3 font-normal">
                                  {item.productName}
                                  <span className="block text-[10px] text-neutral-500">
                                    {item.sku} ({item.color} / {item.size})
                                  </span>
                                  <span className="block text-[9px] text-neutral-400 mt-1">
                                    Target Total: {item.targetQty} Pcs
                                  </span>
                                </td>

                                {/* Pola Part Breakdown */}
                                <td className="p-3">
                                  <div className="space-y-2">
                                    {item.parts.map((p, idx) => (
                                      <div
                                        key={idx}
                                        className="grid grid-cols-5 text-right gap-2 border-b border-neutral-100 dark:border-neutral-900 pb-1 last:border-none"
                                      >
                                        <span className="text-left text-neutral-800 dark:text-neutral-200 font-normal">
                                          {p.partName}
                                        </span>
                                        <span className="text-neutral-500">
                                          Tgt: {p.targetQty}
                                        </span>
                                        <span className="text-blue-600 dark:text-blue-400">
                                          Cut: {p.cuttingQty}
                                        </span>
                                        <span className="text-purple-600 dark:text-purple-400">
                                          Sew: {p.sewingQty}
                                        </span>
                                        <span className="text-indigo-600 dark:text-indigo-400">
                                          Ovd: {p.overdeckQty}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </td>

                                <td className="p-3 text-right font-medium text-amber-600 dark:text-amber-400">
                                  {item.finishingQty} Pcs
                                </td>

                                {/* MASUK GUDANG + NAMA PENERIMA */}
                                <td className="p-3 text-right">
                                  <span className="font-medium text-emerald-600 dark:text-emerald-400 block">
                                    {item.warehouseIncomingQty} Pcs
                                  </span>
                                  {item.warehouseReceiverName && (
                                    <span className="inline-flex items-center justify-end gap-1 text-[9px] text-neutral-500 dark:text-neutral-400 mt-1 bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded border border-neutral-200 dark:border-neutral-800">
                                      <UserCheck className="w-2.5 h-2.5 text-emerald-500" />
                                      Penerima: {item.warehouseReceiverName}
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* LOGS WORKFLOW BORONGAN */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-normal tracking-wider text-neutral-700 dark:text-neutral-300 uppercase">
                        RIWAYAT LOG PENERIMAAN BORONGAN KARYAWAN (
                        {target.logs.length})
                      </h4>

                      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-x-auto">
                        <table className="w-full text-left text-[11px] font-light">
                          <thead>
                            <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 uppercase text-[9px] tracking-wider bg-neutral-50 dark:bg-neutral-900/50">
                              <th className="p-3">STAGE LOG</th>
                              <th className="p-3">KARYAWAN PENERIMA</th>
                              <th className="p-3">OPERATOR SISTEM</th>
                              <th className="p-3 text-right">HASIL GOOD QTY</th>
                              <th className="p-3 text-right">DEFECT QTY</th>
                              <th className="p-3 text-right">TANGGAL RECORD</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {target.logs.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={6}
                                  className="p-4 text-center text-xs text-neutral-400"
                                >
                                  Belum ada log borongan karyawan yang dicatat
                                </td>
                              </tr>
                            ) : (
                              target.logs.map((log) => (
                                <tr
                                  key={log.id}
                                  className="text-neutral-700 dark:text-neutral-300"
                                >
                                  <td className="p-3">
                                    <span className="uppercase text-[9px] px-2 py-0.5 bg-neutral-100 dark:bg-neutral-800 font-medium">
                                      {log.category}
                                    </span>
                                  </td>
                                  <td className="p-3 font-normal">
                                    <div>{log.employeeName}</div>

                                    {log.partDetails &&
                                      log.partDetails.length > 0 && (
                                        <div className="flex flex-wrap items-center gap-1 mt-1">
                                          {log.partDetails.map((pd, pIdx) => (
                                            <span
                                              key={pIdx}
                                              className="text-[9px] font-mono px-1.5 py-0.5 bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400"
                                            >
                                              {pd.partName} ({pd.qty} Pcs)
                                            </span>
                                          ))}
                                        </div>
                                      )}

                                    {log.nextEmployeeName && (
                                      <span className="block text-[9px] text-neutral-400 mt-0.5">
                                        &rarr; Diserahkan ke:{" "}
                                        {log.nextEmployeeName}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-3 text-neutral-500">
                                    {log.recordedBy}
                                  </td>
                                  <td className="p-3 text-right font-medium text-emerald-600 dark:text-emerald-400">
                                    {log.totalCompletedQty}
                                  </td>
                                  <td className="p-3 text-right font-medium text-red-500">
                                    {log.totalDefectQty}
                                  </td>
                                  <td className="p-3 text-right text-neutral-500">
                                    {new Date(log.createdAt).toLocaleString(
                                      "id-ID",
                                    )}
                                  </td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
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
