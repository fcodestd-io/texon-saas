import { db } from "@/db";
import { vendors, users } from "@/db/schema";
import { count } from "drizzle-orm";
import { Building2, Users, Shield, ArrowUpRight } from "lucide-react";
import Link from "next/link";

export default async function SuperadminDashboardPage() {
  // Mengambil total statistik vendor & pengguna dari database Neon
  const [[{ value: totalVendors }], [{ value: totalUsers }]] =
    await Promise.all([
      db.select({ value: count() }).from(vendors),
      db.select({ value: count() }).from(users),
    ]);

  return (
    <div className="p-8 space-y-10">
      {/* Header Dashboard */}
      <div className="flex flex-col md:flex-row justify-between md:items-end gap-4 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            SAAS SYSTEM CONTROL
          </span>
          <h1 className="text-2xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Superadmin Dashboard
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500">
          Ringkasan ekosistem multi-tenant SaaS Garment Texon.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extralight text-neutral-500 uppercase tracking-widest">
              TOTAL VENDOR / TENANT
            </span>
            <Building2 className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-3xl font-extralight text-neutral-900 dark:text-neutral-100">
              {totalVendors}
            </p>
            <p className="text-xs font-light text-neutral-500 mt-1">
              Pabrik & Konveksi Terdaftar
            </p>
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extralight text-neutral-500 uppercase tracking-widest">
              TOTAL OPERATOR & USER
            </span>
            <Users className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-3xl font-extralight text-neutral-900 dark:text-neutral-100">
              {totalUsers}
            </p>
            <p className="text-xs font-light text-neutral-500 mt-1">
              Akun Terdaftar di Sistem
            </p>
          </div>
        </div>

        <div className="border border-neutral-200 dark:border-neutral-800/80 p-6 space-y-4 bg-white dark:bg-transparent">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-extralight text-neutral-500 uppercase tracking-widest">
              SYSTEM STATUS
            </span>
            <Shield className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-3xl font-extralight text-emerald-600 dark:text-emerald-400">
              ACTIVE
            </p>
            <p className="text-xs font-light text-neutral-500 mt-1">
              Neon DB & Auth v5 Connected
            </p>
          </div>
        </div>
      </div>

      {/* Management Action Sections */}
      <div className="space-y-4 pt-4">
        <h2 className="text-sm font-light text-neutral-900 dark:text-neutral-100 uppercase tracking-wider">
          Aksi Cepat Superadmin
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/superadmin/vendors"
            className="border border-neutral-200 dark:border-neutral-800/80 p-6 flex justify-between items-center group hover:border-neutral-900 dark:hover:border-neutral-100 transition-colors"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-light text-neutral-900 dark:text-neutral-100">
                Kelola Vendor & Registrasi Tenant Baru
              </h3>
              <p className="text-xs font-light text-neutral-500">
                Tambah atau nonaktifkan brand konveksi pelanggan SaaS.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors" />
          </Link>

          <Link
            href="/superadmin/users"
            className="border border-neutral-200 dark:border-neutral-800/80 p-6 flex justify-between items-center group hover:border-neutral-900 dark:hover:border-neutral-100 transition-colors"
          >
            <div className="space-y-1">
              <h3 className="text-sm font-light text-neutral-900 dark:text-neutral-100">
                Kelola Pengguna Sistem
              </h3>
              <p className="text-xs font-light text-neutral-500">
                Atur role user, reset password, dan atribusi vendor.
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-neutral-100 transition-colors" />
          </Link>
        </div>
      </div>
    </div>
  );
}
