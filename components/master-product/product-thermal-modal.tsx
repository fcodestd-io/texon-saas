"use client";

import React, { useEffect, useRef } from "react";
import { Barcode, Printer, X } from "lucide-react";
import bwipjs from "bwip-js";

function Barcode1DCanvas({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        bwipjs.toCanvas(canvasRef.current, {
          bcid: "code128",
          text: value,
          scale: 2,
          height: 8,
          includetext: true,
          textxalign: "center",
          textsize: 8,
        });
      } catch (e) {
        console.error("Gagal merender Barcode 1D:", e);
      }
    }
  }, [value]);

  return <canvas ref={canvasRef} className="max-w-full mx-auto my-0.5" />;
}

interface ProductThermalModalProps {
  isOpen: boolean;
  onClose: () => void;
  printItems: any[];
  selectedPrintVariantIds: string[];
  formatRupiah: (val: number | string) => string;
}

export const ProductThermalModal: React.FC<ProductThermalModalProps> = ({
  isOpen,
  onClose,
  printItems,
  selectedPrintVariantIds,
  formatRupiah,
}) => {
  if (!isOpen) return null;

  return (
    <>
      {/* STYLE KHUSUS MEDIA PRINT: BIKIN MULTI-PAGE BEBAS MENTOK */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm;
          }

          /* 1. Sembunyikan seluruh elemen web UI */
          body * {
            visibility: hidden !important;
          }

          /* 2. Sembunyikan pembungkus fixed/flex modal agar tidak mengunci scroll/page */
          .modal-print-wrapper {
            position: static !important;
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
          }

          .modal-print-content {
            position: static !important;
            display: block !important;
            max-width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
          }

          /* 3. Render ulang container barcode ke aliran dokumen standar */
          #thermal-print-area,
          #thermal-print-area * {
            visibility: visible !important;
          }

          #thermal-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
            display: grid !important;
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 4mm 6mm !important;
            background: transparent !important;
            border: none !important;
            padding: 0 !important;
          }

          /* 4. Mencegah stiker terpotong di batas halaman A4 */
          .thermal-sticker-print {
            border: 1px solid #000 !important;
            padding: 2.5mm !important;
            height: 34mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            box-sizing: border-box !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Modal Overlay dengan Class khusus untuk CSS Print */}
      <div className="modal-print-wrapper fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/80 p-4">
        <div className="modal-print-content w-full max-w-2xl bg-white text-black p-6 space-y-4 rounded shadow-2xl">
          <div className="flex justify-between items-center border-b pb-3 print:hidden">
            <h3 className="text-xs font-bold uppercase flex items-center gap-2">
              <Barcode className="w-4 h-4" /> CETAK LABEL BARCODE THERMAL (2
              BARIS SIMETRIS)
            </h3>
            <button onClick={onClose}>
              <X className="w-4 h-4" />
            </button>
          </div>

          <div
            id="thermal-print-area"
            className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto p-3 bg-neutral-100 border"
          >
            {printItems
              .filter((v) => selectedPrintVariantIds.includes(v.id))
              .map((v) => (
                <div
                  key={v.id}
                  className="thermal-sticker-print bg-white p-2 border border-black flex flex-col justify-between items-center text-center font-mono overflow-hidden"
                >
                  <div className="text-[10px] font-bold tracking-tight truncate uppercase w-full mb-0.5 shrink-0">
                    {v.sku}
                  </div>

                  <div className="flex-1 flex items-center justify-center w-full my-0.5">
                    <Barcode1DCanvas value={v.barcode || v.sku} />
                  </div>

                  <div className="flex justify-between items-center w-full text-[9px] font-semibold border-t border-black pt-1 mt-auto shrink-0">
                    <span>
                      {v.sizeName} - {v.colorName}
                    </span>
                    <span>
                      {parseFloat(v.price || "0") === 0
                        ? "-"
                        : `Rp ${formatRupiah(v.price)}`}
                    </span>
                  </div>
                </div>
              ))}
          </div>

          <div className="flex justify-between items-center pt-3 border-t print:hidden">
            <span className="text-xs text-neutral-500">
              Terpilih: {selectedPrintVariantIds.length} Label Stiker
            </span>
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-xs border">
                BATAL
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 text-xs bg-black text-white flex items-center gap-1.5 font-semibold"
              >
                <Printer className="w-3.5 h-3.5" /> CETAK THERMAL
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
