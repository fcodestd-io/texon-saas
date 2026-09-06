import { getPaginatedVendors } from "./action";
import { VendorClient } from "./vendor-client";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const initialData = await getPaginatedVendors({ page: 1, limit: 10 });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            TENANT MANAGEMENT
          </span>
          <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Manajemen Vendor & Pabrik
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
          Kelola entitas tenant konveksi serta pendaftaran akun Owner
        </p>
      </div>

      <VendorClient initialVendors={initialData} />
    </div>
  );
}
