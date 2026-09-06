import { auth } from "@/auth";
import { DashboardOverview } from "./dashboard-overview";

export const dynamic = "force-dynamic";

// 📍 WAJIB MEMAKAI 'export default'
export default async function SharedDashboardPage() {
  const session = await auth();
  const userRole = (session?.user as any)?.role;
  const isOwner = userRole === "owner";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            DASHBOARD OVERVIEW
          </span>
          <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Ringkasan Operasional Pabrik
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
          Akses Logged-In:{" "}
          <strong className="uppercase font-normal">{userRole}</strong>
        </p>
      </div>

      {/* Render Client Component Dashboard */}
      <DashboardOverview isOwner={isOwner} />
    </div>
  );
}
