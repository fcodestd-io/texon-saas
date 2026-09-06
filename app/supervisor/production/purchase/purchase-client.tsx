"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getPurchaseOrdersAction, cancelPOAction } from "./action";
import { CreatePOModal } from "@/components/purchase-trx/create-po-modal";
import { DeliverPOModal } from "@/components/purchase-trx/deliver-po-modal";
import { ExportModal } from "@/components/purchase-trx/export-modal";
import { ConfirmDialog } from "@/components/confirm-dialog"; // Sesuaikan path ConfirmDialog kamu
import { toast } from "sonner";
import {
  ArrowLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  PackageCheck,
  Ban,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";

export function PurchaseClient({
  initialPOList,
  materialsList,
}: {
  initialPOList: any[];
  materialsList: any[];
}) {
  const [poList, setPoList] = useState<any[]>(initialPOList || []);
  const [statusFilter, setStatusFilter] = useState("all");
  const [expandedPoId, setExpandedPoId] = useState<string | null>(null);

  // Loading States
  const [isFilterLoading, setIsFilterLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Modals Visibility
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeliverOpen, setIsDeliverOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Target Item Action
  const [selectedPoForDeliver, setSelectedPoForDeliver] = useState<any | null>(
    null,
  );
  const [poIdToCancel, setPoIdToCancel] = useState<string | null>(null);

  const refreshPOData = () => {
    setIsFilterLoading(true);
    getPurchaseOrdersAction(statusFilter).then((res) => {
      setPoList(res);
      setIsFilterLoading(false);
    });
  };

  useEffect(() => {
    refreshPOData();
  }, [statusFilter]);

  const handleConfirmCancelPO = async () => {
    if (!poIdToCancel) return;

    setActionLoadingId(poIdToCancel);
    const res = await cancelPOAction(poIdToCancel);
    setActionLoadingId(null);
    setPoIdToCancel(null);

    if (res.success) {
      toast.success(res.message);
      refreshPOData();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Header Back Button */}
      <div className="flex items-center justify-between pb-1">
        <Link
          href="/supervisor/production/dashboard"
          className="inline-flex items-center gap-1.5 text-[11px] text-neutral-400 hover:text-amber-400 font-mono transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE DASHBOARD</span>
        </Link>
        {isFilterLoading && (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
        )}
      </div>

      {/* Top Controls */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="col-span-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-[11px]"
          >
            <Plus className="w-4 h-4" /> TAMBAH CATATAN PO (PENDING)
          </button>

          <button
            onClick={() => setIsExportOpen(true)}
            className="py-2.5 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 font-bold rounded flex items-center justify-center gap-1 uppercase"
            title="Export RAW Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-900 border border-neutral-800 rounded font-medium">
          {["all", "pending", "delivered", "canceled"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`py-1.5 text-center rounded capitalize text-[10px] transition-colors ${
                statusFilter === st
                  ? "bg-neutral-800 text-amber-400 font-bold border border-neutral-700"
                  : "text-neutral-400"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* List Vertikal Card PO */}
      <div className="space-y-2.5">
        {poList.length === 0 ? (
          <div className="p-8 text-center text-neutral-500 bg-neutral-900/50 border border-neutral-800 rounded">
            Tidak ada riwayat pembelian ditemukan.
          </div>
        ) : (
          poList.map((po) => {
            const isExpanded = expandedPoId === po.id;
            const isPending = po.status === "pending";
            const isDelivered = po.status === "delivered";
            const isCanceled = po.status === "canceled";
            const isActionLoading = actionLoadingId === po.id;

            return (
              <div
                key={po.id}
                className="bg-neutral-900 border border-neutral-800/90 rounded-lg overflow-hidden transition-all"
              >
                <div className="p-3 space-y-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono font-bold text-neutral-100 text-xs block">
                        {po.poNumber}
                      </span>
                      <span className="text-[10px] text-neutral-400 block font-mono mt-0.5">
                        Dibuat:{" "}
                        {new Date(po.createdAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}{" "}
                        oleh {po.userName || "Mandor"}
                      </span>
                    </div>

                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded border uppercase flex items-center gap-1 font-semibold ${
                        isPending
                          ? "bg-amber-950/40 text-amber-400 border-amber-900/50"
                          : isDelivered
                            ? "bg-emerald-950/40 text-emerald-400 border-emerald-900/50"
                            : "bg-red-950/40 text-red-400 border-red-900/50"
                      }`}
                    >
                      {isPending && <Clock className="w-3 h-3" />}
                      {isDelivered && <CheckCircle2 className="w-3 h-3" />}
                      {isCanceled && <XCircle className="w-3 h-3" />}
                      {po.status}
                    </span>
                  </div>

                  {(isDelivered || isCanceled) && (
                    <div className="p-2 bg-neutral-950 border border-neutral-800 rounded space-y-1 font-mono text-[10px]">
                      {isDelivered && po.deliveredAt && (
                        <div className="flex justify-between text-emerald-400">
                          <span>DITERIMA (DELIVERED IN):</span>
                          <span className="font-bold">
                            {new Date(po.deliveredAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      )}

                      {isCanceled && po.canceledAt && (
                        <div className="flex justify-between text-red-400">
                          <span>DIBATALKAN (CANCEL IN):</span>
                          <span className="font-bold">
                            {new Date(po.canceledAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-between items-end pt-1 border-t border-neutral-800/80">
                    <div>
                      <span className="text-[9px] text-neutral-400 uppercase block">
                        KATEGORI:
                      </span>
                      <span className="text-[11px] font-semibold text-neutral-200 uppercase font-mono">
                        {po.category}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[9px] text-neutral-400 uppercase block">
                        TOTAL NOMINAL:
                      </span>
                      <span className="font-mono text-xs font-bold text-amber-400">
                        Rp{" "}
                        {parseFloat(
                          isDelivered
                            ? po.totalActualAmount
                            : po.totalEstimatedAmount,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Accordion Toggle */}
                  <div className="flex justify-between items-center pt-2 gap-2">
                    <button
                      onClick={() => setExpandedPoId(isExpanded ? null : po.id)}
                      className="text-[10px] text-neutral-400 hover:text-neutral-200 flex items-center gap-1 font-mono"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                      {isExpanded
                        ? "Sembunyikan Item"
                        : `Lihat ${po.items.length} Item`}
                    </button>

                    <div className="flex items-center gap-1.5">
                      {isPending && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPoForDeliver(po);
                              setIsDeliverOpen(true);
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded flex items-center gap-1"
                          >
                            <PackageCheck className="w-3 h-3" /> TERIMA BARANG
                          </button>

                          <button
                            onClick={() => setPoIdToCancel(po.id)}
                            disabled={isActionLoading}
                            className="px-2 py-1 bg-neutral-950 border border-red-900/50 text-red-400 hover:bg-red-950/30 text-[10px] rounded flex items-center gap-1"
                          >
                            {isActionLoading ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Ban className="w-3 h-3" />
                            )}
                            <span>CANCEL</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Accordion Detail List */}
                {isExpanded && (
                  <div className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-2">
                    <p className="text-[10px] text-neutral-400 font-mono uppercase">
                      DETAIL LIST ITEM:
                    </p>
                    <div className="divide-y divide-neutral-800/60">
                      {po.items.map((it: any) => {
                        const estSubtotal = parseFloat(
                          it.estimatedSubtotal || "0",
                        );
                        const actSubtotal = parseFloat(
                          it.actualSubtotal || "0",
                        );

                        return (
                          <div
                            key={it.id}
                            className="py-2 flex justify-between items-start text-[11px]"
                          >
                            <div className="space-y-0.5">
                              <span className="font-bold text-neutral-200 block">
                                {it.itemNameSnapshot}
                              </span>
                              <span className="text-[10px] text-neutral-500 font-mono block">
                                Pesan: {parseFloat(it.estimatedQty)}{" "}
                                {it.unitName} @ Rp{" "}
                                {parseFloat(it.unitPrice).toLocaleString(
                                  "id-ID",
                                )}
                              </span>
                              {isDelivered && (
                                <span className="text-[10px] text-emerald-400 font-mono block font-semibold">
                                  Aktual: {parseFloat(it.actualQty)}{" "}
                                  {it.unitName}
                                </span>
                              )}
                            </div>

                            <div className="text-right font-mono space-y-0.5">
                              {isDelivered ? (
                                <>
                                  <span className="text-[9px] text-neutral-500 block line-through">
                                    Est: Rp{" "}
                                    {estSubtotal.toLocaleString("id-ID")}
                                  </span>
                                  <span className="text-xs font-extrabold text-emerald-400 block">
                                    Rp {actSubtotal.toLocaleString("id-ID")}
                                  </span>
                                </>
                              ) : (
                                <span className="text-xs font-bold text-neutral-200 block">
                                  Rp {estSubtotal.toLocaleString("id-ID")}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {po.notes && (
                      <p className="text-[10px] text-neutral-500 pt-2 border-t border-neutral-800 italic">
                        Catatan: "{po.notes}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Modul Terpisah */}
      <CreatePOModal
        isOpen={isCreateOpen}
        materialsList={materialsList}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={refreshPOData}
      />

      <DeliverPOModal
        isOpen={isDeliverOpen}
        selectedPo={selectedPoForDeliver}
        onClose={() => {
          setIsDeliverOpen(false);
          setSelectedPoForDeliver(null);
        }}
        onSuccess={refreshPOData}
      />

      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
      />

      <ConfirmDialog
        isOpen={!!poIdToCancel}
        title="Pembatalan Pesanan (Cancel PO)"
        description="Apakah Anda yakin ingin membatalkan transaksi PO ini?"
        confirmText="Batalkan PO"
        cancelText="Kembali"
        isDanger={true}
        isLoading={!!actionLoadingId}
        onConfirm={handleConfirmCancelPO}
        onCancel={() => setPoIdToCancel(null)}
      />
    </div>
  );
}
