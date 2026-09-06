import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";
import { LogOut, Scissors } from "lucide-react";
import { Suspense } from "react";
import SpvProductionLoading from "./loading";

export default async function SpvProductionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const userName = session?.user?.name || "Supervisor Produksi";
  const vendorName = (session?.user as any)?.vendorName || "TEXON GARMENT";

  if (!session?.user) {
    redirect("/login");
  }

  if (
    userRole !== "spv_production" &&
    userRole !== "spv_global" &&
    userRole !== "owner" &&
    userRole !== "admin"
  ) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans pb-8 antialiased">
      {/* Header Sticky Mobile-First */}
      <header className="sticky top-0 z-40 bg-neutral-900/90 backdrop-blur-md border-b border-neutral-800/80 px-4 py-3 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
              <Scissors className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-xs font-bold uppercase tracking-wider text-neutral-100 font-mono">
                PRODUCTION CONTROL
              </h1>
              <p className="text-[10px] text-neutral-400 font-mono">
                SPV: <span className="text-neutral-200">{userName}</span>
              </p>
            </div>
          </div>

          {/* Action Header: Status Produksi & Logout */}
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-[9px] font-mono text-amber-400 bg-amber-950/60 px-2 py-1 rounded-full border border-amber-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
              PRODUKSI
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

      {/* Main Container dengan Suspense Fallback Loading */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        <Suspense fallback={<SpvProductionLoading />}>{children}</Suspense>
      </main>
    </div>
  );
}
