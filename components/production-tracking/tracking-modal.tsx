"use client";

import { useState, useEffect } from "react";
import {
  submitCuttingProcessAction,
  submitSewingProcessAction,
  submitOverdeckProcessAction,
  submitFinishingProcessAction,
  getEmployeesByTypeAction,
  getPendingPartsByWorkerAction,
  getPendingSkuForFinishingAction,
} from "@/app/supervisor/production/tracking/action";
import { toast } from "sonner";
import { X, Plus, Trash2, Loader2, Scissors, Clock } from "lucide-react";

interface TrackingModalProps {
  isOpen: boolean;
  activeTargets: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function TrackingModal({
  isOpen,
  activeTargets = [],
  onClose,
  onSuccess,
}: TrackingModalProps) {
  const [category, setCategory] = useState<
    "cutting" | "sewing" | "overdeck" | "finishing"
  >("cutting");
  const [selectedTargetId, setSelectedTargetId] = useState("");

  // State Karyawan
  const [employeeList, setEmployeeList] = useState<any[]>([]);
  const [nextEmployeeList, setNextEmployeeList] = useState<any[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedNextEmployeeId, setSelectedNextEmployeeId] = useState("");

  // Form Selector Khusus Cutting
  const [selectedItemId, setSelectedItemId] = useState("");
  const [selectedPartId, setSelectedPartId] = useState("");
  const [inputQty, setInputQty] = useState(100);

  // List Item/Part yang sedang dikerjakan
  const [selectedItemsList, setSelectedItemsList] = useState<any[]>([]);
  const [isFetchingQueue, setIsFetchingQueue] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetFormState = () => {
    setSelectedTargetId("");
    setSelectedEmployeeId("");
    setSelectedNextEmployeeId("");
    setSelectedItemId("");
    setSelectedPartId("");
    setInputQty(100);
    setSelectedItemsList([]);
    setIsFetchingQueue(false);
    setIsSubmitting(false);
  };

  const handleCloseModal = () => {
    resetFormState();
    onClose();
  };

  // Load Daftar Karyawan saat Kategori Berubah
  useEffect(() => {
    if (!isOpen) return;

    getEmployeesByTypeAction(category).then(setEmployeeList);
    setSelectedEmployeeId("");
    setSelectedNextEmployeeId("");
    setSelectedItemsList([]);

    if (category === "cutting") {
      getEmployeesByTypeAction("sewing").then(setNextEmployeeList);
    } else if (category === "sewing") {
      getEmployeesByTypeAction("overdeck").then(setNextEmployeeList);
    } else {
      setNextEmployeeList([]);
    }
  }, [category, isOpen]);

  // AUTO-FETCH Queue Pekerjaan
  useEffect(() => {
    if (!isOpen || !selectedTargetId) {
      setSelectedItemsList([]);
      return;
    }

    if (category === "sewing" || category === "overdeck") {
      if (!selectedEmployeeId) {
        setSelectedItemsList([]);
        return;
      }
      setIsFetchingQueue(true);
      getPendingPartsByWorkerAction({
        cuttingTargetId: selectedTargetId,
        category,
        workerId: selectedEmployeeId,
      }).then((pendingParts) => {
        const formatted = (pendingParts || []).map((item: any) => ({
          ...item,
          totalQty: item.qty || 0,
          qty: item.qty || 0,
          defectQty: 0,
          defectNotes: null,
          actionType: "process", // 'process' | 'hold'
          nextRoute: "overdeck", // Murni default ke overdeck untuk semua part
        }));
        setSelectedItemsList(formatted);
        setIsFetchingQueue(false);
      });
    } else if (category === "finishing") {
      setIsFetchingQueue(true);
      getPendingSkuForFinishingAction({
        cuttingTargetId: selectedTargetId,
      }).then((pendingSkuList) => {
        const formatted = (pendingSkuList || []).map((item: any) => ({
          ...item,
          totalQty: item.qty || 0,
          completedQty: item.qty || 0,
          rejectQty: 0,
          defectNotes: null,
        }));
        setSelectedItemsList(formatted);
        setIsFetchingQueue(false);
      });
    }
  }, [category, selectedTargetId, selectedEmployeeId, isOpen]);

  if (!isOpen) return null;

  const safeActiveTargets = Array.isArray(activeTargets) ? activeTargets : [];
  const currentTarget = safeActiveTargets.find(
    (t) => t.id === selectedTargetId,
  );
  const targetItems = currentTarget?.items || [];
  const currentItem = targetItems.find((i: any) => i.id === selectedItemId);
  const availableParts = currentItem?.parts || [];

  const handleTargetChange = (targetId: string) => {
    setSelectedTargetId(targetId);
    setSelectedItemId("");
    setSelectedPartId("");
    setSelectedItemsList([]);
  };

  // Manual Add Khusus Cutting
  const handleAddItemToBatch = () => {
    if (!selectedTargetId) {
      toast.warning("Pilih Target Potongan terlebih dahulu.");
      return;
    }

    if (category === "cutting") {
      if (!selectedItemId || !selectedPartId) {
        toast.warning("Pilih SKU dan Part terlebih dahulu.");
        return;
      }
      const partObj = availableParts.find((p: any) => p.id === selectedPartId);
      if (!partObj) return;

      if (
        selectedItemsList.some((i) => i.cuttingTargetItemPartId === partObj.id)
      ) {
        toast.warning("Part dalam ikatan potongan ini sudah ditambahkan.");
        return;
      }

      setSelectedItemsList((prev) => [
        ...prev,
        {
          cuttingTargetItemId: currentItem.id,
          cuttingTargetItemPartId: partObj.id,
          productPartId: partObj.productPartId || null,
          displayName: `${currentItem.productNameSnapshot} (${currentItem.colorSnapshot} - ${currentItem.sizeSnapshot})`,
          partName: partObj.partName,
          totalQty: inputQty,
          qty: inputQty,
          defectQty: 0,
          defectNotes: null,
        },
      ]);
    }
    setSelectedPartId("");
  };

  // HANDLER PERUBAHAN QTY BAGUS & DEFECT
  const handleQtyBagusChange = (index: number, val: number) => {
    const copy = [...selectedItemsList];
    const targetItem = copy[index];
    const total = targetItem.totalQty ?? targetItem.qty;

    const newGood = Math.max(0, Math.min(val, total));
    targetItem.qty = newGood;
    targetItem.defectQty = Math.max(0, total - newGood);

    setSelectedItemsList(copy);
  };

  const handleQtyDefectChange = (index: number, val: number) => {
    const copy = [...selectedItemsList];
    const targetItem = copy[index];
    const total = targetItem.totalQty ?? targetItem.qty;

    const newDefect = Math.max(0, Math.min(val, total));
    targetItem.defectQty = newDefect;
    targetItem.qty = Math.max(0, total - newDefect);

    setSelectedItemsList(copy);
  };

  // Toggle Hold / Skip Item (Fitur 'Nanti Dulu')
  const toggleItemHold = (index: number) => {
    const copy = [...selectedItemsList];
    copy[index].actionType =
      copy[index].actionType === "hold" ? "process" : "hold";
    setSelectedItemsList(copy);
  };

  // Switch Rute Tujuan per Item (Ovd vs Direct Finishing)
  const toggleNextRoute = (index: number, route: "overdeck" | "finishing") => {
    const copy = [...selectedItemsList];
    copy[index].nextRoute = route;
    setSelectedItemsList(copy);
  };

  const handleFinishingCompletedChange = (index: number, val: number) => {
    const copy = [...selectedItemsList];
    const targetItem = copy[index];
    const total = targetItem.totalQty ?? targetItem.qty;

    const newCompleted = Math.max(0, Math.min(val, total));
    targetItem.completedQty = newCompleted;
    targetItem.rejectQty = Math.max(0, total - newCompleted);

    setSelectedItemsList(copy);
  };

  const handleFinishingRejectChange = (index: number, val: number) => {
    const copy = [...selectedItemsList];
    const targetItem = copy[index];
    const total = targetItem.totalQty ?? targetItem.qty;

    const newReject = Math.max(0, Math.min(val, total));
    targetItem.rejectQty = newReject;
    targetItem.completedQty = Math.max(0, total - newReject);

    setSelectedItemsList(copy);
  };

  // Submit Handler
  const handleSubmit = async () => {
    if (!selectedTargetId || !selectedEmployeeId) {
      toast.warning("Pilih Target dan Pekerja terlebih dahulu.");
      return;
    }

    // Filter item yang tidak di-hold
    const itemsToProcess = selectedItemsList.filter(
      (i) => i.actionType !== "hold",
    );

    if (itemsToProcess.length === 0) {
      toast.warning("Tidak ada item aktif untuk diproses (semua di-hold).");
      return;
    }

    setIsSubmitting(true);
    let res: any = null;

    if (category === "cutting") {
      if (!selectedNextEmployeeId) {
        toast.warning("Pilih Penjahit Penerima.");
        setIsSubmitting(false);
        return;
      }
      res = await submitCuttingProcessAction({
        cuttingTargetId: selectedTargetId,
        cutterEmployeeId: selectedEmployeeId,
        sewerEmployeeId: selectedNextEmployeeId,
        items: itemsToProcess.map((i) => ({
          cuttingTargetItemId: i.cuttingTargetItemId,
          cuttingTargetItemPartId: i.cuttingTargetItemPartId,
          productPartId: i.productPartId || null,
          qty: i.qty,
        })),
      });
    } else if (category === "sewing") {
      const ovdBoundItems = itemsToProcess.filter(
        (i) => i.nextRoute === "overdeck",
      );
      const directFinishingItems = itemsToProcess.filter(
        (i) => i.nextRoute === "finishing",
      );

      // Validasi: Jika ada item yang rutenya ke Overdeck, pastikan Pekerja Overdeck diset
      if (ovdBoundItems.length > 0 && !selectedNextEmployeeId) {
        toast.warning(
          "Pilih Pekerja Overdeck untuk item yang dikirim ke Overdeck.",
        );
        setIsSubmitting(false);
        return;
      }

      // 1. Submit item yang butuh Overdeck
      if (ovdBoundItems.length > 0) {
        res = await submitSewingProcessAction({
          cuttingTargetId: selectedTargetId,
          sewerEmployeeId: selectedEmployeeId,
          nextOverdeckEmployeeId: selectedNextEmployeeId || null,
          items: ovdBoundItems.map((i) => ({
            cuttingTargetItemId: i.cuttingTargetItemId,
            cuttingTargetItemPartId: i.cuttingTargetItemPartId,
            productPartId: i.productPartId || null,
            qty: i.qty,
            defectQty: i.defectQty || 0,
            defectNotes: i.defectNotes || null,
          })),
        });
      }

      // 2. Submit item yang Langsung ke Finishing (tanpa penjahit overdeck)
      if (directFinishingItems.length > 0) {
        res = await submitSewingProcessAction({
          cuttingTargetId: selectedTargetId,
          sewerEmployeeId: selectedEmployeeId,
          nextOverdeckEmployeeId: null,
          items: directFinishingItems.map((i) => ({
            cuttingTargetItemId: i.cuttingTargetItemId,
            cuttingTargetItemPartId: i.cuttingTargetItemPartId,
            productPartId: i.productPartId || null,
            qty: i.qty,
            defectQty: i.defectQty || 0,
            defectNotes: i.defectNotes || null,
          })),
        });
      }
    } else if (category === "overdeck") {
      res = await submitOverdeckProcessAction({
        cuttingTargetId: selectedTargetId,
        overdeckEmployeeId: selectedEmployeeId,
        items: itemsToProcess.map((i) => ({
          cuttingTargetItemId: i.cuttingTargetItemId,
          cuttingTargetItemPartId: i.cuttingTargetItemPartId,
          productPartId: i.productPartId || null,
          qty: i.qty,
          defectQty: i.defectQty || 0,
          defectNotes: i.defectNotes || null,
        })),
      });
    } else if (category === "finishing") {
      res = await submitFinishingProcessAction({
        cuttingTargetId: selectedTargetId,
        finishingEmployeeId: selectedEmployeeId,
        items: itemsToProcess.map((i) => ({
          cuttingTargetItemId: i.cuttingTargetItemId,
          productVariantId: i.productVariantId,
          completedQty: i.completedQty ?? i.qty,
          rejectQty: i.rejectQty || 0,
          defectNotes: i.defectNotes || null,
        })),
      });
    }

    setIsSubmitting(false);

    if (res?.success) {
      toast.success(res.message);
      resetFormState();
      onSuccess();
      onClose();
    } else {
      toast.error(res?.message || "Gagal menyimpan tracking produksi.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2 font-mono">
            <Scissors className="w-4 h-4 text-amber-500" />
            <span>TRACKING PRODUKSI HASIL BORONGAN</span>
          </h3>
          <button
            onClick={handleCloseModal}
            className="text-neutral-400 hover:text-neutral-100 font-mono"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switch Kategori */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-neutral-950 border border-neutral-800 rounded font-medium font-mono">
          {(["cutting", "sewing", "overdeck", "finishing"] as const).map(
            (cat) => (
              <button
                key={cat}
                onClick={() => {
                  setCategory(cat);
                  resetFormState();
                }}
                className={`py-1.5 text-center rounded uppercase text-[10px] transition-colors font-bold ${
                  category === cat
                    ? "bg-amber-500 text-neutral-950 shadow"
                    : "text-neutral-400 hover:text-neutral-200"
                }`}
              >
                {cat}
              </button>
            ),
          )}
        </div>

        {/* Header: Target & Pekerja */}
        <div className="space-y-2 bg-neutral-950 p-3 border border-neutral-800 rounded-lg">
          <div>
            <label className="text-[10px] text-neutral-400 uppercase block mb-1 font-mono">
              1. PILIH TARGET AKTIF (STARTED) *
            </label>
            <select
              value={selectedTargetId}
              onChange={(e) => handleTargetChange(e.target.value)}
              className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
            >
              <option value="">-- PILIH TARGET PRODUKSI --</option>
              {safeActiveTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.targetDate})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-neutral-400 uppercase block mb-1 font-mono">
                2. NAMA {category.toUpperCase()} *
              </label>
              <select
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                disabled={!selectedTargetId}
                className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none disabled:opacity-50"
              >
                <option value="">-- PILIH PEKERJA --</option>
                {employeeList.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name}
                  </option>
                ))}
              </select>
            </div>

