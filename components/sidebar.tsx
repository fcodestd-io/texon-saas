"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  LayoutDashboard,
  Boxes,
  Shirt,
  Layers,
  Truck,
  Users,
  UserCheck,
  LogOut,
  ShieldCheck,
  FileText,
  Building2,
  Loader2,
} from "lucide-react";

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarProps {
  user: {
    name?: string | null;
    role?: string;
    vendorId?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);

  // Otomatis matikan overlay saat proses berpindah halaman selesai
  useEffect(() => {
    setIsNavigating(false);
  }, [pathname]);

  const handleNavigation = (targetHref: string) => {
    if (pathname !== targetHref) {
      setIsNavigating(true);
    }
  };

  const getMenuItems = (): MenuItem[] => {
    switch (user.role) {
      case "superadmin":
        return [
          {
            title: "OVERVIEW SAAS",
            href: "/superadmin/dashboard",
            icon: LayoutDashboard,
          },
          {
            title: "MANAJEMEN VENDOR",
            href: "/superadmin/vendors",
            icon: Building2,
          },
          {
            title: "AKUN SUPERVISOR/OWNER",
            href: "/superadmin/users",
            icon: Users,
          },
          { title: "SYSTEM LOGS", href: "/superadmin/logs", icon: FileText },
        ];
      case "owner":
      case "admin":
        return [
          { title: "OVERVIEW", href: "/dashboard", icon: LayoutDashboard },
          {
            title: "UNIT, SIZE & COLOR",
            href: "/dashboard/attributes",
            icon: Layers,
          },
          { title: "BAHAN & STOK", href: "/dashboard/materials", icon: Boxes },
          { title: "PRODUK & STOK", href: "/dashboard/products", icon: Shirt },
          {
            title: "DATA KARYAWAN BORONGAN",
            href: "/dashboard/employees",
            icon: UserCheck,
          },
          {
            title: "EKSPEDISI & MARKETPLACE",
            href: "/dashboard/integrations",
            icon: Truck,
          },
          { title: "MANAJEMEN USER", href: "/dashboard/users", icon: Users },
        ];
      default:
        return [
          { title: "DASHBOARD", href: "/dashboard", icon: LayoutDashboard },
        ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <>
      {/* OVERLAY LOADING FULLSCREEN SAAT PINDAH PAGE */}
      {isNavigating && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-neutral-950/80 backdrop-blur-md transition-opacity duration-200">
          <div className="flex flex-col items-center space-y-4 p-6 bg-neutral-900 border border-neutral-800 shadow-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-neutral-100" />
            <p className="text-xs font-light tracking-[0.2em] text-neutral-300 uppercase">
              MEMUAT HALAMAN...
            </p>
          </div>
        </div>
      )}

      <aside className="w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800/80 bg-neutral-50 dark:bg-neutral-950 flex flex-col justify-between h-screen sticky top-0 transition-colors duration-200">
        <div className="p-6 space-y-8 overflow-y-auto">
          <Link href="/" className="flex items-center gap-3 group">
            <span className="text-xl font-light tracking-[0.2em] text-neutral-900 dark:text-neutral-100 uppercase">
              TEXON
            </span>
            <span className="text-[10px] font-extralight tracking-widest text-neutral-500 uppercase border-l border-neutral-300 dark:border-neutral-800 pl-3 py-0.5">
              GARMENT OS
            </span>
          </Link>

          {/* Info User & Role */}
          <div className="p-3 border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40 space-y-1">
            <div className="flex items-center gap-2 text-neutral-900 dark:text-neutral-100 font-light text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-neutral-500" />
              <span className="truncate">{user.name || "User"}</span>
            </div>
            <p className="text-[10px] font-extralight uppercase tracking-wider text-neutral-500">
              ROLE: {user.role}
            </p>
          </div>

          {/* Menu Navigasi */}
          <nav className="space-y-1">
            <p className="text-[10px] font-extralight uppercase tracking-[0.2em] text-neutral-500 mb-3 px-1">
              NAVIGASI OPERASIONAL
            </p>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`flex items-center gap-3 px-3 py-2.5 text-xs font-light tracking-wider transition-colors ${
                    isActive
                      ? "bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 font-normal"
                      : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100 hover:bg-neutral-200/50 dark:hover:bg-neutral-900/50"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Sidebar */}
        <div className="p-6 border-t border-neutral-200 dark:border-neutral-800/80 space-y-4 bg-neutral-50 dark:bg-neutral-950">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extralight text-neutral-500 uppercase tracking-widest">
              TEMA TAMPILAN
            </span>
            <ThemeToggle />
          </div>

          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-light text-red-600 dark:text-red-400 border border-neutral-200 dark:border-neutral-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors tracking-wider"
          >
            <LogOut className="w-3.5 h-3.5" />
            KELUAR SISTEM
          </button>
        </div>
      </aside>
    </>
  );
}
