import { auth } from "@/auth";
import Link from "next/link";
import {
  Boxes,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Zap,
} from "lucide-react";

export default async function SpvProductionDashboardPage() {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="space-y-4 text-xs">
      {/* 1. Header Ringkas Mobile */}
      <div className="p-3.5 bg-neutral-900 border border-neutral-800/90 rounded-xl flex items-center justify-between">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold block">
            PRODUCTION FLOOR SYSTEM
          </span>
          <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide font-mono mt-0.5">
            OPERASIONAL PRODUKSI
          </h2>
        </div>
        <div className="text-right font-mono">
          <span className="text-[10px] text-neutral-500 block">OPERATOR</span>
          <span className="text-[11px] font-medium text-neutral-200">
            {user?.name || "SPV Produksi"}
          </span>
        </div>
      </div>

      {/* 2. Top Metric Widget (Compact) */}
      <div className="grid grid-cols-1 gap-2.5">
        <div className="p-3 bg-neutral-900 border border-neutral-800/80 rounded-xl space-y-0.5">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[9px] uppercase font-mono tracking-wider">
              OUTPUT PRODUKSI HARI INI
            </span>
            <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-lg font-extrabold font-mono text-neutral-100">
              245
            </span>
            <span className="text-[9px] text-neutral-500 font-mono">PCS</span>
          </div>
        </div>
      </div>

      {/* 3. Main Touch Menu Launcher (Compact List Cards) */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-neutral-500">
            MENU UTAMA PRODUKSI
          </span>
          <Zap className="w-3 h-3 text-amber-500" />
        </div>

        {/* MENU 1: Target & Hasil Produksi */}
        <Link
          href="/supervisor/production/cutting-target"
          className="group flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 hover:border-amber-500/60 rounded-xl active:scale-[0.98] transition-all shadow-sm"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 group-hover:bg-amber-500 group-hover:text-neutral-950 transition-colors">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono group-hover:text-amber-400 transition-colors">
                TARGET & HASIL PRODUKSI
              </h3>
              <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                Pencatatan borongan & pemotongan bahan otomatis
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-amber-400 transition-colors" />
        </Link>

        {/* MENU 2: Catat Pembelian Bahan */}
        <Link
          href="/supervisor/production/purchase"
          className="group flex items-center justify-between p-3.5 bg-neutral-900 border border-neutral-800 hover:border-emerald-500/60 rounded-xl active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-neutral-950 transition-colors">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-neutral-100 uppercase tracking-wider font-mono group-hover:text-emerald-400 transition-colors">
                CATAT PEMBELIAN BAHAN
              </h3>
              <p className="text-[10px] text-neutral-400 font-light mt-0.5">
                Restok kain roll, benang, & aksesoris produksi
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
        </Link>
      </div>
    </div>
  );
}
