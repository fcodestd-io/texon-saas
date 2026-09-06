"use client";

import { useState, useEffect } from "react";
import { deliverPOAction } from "@/app/supervisor/production/purchase/action";
import { toast } from "sonner";
import { X, Loader2 } from "lucide-react";

interface DeliverPOModalProps {
  isOpen: boolean;
  selectedPo: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function DeliverPOModal({
  isOpen,
  selectedPo,
  onClose,
  onSuccess,
}: DeliverPOModalProps) {
  const [deliverItems, setDeliverItems] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (selectedPo?.items) {
      setDeliverItems(
        selectedPo.items.map((i: any) => ({
          itemId: i.id,
          itemNameSnapshot: i.itemNameSnapshot,
          unitName: i.unitName,
          estimatedQty: parseFloat(i.estimatedQty),
          unitPrice: parseFloat(i.unitPrice),
          estimatedSubtotal: parseFloat(i.estimatedSubtotal),
          actualQty: parseFloat(i.estimatedQty),
        })),
      );
    }
  }, [selectedPo]);

  if (!isOpen || !selectedPo) return null;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const res = await deliverPOAction(
      selectedPo.id,
      deliverItems.map((i) => ({ itemId: i.itemId, actualQty: i.actualQty })),
    );
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
            PENERIMAAN BARANG AKTUAL ({selectedPo.poNumber})
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-neutral-400">
          Input kuantitas aktual barang yang tiba. Stok bahan baku & log mutasi
          stok akan bertambah secara otomatis.
        </p>

        <div className="space-y-3">
          {deliverItems.map((it, idx) => {
            const actualSubtotal = it.actualQty * it.unitPrice;

            return (
              <div
                key={it.itemId}
                className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg space-y-3"
              >
                <span className="font-bold text-neutral-100 text-xs block">
                  {it.itemNameSnapshot}
                </span>

                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="p-2 bg-neutral-900/60 border border-neutral-800/80 rounded">
                    <span className="text-neutral-500 uppercase block text-[9px]">
                      QTY PESAN ({it.unitName}):
                    </span>
                    <span className="font-mono text-neutral-300 font-bold text-xs mt-0.5 block">
                      {it.estimatedQty} {it.unitName}
                    </span>
                  </div>

                  <div className="p-1.5 bg-neutral-900 border border-amber-500/40 rounded">
                    <label className="text-amber-400 font-bold uppercase block text-[9px]">
                      QTY AKTUAL / DATANG ({it.unitName}) *
                    </label>
                    <input
                      type="number"
                      value={it.actualQty}
                      onChange={(e) => {
                        const copy = [...deliverItems];
                        copy[idx].actualQty = parseFloat(e.target.value) || 0;
                        setDeliverItems(copy);
                      }}
                      className="w-full p-1 mt-0.5 bg-neutral-950 border border-neutral-800 rounded font-mono text-neutral-100 text-xs font-bold focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="p-2 bg-neutral-900/60 border border-neutral-800/80 rounded">
                    <span className="text-neutral-500 uppercase block text-[9px]">
                      SUBTOTAL PESAN:
                    </span>
                    <span className="font-mono text-neutral-400 font-bold text-xs mt-0.5 block">
                      Rp {it.estimatedSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>

                  <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded">
                    <span className="text-amber-400 uppercase block text-[9px]">
                      SUBTOTAL SEBENARNYA:
                    </span>
                    <span className="font-mono text-amber-400 font-extrabold text-xs mt-0.5 block">
                      Rp {actualSubtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs disabled:opacity-50"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          <span>KONFIRMASI BARANG DITERIMA</span>
        </button>
      </div>
    </div>
  );
}
