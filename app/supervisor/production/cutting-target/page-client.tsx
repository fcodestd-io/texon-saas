"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  getCuttingTargetsByDateAction,
  finishCuttingTargetAction,
  cancelCuttingTargetAction,
} from "./action";
import { CreateTargetModal } from "@/components/cutting-target/create-target-modal";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Plus,
  Activity,
  Loader2,
  Layers,
  CheckCircle2,
  Ban,
  Play,
  XCircle,
  Scissors,
  Shirt,
  Sparkles,
} from "lucide-react";

export function CuttingTargetPageClient({
  initialDate,
  initialTargets = [],
  masterProducts = [],
}: {
  initialDate: string;
  initialTargets?: any[];
  masterProducts?: any[];
}) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [targets, setTargets] = useState<any[]>(initialTargets);
  const [isLoading, setIsLoading] = useState(false);

  // Modal Visibility
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Dialog Actions State
  const [targetToFinish, setTargetToFinish] = useState<string | null>(null);
  const [targetToCancel, setTargetToCancel] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleDateChange = (daysDelta: number) => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + daysDelta);
    setSelectedDate(current.toISOString().split("T")[0]);
  };

  const refreshTargets = () => {
    setIsLoading(true);
    getCuttingTargetsByDateAction(selectedDate).then((res) => {
      setTargets(res || []);
      setIsLoading(false);
    });
  };

  useEffect(() => {
    refreshTargets();
  }, [selectedDate]);

  const handleConfirmFinish = async () => {
    if (!targetToFinish) return;
    setActionLoadingId(targetToFinish);
    const res = await finishCuttingTargetAction(targetToFinish);
    setActionLoadingId(null);
    setTargetToFinish(null);

    if (res.success) {
      toast.success(res.message);
      refreshTargets();
    } else {
      toast.error(res.message);
    }
  };

  const handleConfirmCancel = async () => {
    if (!targetToCancel) return;
    setActionLoadingId(targetToCancel);
    const res = await cancelCuttingTargetAction(targetToCancel);
    setActionLoadingId(null);
    setTargetToCancel(null);

    if (res.success) {
      toast.success(res.message);
      refreshTargets();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-4 text-xs max-w-2xl mx-auto p-4">
      {/* Link Kembali ke Dashboard */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/supervisor/production/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-amber-400 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE DASHBOARD</span>
        </Link>
      </div>

      {/* Navigasi Tanggal < > */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center justify-between">
        <button
          onClick={() => handleDateChange(-1)}
          className="p-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-300 hover:text-amber-400 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="text-center font-mono">
          <span className="text-[10px] text-neutral-500 uppercase block">
            TARGET POTONGAN TANGGAL:
          </span>
          <span className="text-sm font-bold text-amber-400">
            {new Date(selectedDate).toLocaleDateString("id-ID", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        <button
          onClick={() => handleDateChange(1)}
          className="p-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-300 hover:text-amber-400 transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Action Buttons Utama */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setIsModalOpen(true)}
          className="py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs shadow transition-colors"
        >
          <Plus className="w-4 h-4" /> BUAT TARGET POTONG
        </button>

        <Link
          href="/supervisor/production/tracking"
          className="py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs shadow transition-colors"
        >
          <Activity className="w-4 h-4" /> TRACKING PRODUKSI
        </Link>
      </div>

      {/* List Target Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-neutral-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
            <span>Memuat target potongan...</span>
          </div>
        ) : targets.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-neutral-900/50 border border-neutral-800 rounded">
            Belum ada target potongan pada tanggal ini.
          </div>
        ) : (
          targets.map((tg) => {
            const isStarted = tg.status === "started";
            const isFinished = tg.status === "finished";
            const isCanceled = tg.status === "canceled";

            return (
              <div
                key={tg.id}
                className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 space-y-3"
              >
                {/* Header Card */}
                <div className="flex justify-between items-start pb-2 border-b border-neutral-800">
                  <div>
                    <h3 className="font-bold text-neutral-100 text-xs font-mono">
                      {tg.title}
                    </h3>
                    <span className="text-[10px] text-neutral-400 font-mono block">
                      Dibuat:{" "}
                      {new Date(tg.createdAt).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <span
                    className={`px-2 py-0.5 border text-[9px] font-mono rounded uppercase font-bold flex items-center gap-1 ${
                      isStarted
                        ? "bg-amber-950/40 text-amber-400 border-amber-900/50"
                        : isFinished
                          ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"
                          : "bg-red-950/40 text-red-400 border-red-900/50"
                    }`}
                  >
                    {isStarted && <Play className="w-3 h-3" />}
                    {isFinished && <CheckCircle2 className="w-3 h-3" />}
                    {isCanceled && <XCircle className="w-3 h-3" />}
                    {tg.status}
                  </span>
                </div>

                {/* Items & Progress Realtime */}
                <div className="space-y-2.5">
                  {tg.items.map((it: any) => {
                    const targetQty = parseFloat(it.targetQty);
                    const finishedQty = it.totalFinishedSkuQty || 0;

                    return (
                      <div
                        key={it.id}
                        className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2.5"
                      >
                        {/* Header SKU Item & Capaian Level SKU (Siap Jual) */}
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-neutral-100 text-xs block">
                              {it.productNameSnapshot} ({it.colorSnapshot} -{" "}
                              {it.sizeSnapshot})
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono block mt-0.5">
                              SKU: {it.skuSnapshot}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-[9px] text-neutral-500 uppercase block font-mono">
                              TARGET SETELAN:
                            </span>
                            <span className="font-mono font-bold text-amber-400 text-xs">
                              {targetQty} SET
                            </span>
                          </div>
                        </div>

                        {/* Banner Progress Level SKU (Finishing / Siap Jual) */}
                        <div className="p-2 bg-emerald-950/30 border border-emerald-800/60 rounded flex justify-between items-center text-[10px] font-mono">
                          <span className="text-emerald-400 font-bold uppercase flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> FINISHING (SIAP
                            JUAL):
                          </span>
                          <span className="font-bold text-emerald-400 text-xs">
                            {finishedQty} / {targetQty} Set
                          </span>
                        </div>

                        {/* Progress Realtime Level Part */}
                        <div className="p-2 bg-neutral-900/70 border border-neutral-800 rounded space-y-1.5 font-mono">
                          <span className="text-[9px] text-neutral-400 uppercase flex items-center gap-1">
                            <Layers className="w-3 h-3 text-amber-500" />{" "}
                            PROGRESS REALTIME PER PART:
                          </span>

                          <div className="space-y-1.5">
                            {it.parts.map((pt: any) => {
                              const partTarget = parseFloat(pt.partTargetQty);

                              return (
                                <div
                                  key={pt.id}
                                  className="p-1.5 bg-neutral-950 border border-neutral-800/80 rounded space-y-1 text-[10px]"
                                >
                                  <div className="flex justify-between font-bold text-neutral-200">
                                    <span>{pt.partName}</span>
                                    <span className="text-amber-400">
                                      Target: {partTarget} Pcs
                                    </span>
                                  </div>

                                  {/* Grid Capaian Cutting, Sewing, Overdeck */}
                                  <div className="grid grid-cols-3 gap-1 text-[9px] text-center pt-0.5">
                                    <div className="p-1 bg-neutral-900 rounded border border-neutral-800">
                                      <span className="text-neutral-500 block">
                                        DIPOTONG
                                      </span>
                                      <span className="font-bold text-amber-400">
                                        {pt.cutQty} / {partTarget}
                                      </span>
                                    </div>

                                    <div className="p-1 bg-neutral-900 rounded border border-neutral-800">
                                      <span className="text-neutral-500 block">
                                        DIJAHIT
                                      </span>
                                      <span className="font-bold text-blue-400">
                                        {pt.sewQty} / {partTarget}
                                      </span>
                                    </div>

                                    <div className="p-1 bg-neutral-900 rounded border border-neutral-800">
                                      <span className="text-neutral-500 block">
                                        OVERDECK
                                      </span>
                                      <span className="font-bold text-purple-400">
                                        {pt.ovdQty} / {partTarget}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions Mandor: CLOSING / FINISH & CANCEL */}
                {isStarted && (
                  <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800/80">
                    <button
                      onClick={() => setTargetToCancel(tg.id)}
                      className="px-3 py-1.5 bg-neutral-950 border border-red-900/50 hover:bg-red-950/30 text-red-400 font-bold text-[10px] rounded flex items-center gap-1 uppercase transition-colors"
                    >
                      <Ban className="w-3 h-3" /> CANCEL TARGET
                    </button>

                    <button
                      onClick={() => setTargetToFinish(tg.id)}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded flex items-center gap-1 uppercase transition-colors"
                    >
                      <CheckCircle2 className="w-3 h-3" /> CLOSING / FINISH
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirm Dialog Finish */}
      <ConfirmDialog
        isOpen={!!targetToFinish}
        title="Closing Target Potongan"
        description="Apakah target potongan ini sudah selesai dikerjakan? Status akan diubah menjadi FINISHED."
        confirmText="Selesaikan Target (FINISH)"
        cancelText="Batal"
        isDanger={false}
        isLoading={!!actionLoadingId}
        onConfirm={handleConfirmFinish}
        onCancel={() => setTargetToFinish(null)}
      />

      {/* Confirm Dialog Cancel */}
      <ConfirmDialog
        isOpen={!!targetToCancel}
        title="Pembatalan Target Potongan"
        description="Apakah Anda yakin ingin membatalkan target potongan ini?"
        confirmText="Batalkan Target"
        cancelText="Kembali"
        isDanger={true}
        isLoading={!!actionLoadingId}
        onConfirm={handleConfirmCancel}
        onCancel={() => setTargetToCancel(null)}
      />

      {/* Modal Create Target */}
      <CreateTargetModal
        isOpen={isModalOpen}
        selectedDate={selectedDate}
        masterProducts={masterProducts}
        onClose={() => setIsModalOpen(false)}
        onSuccess={refreshTargets}
      />
    </div>
  );
}
