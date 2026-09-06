"use client";

import { useState, useActionState, useEffect } from "react";
import {
  upsertCourier,
  deleteCourier,
  upsertMarketplace,
  deleteMarketplace,
} from "./action";
import { toast } from "sonner";
import {
  Truck,
  ShoppingBag,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  X,
  Percent,
} from "lucide-react";

export function IntegrationClient({
  initialCouriers,
  initialMarketplaces,
}: {
  initialCouriers: any[];
  initialMarketplaces: any[];
}) {
  // Modal States
  const [courierModalOpen, setCourierModalOpen] = useState(false);
  const [editingCourier, setEditingCourier] = useState<any | null>(null);
  const [courierName, setCourierName] = useState("");
  const [prefixCode, setPrefixCode] = useState("");

  const [mpModalOpen, setMpModalOpen] = useState(false);
  const [editingMp, setEditingMp] = useState<any | null>(null);
  const [mpName, setMpName] = useState("");
  const [adminFee, setAdminFee] = useState<number>(0);
  const [mpCourierId, setMpCourierId] = useState<string>("");

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingType, setDeletingType] = useState<
    "courier" | "marketplace" | null
  >(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // Form Actions State
  const [courierState, courierAction, isCourierPending] = useActionState(
    upsertCourier,
    undefined,
  );
  const [mpState, mpAction, isMpPending] = useActionState(
    upsertMarketplace,
    undefined,
  );

  // Handlers Courier Action Response
  useEffect(() => {
    if (courierState?.message) {
      if (courierState.success) {
        toast.success(courierState.message);
        setCourierModalOpen(false);
      } else {
        toast.error(courierState.message);
      }
    }
  }, [courierState]);

  // Handlers Marketplace Action Response
  useEffect(() => {
    if (mpState?.message) {
      if (mpState.success) {
        toast.success(mpState.message);
        setMpModalOpen(false);
      } else {
        toast.error(mpState.message);
      }
    }
  }, [mpState]);

  const handleOpenCourierAdd = () => {
    setEditingCourier(null);
    setCourierName("");
    setPrefixCode("");
    setCourierModalOpen(true);
  };

  const handleOpenCourierEdit = (item: any) => {
    setEditingCourier(item);
    setCourierName(item.name);
    setPrefixCode(item.prefixCode);
    setCourierModalOpen(true);
  };

  const handleOpenMpAdd = () => {
    setEditingMp(null);
    setMpName("");
    setAdminFee(0);
    setMpCourierId("");
    setMpModalOpen(true);
  };

  const handleOpenMpEdit = (item: any) => {
    setEditingMp(item);
    setMpName(item.name);
    setAdminFee(parseFloat(item.adminFeePercentage || "0"));
    setMpCourierId(item.courierId || "");
    setMpModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId || !deletingType) return;
    setIsDeletingLoading(true);

    const res =
      deletingType === "courier"
        ? await deleteCourier(deletingId)
        : await deleteMarketplace(deletingId);

    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setDeletingId(null);
      setDeletingType(null);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* SEKSI 1: EKSPEDISI / COURIERS */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-neutral-500" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-neutral-900 dark:text-neutral-100">
              MASTER EKSPEDISI ({initialCouriers.length})
            </h2>
          </div>
          <button
            onClick={handleOpenCourierAdd}
            className="text-[11px] bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-3 py-1.5 flex items-center gap-1.5 font-medium hover:bg-neutral-800"
          >
            <Plus className="w-3.5 h-3.5" /> TAMBAH EKSPEDISI
          </button>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 divide-y divide-neutral-200 dark:divide-neutral-800">
          {initialCouriers.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              Belum ada data ekspedisi.
            </div>
          ) : (
            initialCouriers.map((c) => (
              <div
                key={c.id}
                className="p-3.5 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30"
              >
                <div>
                  <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                    {c.name}
                  </span>
                  <span className="text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-1.5 py-0.5 border border-neutral-200 dark:border-neutral-700 text-neutral-500">
                    PREFIX: {c.prefixCode}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenCourierEdit(c)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(c.id);
                      setDeletingType("courier");
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* SEKSI 2: MARKETPLACE */}
      <div className="space-y-4">
        <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-neutral-500" />
            <h2 className="text-xs font-semibold tracking-wider uppercase text-neutral-900 dark:text-neutral-100">
              MASTER MARKETPLACE ({initialMarketplaces.length})
            </h2>
          </div>
          <button
            onClick={handleOpenMpAdd}
            className="text-[11px] bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-3 py-1.5 flex items-center gap-1.5 font-medium hover:bg-neutral-800"
          >
            <Plus className="w-3.5 h-3.5" /> TAMBAH MARKETPLACE
          </button>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 divide-y divide-neutral-200 dark:divide-neutral-800">
          {initialMarketplaces.length === 0 ? (
            <div className="p-8 text-center text-xs text-neutral-500">
              Belum ada data marketplace.
            </div>
          ) : (
            initialMarketplaces.map((m) => (
              <div
                key={m.id}
                className="p-3.5 flex justify-between items-center hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100">
                      {m.name}
                    </span>
                    <span className="text-[10px] font-mono text-emerald-500 font-semibold bg-emerald-950/30 px-1.5 py-0.5 border border-emerald-900/40">
                      ADMIN {m.adminFeePercentage}%
                    </span>
                  </div>
                  <span className="text-[10px] text-neutral-400 block mt-0.5">
                    Ekspedisi Bawaan: {m.courierName || "-"}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenMpEdit(m)}
                    className="p-1.5 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(m.id);
                      setDeletingType("marketplace");
                    }}
                    className="p-1.5 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL EKSPEDISI */}
      {courierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-xs font-semibold uppercase">
                {editingCourier ? "EDIT EKSPEDISI" : "TAMBAH EKSPEDISI"}
              </h3>
              <button onClick={() => setCourierModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            <form action={courierAction} className="space-y-4">
              {editingCourier && (
                <input type="hidden" name="id" value={editingCourier.id} />
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase">
                  NAMA EKSPEDISI
                </label>
                <input
                  name="name"
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="Contoh: Shopee Express (SPX)"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
                />
                {courierState?.errors?.name && (
                  <p className="text-[10px] text-red-500">
                    {courierState.errors.name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase">
                  KODE AWALAN RESI (PREFIX)
                </label>
                <input
                  name="prefixCode"
                  type="text"
                  value={prefixCode}
                  onChange={(e) => setPrefixCode(e.target.value.toUpperCase())}
                  placeholder="Contoh: SPXID"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs font-mono uppercase text-neutral-100 focus:outline-none"
                />
                {courierState?.errors?.prefixCode && (
                  <p className="text-[10px] text-red-500">
                    {courierState.errors.prefixCode[0]}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setCourierModalOpen(false)}
                  className="px-4 py-2 text-xs border border-neutral-800 text-neutral-400"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isCourierPending}
                  className="px-4 py-2 text-xs bg-neutral-100 text-neutral-950 font-medium flex items-center gap-1.5"
                >
                  {isCourierPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  SIMPAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL MARKETPLACE */}
      {mpModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
              <h3 className="text-xs font-semibold uppercase">
                {editingMp ? "EDIT MARKETPLACE" : "TAMBAH MARKETPLACE"}
              </h3>
              <button onClick={() => setMpModalOpen(false)}>
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>

            <form action={mpAction} className="space-y-4">
              {editingMp && (
                <input type="hidden" name="id" value={editingMp.id} />
              )}

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase">
                  NAMA MARKETPLACE
                </label>
                <input
                  name="name"
                  type="text"
                  value={mpName}
                  onChange={(e) => setMpName(e.target.value)}
                  placeholder="Contoh: Shopee / Tokopedia / TikTok Shop"
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
                />
                {mpState?.errors?.name && (
                  <p className="text-[10px] text-red-500">
                    {mpState.errors.name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase">
                  BIAYA ADMIN MARKETPLACE (%)
                </label>
                <div className="relative">
                  <input
                    name="adminFeePercentage"
                    type="number"
                    step="0.01"
                    value={adminFee}
                    onChange={(e) =>
                      setAdminFee(parseFloat(e.target.value) || 0)
                    }
                    placeholder="4.5"
                    className="w-full px-3 py-2 pr-8 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
                  />
                  <Percent className="w-3.5 h-3.5 absolute right-3 top-2.5 text-neutral-500" />
                </div>
                {mpState?.errors?.adminFeePercentage && (
                  <p className="text-[10px] text-red-500">
                    {mpState.errors.adminFeePercentage[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-neutral-400 uppercase">
                  EKSPEDISI BAWAAN (OPSIONAL)
                </label>
                <select
                  name="courierId"
                  value={mpCourierId}
                  onChange={(e) => setMpCourierId(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
                >
                  <option value="">-- Tanpa Ekspedisi Khusus --</option>
                  {initialCouriers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.prefixCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setMpModalOpen(false)}
                  className="px-4 py-2 text-xs border border-neutral-800 text-neutral-400"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isMpPending}
                  className="px-4 py-2 text-xs bg-neutral-100 text-neutral-950 font-medium flex items-center gap-1.5"
                >
                  {isMpPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  SIMPAN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRMATION HAPUS */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase text-red-500">
              KONFIRMASI HAPUS
            </h3>
            <p className="text-xs text-neutral-400">
              Apakah Anda yakin ingin menghapus data{" "}
              {deletingType === "courier" ? "ekspedisi" : "marketplace"} ini?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs border border-neutral-800 text-neutral-400"
              >
                BATAL
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeletingLoading}
                className="px-4 py-2 text-xs bg-red-600 text-white font-medium flex items-center gap-1.5"
              >
                {isDeletingLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                HAPUS
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
