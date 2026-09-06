import { auth, signOut } from "@/auth";
import { Warehouse, LogOut } from "lucide-react";
import { Suspense } from "react";
import WarehouseLoading from "./loading";

export default async function SupervisorWarehouseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const user = session?.user;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-8 antialiased">
      {/* Header Sticky Mobile-First */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Warehouse className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-wider text-neutral-100 font-mono">
                WAREHOUSE CONTROL
              </h1>
              <p className="text-[10px] text-neutral-400 font-mono">
                SPV:{" "}
                <span className="text-neutral-200">
                  {user?.name || "Warehouse Lead"}
                </span>
              </p>
            </div>
          </div>

          {/* Action Status & Logout */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-1 rounded-full border border-emerald-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              GUDANG
            </span>

            {/* Tombol Logout */}
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                title="Keluar / Logout"
                className="p-1.5 bg-neutral-950 hover:bg-neutral-800 border border-neutral-800 text-red-400 hover:text-red-300 rounded-lg transition-colors flex items-center justify-center"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Container Utama dengan Suspense Fallback Loading */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        <Suspense fallback={<WarehouseLoading />}>{children}</Suspense>
      </main>
    </div>
  );
}
