"use client";

import { useState } from "react";
import Link from "next/link";
import {
  getProductionLogsHistoryAction,
  getActiveCuttingTargetsAction,
} from "./action";
import { TrackingModal } from "@/components/production-tracking/tracking-modal";
import {
  ArrowLeft,
  Plus,
  Scissors,
  Shirt,
  Layers,
  Sparkles,
  Loader2,
  Clock,
  User,
} from "lucide-react";

export function TrackingPageClient({
  initialLogs = [],
  activeTargets = [],
}: {
  initialLogs?: any[];
  activeTargets?: any[];
}) {
  const [logs, setLogs] = useState<any[]>(initialLogs);
  const [targets, setTargets] = useState<any[]>(activeTargets);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const refreshLogs = () => {
    setIsLoading(true);
    Promise.all([
      getProductionLogsHistoryAction(),
      getActiveCuttingTargetsAction(),
    ]).then(([logsData, targetsData]) => {
      setLogs(logsData || []);
      setTargets(targetsData || []);
      setIsLoading(false);
    });
  };

  return (
    <div className="space-y-4 text-xs max-w-2xl mx-auto p-4">
      {/* Header & Navigasi Kembali */}
      <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
        <Link
          href="/supervisor/production/cutting-target"
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-amber-400 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE TARGET POTONGAN</span>
        </Link>
        {isLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
        )}
      </div>

      {/* Judul & Tombol Pemicu Modal */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-sm font-bold uppercase tracking-wider text-neutral-100 font-mono">
            TRACKING PRODUKSI BORONGAN
          </h1>
          <p className="text-[10px] text-neutral-400">
            Riwayat pengerjaan borongan dan validasi serah-terima antar tahapan.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-3 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded flex items-center gap-1.5 uppercase text-[11px] tracking-wider shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> INPUT PRODUKSI
        </button>
      </div>

      {/* Daftar Riwayat Pengerjaan (Logs) */}
      <div className="space-y-2.5">
        <p className="text-[10px] font-mono text-neutral-400 uppercase">
          RIWAYAT PENGERJAAN TERAKHIR ({logs.length}):
        </p>

        {logs.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-neutral-900/50 border border-neutral-800 rounded-lg font-mono">
            Belum ada transaksi pengerjaan produksi dicatat.
          </div>
        ) : (
          logs.map((log) => {
            const isCutting = log.category === "cutting";
            const isSewing = log.category === "sewing";
            const isOverdeck = log.category === "overdeck";
            const isFinishing = log.category === "finishing";

            return (
              <div
                key={log.id}
                className="bg-neutral-900 border border-neutral-800/90 rounded-lg p-3 space-y-2.5"
              >
                {/* Header Card Log */}
                <div className="flex justify-between items-start pb-2 border-b border-neutral-800/80">
                  <div>
                    <span className="font-bold text-neutral-100 font-mono text-xs block">
                      {log.targetTitle}
                    </span>

                    {/* Informasi Waktu, Pekerja Pengerja & Pekerja Penerima */}
                    <div className="text-[10px] text-neutral-400 font-mono flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-neutral-500" />
                        {new Date(log.createdAt).toLocaleString("id-ID", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-amber-400 font-bold">
                        <User className="w-3 h-3" />
                        {log.workerName}
                      </span>

                      {/* Display Badge Diserahkan Ke */}
                      {log.nextWorkerName && (
                        <>
                          <span className="text-neutral-600">➔</span>
                          <span className="text-emerald-400 font-bold bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/50">
                            Diserahkan ke: {log.nextWorkerName}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Badge Category */}
                  <span
                    className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase rounded border flex items-center gap-1 ${
                      isCutting
                        ? "bg-amber-950/40 text-amber-400 border-amber-900/50"
                        : isSewing
                          ? "bg-blue-950/40 text-blue-400 border-blue-900/50"
                          : isOverdeck
                            ? "bg-purple-950/40 text-purple-400 border-purple-900/50"
                            : "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"
                    }`}
                  >
                    {isCutting && <Scissors className="w-3 h-3" />}
                    {isSewing && <Shirt className="w-3 h-3" />}
                    {isOverdeck && <Layers className="w-3 h-3" />}
                    {isFinishing && <Sparkles className="w-3 h-3" />}
                    {log.category}
                  </span>
                </div>

                {/* Detail Part / Items Hasil Pengerjaan */}
                <div className="space-y-1.5">
                  {isFinishing
                    ? log.items?.map((it: any) => (
                        <div
                          key={it.id}
                          className="p-2 bg-neutral-950 rounded border border-neutral-800 space-y-1 text-[11px]"
                        >
                          <div className="flex justify-between items-center font-bold text-neutral-200">
                            <span>
                              {it.productName} ({it.color} - {it.size})
                            </span>
                            <span className="font-mono text-emerald-400 font-bold">
                              {parseFloat(it.completedQty)} SET (LOLOS)
                            </span>
                          </div>

                          {parseFloat(it.defectQty || "0") > 0 && (
                            <div className="flex justify-between items-center text-[10px] text-red-400 font-mono pt-0.5 border-t border-neutral-900">
                              <span>
                                REJECT: {parseFloat(it.defectQty)} Set
                              </span>
                              {it.defectNotes && (
                                <span>Ket: "{it.defectNotes}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    : log.parts?.map((pt: any) => (
                        <div
                          key={pt.id}
                          className="p-2 bg-neutral-950 rounded border border-neutral-800 space-y-1 text-[11px]"
                        >
                          <div className="flex justify-between items-center font-bold text-neutral-200">
                            <span>
                              {pt.productName} ({pt.color} - {pt.size})
                            </span>
                            <span className="text-amber-400 font-mono font-bold">
                              {pt.partName}: {parseFloat(pt.qty)} Pcs
                            </span>
                          </div>

                          {parseFloat(pt.defectQty || "0") > 0 && (
                            <div className="flex justify-between items-center text-[10px] text-red-400 font-mono pt-0.5 border-t border-neutral-900">
                              <span>
                                DEFECT: {parseFloat(pt.defectQty)} Pcs
                              </span>
                              {pt.defectNotes && (
                                <span>Ket: "{pt.defectNotes}"</span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Component Modal Tracking Produksi */}
      <TrackingModal
        isOpen={isModalOpen}
        activeTargets={targets}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshLogs}
      />
    </div>
  );
}
