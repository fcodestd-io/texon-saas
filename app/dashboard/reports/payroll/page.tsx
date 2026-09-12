import { auth } from "@/auth";
import { getWeeklyPayrollDataAction } from "./action";
import { PayrollPageClient } from "./client";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  // Tanggal default minggu berjalan (Senin)
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = today.getDate() - day + (day === 0 ? -6 : 1);
  const mondayDate = new Date(today.setDate(diffToMonday))
    .toISOString()
    .split("T")[0];

  const payrollResult = await getWeeklyPayrollDataAction(mondayDate);

  return (
    <PayrollPageClient
      initialStartDate={mondayDate}
      initialPayrollData={payrollResult?.payrollData || []}
      vendorBrandName={payrollResult?.brandName || "BRAND VENDOR"}
    />
  );
}
