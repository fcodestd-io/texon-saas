"use client";

import { useState } from "react";
import { getExportDataAction } from "@/app/supervisor/production/purchase/action";
import { downloadRawPurchaseExcel } from "./export-excel";
import { toast } from "sonner";
import { X, FileSpreadsheet, Calendar, Loader2 } from "lucide-react";

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ExportModal({ isOpen, onClose }: ExportModalProps) {
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(1)).toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleDownload = async () => {
    setIsExporting(true);
    const data = await getExportDataAction(startDate, endDate);
    setIsExporting(false);

    if (!data || data.length === 0) {
      toast.error("Tidak ada data transaksi pada periode ini.");
      return;
    }

    const success = downloadRawPurchaseExcel(data, startDate, endDate);
    if (success) {
      toast.success("File RAW Excel (.xlsx) berhasil di-download.");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-950/80 backdrop-blur-sm p-4 flex items-center justify-center">
      <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 p-5 rounded-xl space-y-4">
        <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-100 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>EXPORT RAW EXCEL</span>
          </h3>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-[10px] text-neutral-400">
          Download data transaksi mentah (.xlsx) untuk diolah di Excel / Google
          Sheets.
        </p>

        <div className="space-y-3 text-[10px]">
          <div>
            <label className="text-neutral-400 uppercase block mb-1 font-mono">
              DARI TANGGAL:
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-neutral-400 uppercase block mb-1 font-mono">
              SAMPAI TANGGAL:
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-500" />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-neutral-950 border border-neutral-800 rounded text-neutral-100 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded flex items-center justify-center gap-2 uppercase tracking-wider text-xs disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileSpreadsheet className="w-4 h-4" />
          )}
          <span>DOWNLOAD RAW EXCEL</span>
        </button>
      </div>
    </div>
  );
}
