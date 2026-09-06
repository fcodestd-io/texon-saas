import { getPaginatedUsers, getVendorOptions } from "./action";
import { UserClient } from "./user-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const [initialUsers, vendorOptions] = await Promise.all([
    getPaginatedUsers({ page: 1, limit: 10 }),
    getVendorOptions(),
  ]);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            USER ACCESS MANAGEMENT
          </span>
          <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Manajemen Akun User & Hak Akses
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
          Kelola seluruh kredensial akun Owner, Admin Master, dan Supervisor
        </p>
      </div>

      <UserClient initialUsers={initialUsers} vendorOptions={vendorOptions} />
    </div>
  );
}
