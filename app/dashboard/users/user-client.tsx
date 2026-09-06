"use client";

import { useState, useActionState, useEffect } from "react";
import { upsertUser, deleteUser, getUsers } from "./action";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  X,
  ShieldAlert,
  UserCheck,
  Lock,
} from "lucide-react";

const ROLE_LABELS: Record<string, string> = {
  owner: "OWNER (READ-ONLY)",
  admin: "ADMINISTRATOR",
  spv_production: "SPV PRODUCTION",
  spv_warehouse: "SPV WAREHOUSE",
  spv_global: "SPV GLOBAL",
};

export function UserClient({ initialUsers }: { initialUsers: any[] }) {
  const [usersList, setUsersList] = useState<any[]>(initialUsers || []);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form Fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("admin");

  // Deleting State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [state, formAction, isPending] = useActionState(upsertUser, undefined);

  // Live Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      const res = await getUsers(searchQuery);
      setUsersList(res);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Action Response Handler
  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
        setIsModalOpen(false);
        resetForm();
        getUsers(searchQuery).then(setUsersList);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const resetForm = () => {
    setEditingUser(null);
    setUsername("");
    setPassword("");
    setRole("admin");
  };

  const handleOpenAdd = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: any) => {
    if (user.role === "owner") {
      toast.warning("Akun Owner bersifat Read-Only dan tidak dapat diubah.");
      return;
    }
    setEditingUser(user);
    setUsername(user.username);
    setPassword("");
    setRole(user.role);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeletingLoading(true);
    const res = await deleteUser(deletingId);
    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setDeletingId(null);
      getUsers(searchQuery).then(setUsersList);
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
            placeholder="Cari username..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="text-xs font-light bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> TAMBAH USER BARU
        </button>
      </div>

      {/* Users Data Table */}
      <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/40 divide-y divide-neutral-200 dark:divide-neutral-800">
        {usersList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              Tidak ada data user terdaftar.
            </p>
          </div>
        ) : (
          usersList.map((u) => {
            const isOwner = u.role === "owner";

            return (
              <div
                key={u.id}
                className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    {u.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 font-mono">
                        {u.username}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 border uppercase ${
                          isOwner
                            ? "bg-amber-950/30 text-amber-400 border-amber-900/50 font-bold"
                            : "bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                        }`}
                      >
                        {ROLE_LABELS[u.role] || u.role}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  {isOwner ? (
                    <span className="text-[10px] text-neutral-500 font-mono flex items-center gap-1 px-2 py-1 border border-neutral-800 bg-neutral-950">
                      <Lock className="w-3 h-3 text-amber-500" /> PROTECTED
                      OWNER
                    </span>
                  ) : (
                    <>
                      <button
                        onClick={() => handleOpenEdit(u)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400"
                        title="Edit User"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingId(u.id);
                          setDeletingName(u.username);
                        }}
                        className="p-2 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800 hover:border-red-900/50"
                        title="Hapus User"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form Upsert */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-neutral-500" />
                {editingUser ? "EDIT DATA USER" : "TAMBAH USER BARU"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form action={formAction} className="space-y-4">
              {editingUser && (
                <input type="hidden" name="id" value={editingUser.id} />
              )}

              {/* Field Username */}
              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  USERNAME *
                </label>
                <input
                  name="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Contoh: staff_gudang01"
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
                {state?.errors?.username && (
                  <p className="text-[10px] text-red-500 font-mono">
                    {state.errors.username[0]}
                  </p>
                )}
              </div>

              {/* Field Password */}
              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  PASSWORD {editingUser && "(KOSONGKAN JIKA TIDAK DIUBAH)"}
                </label>
                <input
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    editingUser ? "••••••••" : "Masukkan password baru"
                  }
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
                {state?.errors?.password && (
                  <p className="text-[10px] text-red-500 font-mono">
                    {state.errors.password[0]}
                  </p>
                )}
              </div>

              {/* Field Role (Opsi Owner & Superadmin Disembunyikan) */}
              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  ROLE / HAK AKSES
                </label>
                <select
                  name="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                >
                  <option value="admin">ADMINISTRATOR</option>
                  <option value="spv_production">SPV PRODUCTION</option>
                  <option value="spv_warehouse">SPV WAREHOUSE</option>
                  <option value="spv_global">SPV GLOBAL</option>
                </select>
                {state?.errors?.role && (
                  <p className="text-[10px] text-red-500 font-mono">
                    {state.errors.role[0]}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs text-neutral-400 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 text-xs bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 flex items-center gap-2 font-medium hover:bg-neutral-800"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingUser ? "SIMPAN PERUBAHAN" : "SIMPAN USER"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Hapus */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <ShieldAlert className="w-5 h-5" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">
                KONFIRMASI HAPUS USER
              </h3>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Apakah Anda yakin ingin menghapus user{" "}
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
                className="px-4 py-2 text-xs bg-red-600 text-white flex items-center gap-2 font-medium hover:bg-red-700"
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
