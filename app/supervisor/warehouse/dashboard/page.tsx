import { auth } from "@/auth";
import Link from "next/link";
import { getWarehouseMetricsAction } from "../action";
import {
  SlidersHorizontal,
  PackagePlus,
  PackageMinus,
  RotateCcw,
  ChevronRight,
  Boxes,
  TrendingUp,
} from "lucide-react";

export default async function SupervisorWarehouseDashboardPage() {
  const [session, metrics] = await Promise.all([
    auth(),
    getWarehouseMetricsAction(),
  ]);

  const user = session?.user;

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Header Ringkas Mobile */}
      <div className="p-3.5 bg-neutral-900 border border-neutral-800/90 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-emerald-500 uppercase font-semibold block">
            INVENTORY MANAGEMENT
          </span>
          <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide font-mono mt-0.5">
            OPERASIONAL GUDANG
          </h2>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] text-neutral-500 block">OPERATOR</span>
          <span className="text-[11px] font-medium text-neutral-200">
            {user?.name || "SPV Gudang"}
          </span>
        </div>
      </div>

      {/* 2. Top Metric Widgets (Data DB Realtime) */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="p-3 bg-neutral-900 border border-neutral-800/80 rounded-xl space-y-0.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[9px] uppercase font-mono tracking-wider">
              STOK READY
            </span>
            <Boxes className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-extrabold font-mono text-neutral-100">
              {metrics.totalStock.toLocaleString("id-ID")}
            </span>
            <span className="text-[9px] text-neutral-500 font-mono">SET</span>
          </div>
        </div>

        <div className="p-3 bg-neutral-900 border border-neutral-800/80 rounded-xl space-y-0.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[9px] uppercase font-mono tracking-wider">
              IN / OUT HARI INI
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-extrabold font-mono text-amber-400">
              +{metrics.todayIn} / -{metrics.todayOut}
            </span>
            <span className="text-[9px] text-neutral-500 font-mono">SET</span>
          </div>
        </div>
      </div>

      {/* 3. Main Touch Menu Launcher */}
      <div className="space-y-2 pt-1">
        <div className="px-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
            MENU UTAMA GUDANG
          </span>
        </div>

        {/* MENU 1: STOCK ADJUSTMENT */}
        <Link
          href="/supervisor/warehouse/stock-adjustment"
          className="group flex items-center justify-between p-3.5 bg-neutral-900 border border-amber-500/40 hover:border-amber-500 rounded-xl active:scale-[0.98] transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:bg-amber-500 group-hover:text-neutral-950 transition-colors">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono group-hover:text-amber-400 transition-colors">
                  STOCK ADJUSTMENT
                </h3>
                <span className="text-[8px] font-mono font-bold px-1 py-0.2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded">
                  UTAMA
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                Opname & penyesuaian selisih stok fisik
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
        </Link>

        {/* MENU 2: PRODUK MASUK */}
        <Link
          href="/supervisor/warehouse/incoming"
          className="group flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/60 rounded-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-neutral-950 transition-colors">
              <PackagePlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono group-hover:text-emerald-400 transition-colors">
                PRODUK MASUK
              </h3>
              <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                Terima barang jadi dari tim produksi/finishing
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
        </Link>

        {/* MENU 3: PRODUK KELUAR */}
        <Link
          href="/supervisor/warehouse/outgoing"
          className="group flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 hover:border-blue-500/60 rounded-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 group-hover:bg-blue-500 group-hover:text-neutral-950 transition-colors">
              <PackageMinus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono group-hover:text-blue-400 transition-colors">
                PRODUK KELUAR
              </h3>
              <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                Kirim barang untuk toko, grosir, atau online
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-blue-400 transition-colors" />
        </Link>

        {/* MENU 4: PRODUK RETURN */}
        <Link
          href="/supervisor/warehouse/return"
          className="group flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 hover:border-purple-500/60 rounded-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 group-hover:bg-purple-500 group-hover:text-neutral-950 transition-colors">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono group-hover:text-purple-400 transition-colors">
                PRODUK RETURN
              </h3>
              <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                Catat barang kembalian pelanggan/cabang
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-purple-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
