"use client";

import { useState } from "react";
import { createCuttingTargetAction } from "@/app/supervisor/production/cutting-target/action";
import { toast } from "sonner";
import { X, Plus, Trash2, Loader2 } from "lucide-react";

interface CreateTargetModalProps {
  isOpen: boolean;
  selectedDate: string;
  masterProducts: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateTargetModal({
  isOpen,
  selectedDate,
  masterProducts = [],
  onClose,
  onSuccess,
}: CreateTargetModalProps) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");

  // State Form Item Selector
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [targetQty, setTargetQty] = useState(100);

  // List Item Target yang Ditambahkan
  const [targetItems, setTargetItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Filter Varian Berdasarkan Produk
  const selectedProduct = masterProducts.find(
    (p) => p.productId === selectedProductId,
  );
  const availableVariants = selectedProduct?.variants || [];
  const selectedVariant = availableVariants.find(
    (v: any) => v.variantId === selectedVariantId,
  );

  // Tambahkan SKU ke List Target
  const handleAddItem = () => {
    if (!selectedProductId || !selectedVariantId) {
      toast.warning("Pilih Produk dan Varian terlebih dahulu.");
      return;
    }

    if (targetItems.some((i) => i.productVariantId === selectedVariantId)) {
      toast.warning("Varian SKU ini sudah ada dalam daftar.");
      return;
    }

    // Ekstrak nama part sebagai array of string murni agar aman
    const partNamesArray = (selectedVariant?.parts || []).map((p: any) =>
      typeof p === "object" ? p.partName : p,
    );

    setTargetItems((prev) => [
      ...prev,
      {
        productId: selectedProduct.productId,
        productVariantId: selectedVariant.variantId,
        productNameSnapshot: selectedProduct.productName,
        sizeSnapshot: selectedVariant.sizeName,
        colorSnapshot: selectedVariant.colorName,
        skuSnapshot: selectedVariant.sku,
        targetQty,
        parts: partNamesArray.length > 0 ? partNamesArray : ["Utama / Baju"],
      },
    ]);

    setSelectedVariantId("");
  };

  const handleSubmit = async () => {
    if (targetItems.length === 0) {
      toast.warning("Tambahkan minimal 1 item ke target.");
      return;
    }

    setIsSubmitting(true);
    const res = await createCuttingTargetAction({
      targetDate: selectedDate,
      title: title || `Target Potongan - ${selectedDate}`,
      notes,
      items: targetItems,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      setTargetItems([]);
      setTitle("");
      setNotes("");
      onSuccess();
      onClose();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center text-xs">
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100">
            BUAT TARGET POTONGAN BARU
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input Header Target */}
        <div className="space-y-2">
          <div>
            <label className="text-[10px] text-neutral-400 uppercase block mb-1">
              JUDUL TARGET / BATCH *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Misal: Gelombang 1 (${selectedDate})`}
              className="w-full p-2 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
            />
          </div>
        </div>

        {/* Form Selector Produk & Varian */}
        <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-2">
          <p className="text-[10px] font-mono text-amber-400 font-bold uppercase">
            TAMBAH ITEM TARGET:
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-neutral-500 block mb-0.5">PRODUK:</label>
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  setSelectedVariantId("");
                }}
                className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
              >
                <option value="">-- PILIH PRODUK --</option>
                {masterProducts.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.productName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-neutral-500 block mb-0.5">
                VARIAN:
              </label>
              <select
                value={selectedVariantId}
                onChange={(e) => setSelectedVariantId(e.target.value)}
                disabled={!selectedProductId}
                className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none disabled:opacity-50"
              >
                <option value="">-- PILIH VARIAN --</option>
                {availableVariants.map((v: any) => (
                  <option key={v.variantId} value={v.variantId}>
                  {v.sku}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <div className="w-1/2">
              <label className="text-neutral-500 block mb-0.5">
                TARGET QTY (SET):
              </label>
              <input
                type="number"
                value={targetQty}
                onChange={(e) => setTargetQty(parseFloat(e.target.value) || 0)}
                className="w-full p-1.5 bg-neutral-900 border border-neutral-800 font-mono text-amber-400 font-bold rounded focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleAddItem}
              className="w-1/2 mt-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-bold rounded flex items-center justify-center gap-1 uppercase"
            >
              <Plus className="w-3.5 h-3.5" /> TAMBAH ITEM
            </button>
          </div>
        </div>

        {/* List Items yang Ditambahkan */}
        <div className="space-y-2">
          <p className="text-[10px] font-mono text-neutral-400 uppercase">
            DAFTAR ITEM TARGET ({targetItems.length}):
          </p>

          {targetItems.length === 0 ? (
            <p className="text-[10px] text-neutral-500 italic p-3 bg-neutral-950 rounded border border-neutral-800 text-center">
              Belum ada item ditambahkan.
            </p>
          ) : (
            targetItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-neutral-950 border border-neutral-800 rounded space-y-1 text-[10px]"
              >
                <div className="flex justify-between items-center font-bold text-neutral-200">
                  <span>
                    {item.productNameSnapshot} ({item.colorSnapshot} -{" "}
                    {item.sizeSnapshot})
                  </span>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-400 font-bold">
                      {item.targetQty} SET
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTargetItems(targetItems.filter((_, i) => i !== idx))
                      }
                      className="text-red-400 hover:text-red-300"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Render Part dengan Aman (Pencegah Error Object as React Child) */}
                <div className="text-[9px] text-neutral-400 font-mono flex flex-wrap gap-1 pt-1">
                  <span className="text-neutral-500">PARTS:</span>
                  {item.parts.map((pt: any, pIdx: number) => (
                    <span
                      key={pIdx}
                      className="px-1.5 py-0.5 bg-neutral-900 border border-neutral-800 rounded text-neutral-300"
                    >
                      {typeof pt === "object" ? pt.partName : pt}
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>SIMPAN TARGET POTONGAN</span>
        </button>
      </div>
    </div>
  );
}
