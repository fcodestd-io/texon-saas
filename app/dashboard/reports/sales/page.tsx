import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getSalesReportAction } from "./action";
import { SalesReportClient } from "./client";

// Augmentasi type session NextAuth agar TypeScript mengenali role & vendorId
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: string;
      vendorId: string | null;
      vendorName: string | null;
    };
  }
}

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
}

export default async function SalesReportPage({ searchParams }: PageProps) {
  const session = await auth();

  // Redirect jika belum terautentikasi
  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = session.user.role;

  // Proteksi hak akses khusus Role Owner & Admin
  if (userRole !== "owner" && userRole !== "admin") {
    redirect("/dashboard");
  }

  const resolvedParams = await searchParams;
  const currentDate = new Date();

  const year = resolvedParams.year
    ? parseInt(resolvedParams.year, 10)
    : currentDate.getFullYear();
  const month = resolvedParams.month
    ? parseInt(resolvedParams.month, 10)
    : currentDate.getMonth() + 1;

  // Mengambil vendorId langsung dari session hasil NextAuth callback
  const vendorId = session.user.vendorId || "";

  const reportData = await getSalesReportAction(vendorId, year, month);

  return (
    <SalesReportClient
      initialData={reportData}
      initialYear={year}
      initialMonth={month}
    />
  );
}
