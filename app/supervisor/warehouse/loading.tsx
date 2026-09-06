import { Loader2, Warehouse } from "lucide-react";

export default function WarehouseLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-3 text-neutral-400 font-mono">
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-2xl animate-pulse">
        <Warehouse className="w-6 h-6 text-emerald-500" />
      </div>
      <div className="flex items-center gap-2 text-xs">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
        <span className="uppercase tracking-wider">MEMUAT DATA GUDANG...</span>
      </div>
    </div>
  );
}
