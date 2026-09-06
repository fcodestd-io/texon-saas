"use client";

import { useState, useActionState, useEffect } from "react";
import { upsertEmployee, deleteEmployee, getEmployees } from "./action";
import { toast } from "sonner";
import {
  UserCheck,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  X,
  ShieldAlert,
  Scissors,
  Shirt,
  Sparkles,
  Package,
} from "lucide-react";

const TYPE_CONFIGS: Record<
  string,
  { label: string; icon: any; colorClass: string }
> = {
  cutting: {
    label: "CUTTING",
    icon: Scissors,
    colorClass: "bg-blue-950/30 text-blue-400 border-blue-900/50",
  },
  sewing: {
    label: "SEWING",
    icon: Shirt,
    colorClass: "bg-emerald-950/30 text-emerald-400 border-emerald-900/50",
  },
  overdeck: {
    label: "OVERDECK",
    icon: Shirt,
    colorClass: "bg-purple-950/30 text-purple-400 border-purple-900/50",
  },
  finishing: {
    label: "FINISHING",
    icon: Sparkles,
    colorClass: "bg-amber-950/30 text-amber-400 border-amber-900/50",
  },
  packing: {
    label: "PACKING",
    icon: Package,
    colorClass: "bg-rose-950/30 text-rose-400 border-rose-900/50",
  },
};

export function EmployeeClient({
  initialEmployees,
}: {
  initialEmployees: any[];
}) {
  const [employeesList, setEmployeesList] = useState<any[]>(
    initialEmployees || [],
  );
  const [searchQuery, setSearchQuery] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<any | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState("sewing");

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [state, formAction, isPending] = useActionState(
    upsertEmployee,
    undefined,
  );

  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await getEmployees(searchQuery);
      setEmployeesList(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
        setIsModalOpen(false);
        resetForm();
        getEmployees(searchQuery).then(setEmployeesList);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const resetForm = () => {
    setEditingEmp(null);
    setName("");
    setType("sewing");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (emp: any) => {
    setEditingEmp(emp);
    setName(emp.name);
    setType(emp.type);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeletingLoading(true);
    const res = await deleteEmployee(deletingId);
    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setDeletingId(null);
      getEmployees(searchQuery).then(setEmployeesList);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama karyawan..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="text-xs font-light bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> TAMBAH KARYAWAN
        </button>
      </div>

      {/* Employees Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 divide-y divide-neutral-200 dark:divide-neutral-800">
        {employeesList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <UserCheck className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              Belum ada data karyawan borongan terdaftar.
            </p>
          </div>
        ) : (
          employeesList.map((emp) => {
            const conf = TYPE_CONFIGS[emp.type] || TYPE_CONFIGS.sewing;
            const Icon = conf.icon;

            return (
              <div
                key={emp.id}
                className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 font-mono">
                        {emp.name}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 border uppercase flex items-center gap-1 ${conf.colorClass}`}
                      >
                        <Icon className="w-3 h-3" /> {conf.label}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => handleOpenEdit(emp)}
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                    title="Edit Karyawan"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(emp.id);
                      setDeletingName(emp.name);
                    }}
                    className="p-2 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800 hover:border-red-900/50"
                    title="Hapus Karyawan"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Upsert */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-neutral-500" />
                {editingEmp
                  ? "EDIT KARYAWAN BORONGAN"
                  : "TAMBAH KARYAWAN BORONGAN"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              {editingEmp && (
                <input type="hidden" name="id" value={editingEmp.id} />
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  NAMA KARYAWAN *
                </label>
                <input
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Mang Asep / Bu Ani"
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
                {state?.errors?.name && (
                  <p className="text-[10px] text-red-500 font-mono">
                    {state.errors.name[0]}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  DIVISI BORONGAN (TYPE)
                </label>
                <select
                  name="type"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="cutting">CUTTING (POTONG)</option>
                  <option value="sewing">SEWING (JAHIT)</option>
                  <option value="overdeck">OVERDECK (KAM)</option>
                  <option value="finishing">FINISHING (NEAT/CLEAN)</option>
                  <option value="packing">PACKING (KEMAS)</option>
                </select>
                {state?.errors?.type && (
                  <p className="text-[10px] text-red-500 font-mono">
                    {state.errors.type[0]}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 border border-neutral-300 dark:border-neutral-800"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 flex items-center gap-2 font-medium"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingEmp ? "SIMPAN PERUBAHAN" : "SIMPAN KARYAWAN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Hapus */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                KONFIRMASI HAPUS KARYAWAN
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus karyawan{" "}
              <strong className="text-neutral-100 font-mono">
                {deletingName}
              </strong>
              ?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingId(null)}
                className="px-4 py-2 text-xs text-neutral-400 border border-neutral-800"
              >
                BATAL
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={isDeletingLoading}
                className="px-4 py-2 text-xs bg-red-600 text-white flex items-center gap-2 font-medium"
              >
                {isDeletingLoading && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                HAPUS PERMANEN
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
