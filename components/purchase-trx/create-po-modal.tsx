"use client";

import { useState } from "react";
import { createPendingPOAction } from "@/app/supervisor/production/purchase/action";
import { toast } from "sonner";
import { X, Plus, Minus, Loader2 } from "lucide-react";

interface CreatePOModalProps {
  isOpen: boolean;
  materialsList?: any[]; // Dibuat optional untuk keamanan
  onClose: () => void;
  onSuccess: () => void;
}

export function CreatePOModal({
  isOpen,
  materialsList = [], // Defensif: Default value array kosong
  onClose,
  onSuccess,
}: CreatePOModalProps) {
  const [category, setCategory] = useState<"fabric" | "thread" | "accessory">(
    "fabric",
  );
  const [selectedMaterialId, setSelectedMaterialId] = useState("");
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  // Defensif Optional Chaining: Menjamin .filter tidak pernah TypeError 'undefined'
  const safeMaterials = Array.isArray(materialsList) ? materialsList : [];
  const filteredMaterials = safeMaterials.filter(
    (m) => m?.category === category,
  );

  const handleAddItemFromSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const matId = e.target.value;
    if (!matId) return;

    const item = filteredMaterials.find((m) => m.id === matId);
    if (!item) return;

    if (selectedItems.some((i) => i.id === item.id)) {
      toast.warning("Bahan sudah ada di daftar.");
      return;
    }

    setSelectedItems((prev) => [
      ...prev,
      {
        id: item.id,
        materialId: item.materialId,
        materialColorId: item.materialColorId || null,
        unitId: item.unitId,
        itemNameSnapshot: item.displayName,
        unitName: item.unitName,
        estimatedQty: 1,
        unitPrice: parseFloat(item.defaultPrice || "0"),
        estimatedSubtotal: parseFloat(item.defaultPrice || "0"),
      },
    ]);
    setSelectedMaterialId("");
  };

  const updateItem = (index: number, field: string, val: number) => {
    setSelectedItems((prev) => {
      const copy = [...prev];
      const target = { ...copy[index], [field]: val };
      target.estimatedSubtotal = target.estimatedQty * target.unitPrice;
      copy[index] = target;
      return copy;
    });
  };

  const handleSubmit = async () => {
    if (selectedItems.length === 0) {
      toast.error("Pilih minimal 1 bahan.");
      return;
    }
    setIsSubmitting(true);
    const res = await createPendingPOAction({
      category,
      notes,
      items: selectedItems,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      onSuccess();
      onClose();
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100">
            BUAT CATATAN PO BARU
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Kategori Select */}
        <div>
          <label className="block text-[10px] text-neutral-400 uppercase mb-1">
            PILIH TIPE BAHAN *
          </label>
          <select
            value={category}
            onChange={(e: any) => {
              setCategory(e.target.value);
              setSelectedItems([]);
              setSelectedMaterialId("");
            }}
            className="w-full p-2.5 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded focus:outline-none text-xs"
          >
            <option value="fabric">KAIN (FABRIC)</option>
            <option value="thread">BENANG (THREAD)</option>
            <option value="accessory">AKSESORIS (ACCESSORY)</option>
          </select>
        </div>

        {/* 2. Dropdown Standar Pilih Bahan */}
        <div>
          <label className="block text-[10px] text-neutral-400 uppercase mb-1">
            PILIH BAHAN & WARNA *
          </label>
          <select
            value={selectedMaterialId}
            onChange={handleAddItemFromSelect}
            className="w-full p-2.5 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded focus:outline-none text-xs font-medium"
          >
            <option value="">-- PILIH DARI DAFTAR --</option>
            {filteredMaterials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.displayName} ({m.unitName})
              </option>
            ))}
          </select>
        </div>

        {/* 3. Selected Items List */}
        <div className="space-y-2 pt-2 border-t border-neutral-800">
          <p className="text-[10px] font-mono text-neutral-400 uppercase">
            ITEM DIPILIH:
          </p>
          {selectedItems.length === 0 ? (
            <p className="text-[10px] text-neutral-500 italic">
              Belum ada item dipilih.
            </p>
          ) : (
            selectedItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-neutral-950 border border-neutral-800 rounded space-y-2"
              >
                <div className="flex justify-between font-medium text-neutral-200 text-xs">
                  <span>{item.itemNameSnapshot}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedItems(
                        selectedItems.filter((_, i) => i !== idx),
                      )
                    }
                    className="text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div>
                    <label className="text-neutral-500 block">
                      QTY ESTIMASI ({item.unitName}):
                    </label>
                    <div className="flex items-center gap-1 mt-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(
                            idx,
                            "estimatedQty",
                            Math.max(1, item.estimatedQty - 1),
                          )
                        }
                        className="p-1 bg-neutral-800 rounded"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <input
                        type="number"
                        value={item.estimatedQty}
                        onChange={(e) =>
                          updateItem(
                            idx,
                            "estimatedQty",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-16 p-1 text-center bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-100"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(idx, "estimatedQty", item.estimatedQty + 1)
                        }
                        className="p-1 bg-neutral-800 rounded"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-neutral-500 block">
                      HARGA/UNIT (RP):
                    </label>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) =>
                        updateItem(
                          idx,
                          "unitPrice",
                          parseFloat(e.target.value) || 0,
                        )
                      }
                      className="w-full p-1 mt-0.5 bg-neutral-900 border border-neutral-800 rounded font-mono text-neutral-100"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-neutral-800/80 bg-neutral-900/60 p-2 rounded mt-1">
                  <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                    SUBTOTAL ITEM:
                  </span>
                  <span className="text-sm font-extrabold font-mono text-amber-400 tracking-wide bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Rp {item.estimatedSubtotal.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div>
          <label className="block text-[10px] text-neutral-400 uppercase mb-1">
            CATATAN TAMBAHAN
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Misal: Supplier Mas Agus..."
            className="w-full p-2 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded text-xs"
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>SIMPAN CATATAN PO (PENDING)</span>
        </button>
      </div>
    </div>
  );
}