            {category === "cutting" && (
              <div>
                <label className="text-[10px] text-amber-400 uppercase block mb-1 font-bold font-mono">
                  3. SERAHKAN KE (PENJAHIT) *
                </label>
                <select
                  value={selectedNextEmployeeId}
                  onChange={(e) => setSelectedNextEmployeeId(e.target.value)}
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
                >
                  <option value="">-- PILIH PENJAHIT --</option>
                  {nextEmployeeList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {category === "sewing" && (
              <div>
                <label className="text-[10px] text-amber-400 uppercase block mb-1 font-bold font-mono">
                  3. PEKERJA OVERDECK (JIKA KE OVD):
                </label>
                <select
                  value={selectedNextEmployeeId}
                  onChange={(e) => setSelectedNextEmployeeId(e.target.value)}
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
                >
                  <option value="">-- PILIH PEKERJA OVERDECK --</option>
                  {nextEmployeeList.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Form Selector Manual (Khusus Cutting) */}
        {category === "cutting" && (
          <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
            <p className="text-[10px] font-mono text-amber-400 font-bold uppercase">
              TAMBAH ITEM KE IKATAN:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-neutral-500 block mb-0.5">
                  PILIH SKU:
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => {
                    setSelectedItemId(e.target.value);
                    setSelectedPartId("");
                  }}
                  disabled={!selectedTargetId}
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- PILIH SKU --</option>
                  {targetItems.map((it: any) => (
                    <option key={it.id} value={it.id}>
                      {it.productNameSnapshot} ({it.colorSnapshot} -{" "}
                      {it.sizeSnapshot})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-neutral-500 block mb-0.5">
                  PILIH PART:
                </label>
                <select
                  value={selectedPartId}
                  onChange={(e) => setSelectedPartId(e.target.value)}
                  disabled={!selectedItemId}
                  className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none disabled:opacity-50"
                >
                  <option value="">-- PILIH PART --</option>
                  {availableParts.map((pt: any) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.partName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <div className="w-1/2">
                <label className="text-neutral-500 block mb-0.5">
                  QTY IKATAN:
                </label>
                <input
                  type="number"
                  value={inputQty}
                  onChange={(e) => setInputQty(parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 bg-neutral-900 border border-neutral-800 font-mono text-amber-400 font-bold rounded focus:outline-none"
                />
              </div>

              <button
                type="button"
                onClick={handleAddItemToBatch}
                className="w-1/2 mt-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold rounded flex items-center justify-center gap-1 uppercase font-mono"
              >
                <Plus className="w-3.5 h-3.5" /> TAMBAH KE DAFTAR
              </button>
            </div>
          </div>
        )}

        {/* Daftar Queue Pekerjaan */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-[10px] font-mono text-neutral-400 uppercase">
              DAFTAR ITEM / PART ANTREAN ({selectedItemsList.length} ITEM):
            </p>
            {isFetchingQueue && (
              <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
            )}
          </div>

          {selectedItemsList.length === 0 ? (
            <p className="text-[10px] text-neutral-500 italic p-4 bg-neutral-950 rounded border border-neutral-800 text-center font-mono">
              {category === "sewing" || category === "overdeck"
                ? "Pilih Target dan Pekerja untuk menampilkan antrean part."
                : category === "finishing"
                  ? "Pilih Target untuk menampilkan SKU yang siap di-finishing."
                  : "Belum ada item ditambahkan ke daftar pengerjaan."}
            </p>
          ) : (
            selectedItemsList.map((item, idx) => {
              const isHold = item.actionType === "hold";

              return (
                <div
                  key={idx}
                  className={`p-2.5 bg-neutral-950 border rounded space-y-2 text-[10px] transition-all ${
                    isHold
                      ? "border-amber-900/40 opacity-60 bg-neutral-950/40"
                      : "border-neutral-800"
                  }`}
                >
                  <div className="flex justify-between items-start font-bold text-neutral-200">
                    <div>
                      <span className="block">{item.displayName}</span>
                      {category !== "finishing" && (
                        <span className="text-amber-400 font-mono text-[11px] block mt-0.5">
                          PART: {item.partName} (TOTAL IKATAN:{" "}
                          {item.totalQty ?? item.qty} PCS)
                        </span>
                      )}
                      {category === "finishing" && (
                        <span className="text-amber-400 font-mono text-[10px] block mt-0.5">
                          SETELAN READY:{" "}
                          {item.maxCompletableSet || item.totalQty} SET
                        </span>
                      )}
                    </div>

                    {/* Tombol Opsi Hold per-item */}
                    {category === "sewing" && (
                      <div className="flex items-center gap-1.5 font-mono">
                        <button
                          type="button"
                          onClick={() => toggleItemHold(idx)}
                          className={`px-2 py-1 rounded text-[9px] font-bold border transition-colors flex items-center gap-1 ${
                            isHold
                              ? "bg-amber-950 text-amber-400 border-amber-800"
                              : "bg-neutral-800 text-neutral-400 border-neutral-700 hover:text-neutral-200"
                          }`}
                        >
                          <Clock className="w-3 h-3" />
                          {isHold ? "DITAHAN (LATER)" : "HOLD"}
                        </button>
                      </div>
                    )}

                    {category === "cutting" && (
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedItemsList(
                            selectedItemsList.filter((_, i) => i !== idx),
                          )
                        }
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Pengaturan Jalur Tujuan / Rute untuk Sewing */}
                  {category === "sewing" && !isHold && (
                    <div className="flex items-center justify-between p-1.5 bg-neutral-900/80 rounded border border-neutral-800 text-[9px] font-mono">
                      <span className="text-neutral-400">
                        RUTE SETELAH JAHIT:
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => toggleNextRoute(idx, "overdeck")}
                          className={`px-2 py-0.5 rounded font-bold transition-colors ${
                            item.nextRoute === "overdeck"
                              ? "bg-purple-900/60 text-purple-300 border border-purple-700"
                              : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
                          }`}
                        >
                          KE OVERDECK
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleNextRoute(idx, "finishing")}
                          className={`px-2 py-0.5 rounded font-bold transition-colors ${
                            item.nextRoute === "finishing"
                              ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                              : "bg-neutral-800 text-neutral-500 hover:text-neutral-300"
                          }`}
                        >
                          LANGSUNG FINISHING
                        </button>
                      </div>
                    </div>
                  )}

                  {!isHold &&
                  (category === "sewing" || category === "overdeck") ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-800/80">
                      <div>
                        <label className="text-neutral-500 block text-[9px] font-mono">
                          QTY BAGUS:
                        </label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            handleQtyBagusChange(
                              idx,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 font-mono text-amber-400 font-bold rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-500 block text-[9px] font-mono">
                          QTY DEFECT/REJECT:
                        </label>
                        <input
                          type="number"
                          value={item.defectQty || 0}
                          onChange={(e) =>
                            handleQtyDefectChange(
                              idx,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 font-mono text-red-400 font-bold rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-500 block text-[9px] font-mono">
                          CATATAN DEFECT:
                        </label>
                        <input
                          type="text"
                          value={item.defectNotes || ""}
                          onChange={(e) => {
                            const copy = [...selectedItemsList];
                            copy[idx].defectNotes = e.target.value;
                            setSelectedItemsList(copy);
                          }}
                          placeholder="Misal: Bolong..."
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : !isHold && category === "finishing" ? (
                    <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-800/80">
                      <div>
                        <label className="text-emerald-400 font-bold block text-[9px] font-mono">
                          QTY LOLOS (SIAP JUAL):
                        </label>
                        <input
                          type="number"
                          value={item.completedQty ?? item.qty}
                          onChange={(e) =>
                            handleFinishingCompletedChange(
                              idx,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 font-mono text-emerald-400 font-bold rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-red-400 font-bold block text-[9px] font-mono">
                          QTY REJECT/CACAT:
                        </label>
                        <input
                          type="number"
                          value={item.rejectQty || 0}
                          onChange={(e) =>
                            handleFinishingRejectChange(
                              idx,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 font-mono text-red-400 font-bold rounded focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-neutral-500 block text-[9px] font-mono">
                          CATATAN REJECT:
                        </label>
                        <input
                          type="text"
                          value={item.defectNotes || ""}
                          onChange={(e) => {
                            const copy = [...selectedItemsList];
                            copy[idx].defectNotes = e.target.value;
                            setSelectedItemsList(copy);
                          }}
                          placeholder="Misal: Noda oli..."
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 text-neutral-300 rounded focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : !isHold && category === "cutting" ? (
                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/80">
                      <div>
                        <label className="text-neutral-500 block font-mono">
                          QTY HASIL/POTONG:
                        </label>
                        <input
                          type="number"
                          value={item.qty}
                          onChange={(e) => {
                            const copy = [...selectedItemsList];
                            copy[idx].qty = parseFloat(e.target.value) || 0;
                            setSelectedItemsList(copy);
                          }}
                          className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 font-mono text-amber-400 font-bold rounded focus:outline-none"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting || isFetchingQueue}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-mono disabled:opacity-50 transition-colors"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>SIMPAN {category.toUpperCase()} & VALIDASI PENGERJAAN</span>
        </button>
      </div>
    </div>
  );
}
