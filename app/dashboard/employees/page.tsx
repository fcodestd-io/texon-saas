import { getEmployees } from "./action";
import { EmployeeClient } from "./employee-client";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const initialEmployees = await getEmployees();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 tracking-wider uppercase">
          DATA KARYAWAN BORONGAN
        </h1>
        <p className="text-xs text-neutral-500 font-light">
          Kelola tim borongan konveksi berdasarkan divisi (Cutting, Sewing,
          Overdeck, Finishing, Packing).
        </p>
      </div>

      <EmployeeClient initialEmployees={initialEmployees} />
    </div>
  );
}
