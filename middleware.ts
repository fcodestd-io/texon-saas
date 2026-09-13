import { NextResponse } from "next/server";
import { auth, getDashboardPathByRole } from "@/auth"; // Sesuaikan path import auth Anda

// Definisi pemetaan rute dengan role yang diizinkan
const roleRouteAccess: Record<string, string[]> = {
  // Hanya Superadmin
  "/superadmin": ["superadmin"],

  // Khusus Owner (CRUD User / Vendor Staff & Settings sensitif)
  "/dashboard/users": ["owner"],

  // Owner & Admin (Operasional & Laporan Vendor)
  "/dashboard": ["owner", "admin"],

  // Supervisor Production
  "/supervisor/production": ["spv_production"],

  // Supervisor Warehouse
  "/supervisor/warehouse": ["spv_warehouse"],
};

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = (req.auth?.user as any)?.role as string | undefined;

  const pathname = nextUrl.pathname;

  // 1. Tangani halaman publik (Halaman Login)
  if (pathname === "/login") {
    if (isLoggedIn && userRole) {
      // Jika pengguna sudah login dan mencoba ke /login, redirect ke dashboard masing-masing
      return NextResponse.redirect(
        new URL(getDashboardPathByRole(userRole), req.url),
      );
    }
    return NextResponse.next();
  }

  // 2. Proteksi Autentikasi: Jika belum login dan mencoba mengakses area terproteksi
  if (!isLoggedIn) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. Proteksi Otorisasi berdasarkan Role (RBAC) pada Rute Halaman
  for (const [routePrefix, allowedRoles] of Object.entries(roleRouteAccess)) {
    if (pathname.startsWith(routePrefix)) {
      if (!userRole || !allowedRoles.includes(userRole)) {
        // Jika role tidak sesuai, lemparkan ke dashboard utama mereka masing-masing
        const defaultPath = getDashboardPathByRole(userRole);
        return NextResponse.redirect(new URL(defaultPath, req.url));
      }
      break; // Menghentikan iterasi jika rute yang paling spesifik sudah cocok
    }
  }

  return NextResponse.next();
});

// Konfigurasi Matcher Next.js Middleware
export const config = {
  matcher: [
    /*
     * Match semua request rute kecuali:
     * - api/auth (NextAuth endpoints)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, images, dan aset publik lainnya
     */
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
