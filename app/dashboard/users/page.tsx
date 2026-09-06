import { getUsers } from "./action";
import { UserClient } from "./user-client";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const initialUsers = await getUsers();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 tracking-wider uppercase">
          MANAJEMEN USERS & HAK AKSES VENDOR
        </h1>
        <p className="text-xs text-neutral-500 font-light">
          Kelola pengguna dan peran dalam sistem. Akun Owner bersifat Read-Only.
        </p>
      </div>

      <UserClient initialUsers={initialUsers} />
    </div>
  );
}
