import { auth } from "@/auth";
import { DashboardOverview } from "./dashboard-overview";

export const dynamic = "force-dynamic";

export default async function SharedDashboardPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80 font-mono">
        <div>
          <span className="text-xs font-bold tracking-widest text-amber-500 uppercase block">
            DASHBOARD OVERVIEW
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 mt-1 uppercase">
            Ringkasan Operasional & Keuangan
          </h1>
        </div>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          Akses Login:{" "}
          <strong className="uppercase text-amber-400">{userRole}</strong>
        </p>
      </div>

      {/* Render Client Component Dashboard */}
      <DashboardOverview />
    </div>
  );
}
