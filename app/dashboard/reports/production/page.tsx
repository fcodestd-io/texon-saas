import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getProductionWorkflowReportAction } from "./action";
import { ProductionWorkflowClient } from "./client";

interface PageProps {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
}

export default async function ProductionWorkflowPage({
  searchParams,
}: PageProps) {
  const session = await auth();

  if (!session || !session.user) {
    redirect("/login");
  }

  const userRole = session.user.role;
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

  const vendorId = session.user.vendorId || "";
  const reportData = await getProductionWorkflowReportAction(
    vendorId,
    year,
    month,
  );

  return (
    <ProductionWorkflowClient
      initialData={reportData}
      initialYear={year}
      initialMonth={month}
    />
  );
}
