"use client";

import {
  useState,
  useActionState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  createUser,
  updateUser,
  deleteUser,
  getPaginatedUsers,
} from "./action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  User,
  Lock,
  Building2,
  X,
  ShieldCheck,
  Filter,
} from "lucide-react";

export interface UserItem {
  id: string;
  username: string;
  role: string;
  vendorId: string | null;
  vendorName: string | null;
  createdAt: Date;
}

export interface VendorOption {
  id: string;
  brandName: string;
}

export function UserClient({
  initialUsers,
  vendorOptions,
}: {
  initialUsers: UserItem[];
  vendorOptions: VendorOption[];
}) {
  const [usersList, setUsersList] = useState<UserItem[]>(initialUsers);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("owner");

  // Delete Confirm State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [createState, createAction, isCreatePending] = useActionState(
    createUser,
    undefined,
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateUser,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Helper untuk merefresh data list user terbaru dari Server Action tanpa browser reload
  const refreshUserList = async () => {
    setPage(1);
    const freshData = await getPaginatedUsers({
      search: searchQuery,
      roleFilter,
      page: 1,
      limit: 10,
    });
    setUsersList(freshData);
    setHasMore(freshData.length === 10);
  };

  // Live Search & Filter Refetch
  useEffect(() => {
    const timer = setTimeout(async () => {
      setPage(1);
      const data = await getPaginatedUsers({
        search: searchQuery,
        roleFilter,
        page: 1,
        limit: 10,
      });
      setUsersList(data);
      setHasMore(data.length === 10);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, roleFilter]);

  // Infinite Scroll Fetcher
  const loadMoreData = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;
    const newItems = await getPaginatedUsers({
      search: searchQuery,
      roleFilter,
      page: nextPage,
      limit: 10,
    });

    if (newItems.length > 0) {
      setUsersList((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(newItems.length === 10);
    } else {
      setHasMore(false);
    }
    setIsFetchingMore(false);
  }, [page, searchQuery, roleFilter, isFetchingMore, hasMore]);

  // Intersection Observer Trigger Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingMore) {
          loadMoreData();
        }
      },
      { threshold: 0.5 },
    );

    const currentTarget = observerTarget.current;
    if (currentTarget) observer.observe(currentTarget);

    return () => {
      if (currentTarget) observer.unobserve(currentTarget);
    };
  }, [loadMoreData, hasMore, isFetchingMore]);

  // Toast Action Listeners + Instant State Refresh
  useEffect(() => {
    if (createState?.message) {
      if (createState.success) {
        toast.success(createState.message);
        setIsModalOpen(false);
        formRef.current?.reset();
        refreshUserList();
      } else {
        toast.error(createState.message);
      }
    }
  }, [createState]);

  useEffect(() => {
    if (updateState?.message) {
      if (updateState.success) {
        toast.success(updateState.message);
        setIsModalOpen(false);
        setEditingUser(null);
        refreshUserList();
      } else {
        toast.error(updateState.message);
      }
    }
  }, [updateState]);

  // Instant Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeletingLoading(true);
    const res = await deleteUser(deletingId);
    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setUsersList((prev) => prev.filter((u) => u.id !== deletingId));
      setDeletingId(null);
    } else {
      toast.error(res.message);
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "superadmin":
        return "bg-neutral-900 text-neutral-100 dark:bg-neutral-100 dark:text-neutral-950";
      case "owner":
        return "border border-neutral-900 dark:border-neutral-100 text-neutral-900 dark:text-neutral-100";
      case "admin":
        return "border border-neutral-400 text-neutral-700 dark:text-neutral-300";
      default:
        return "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400";
    }
  };

  return (
    <div className="space-y-6">
      {/* Control Bar: Search, Filter, & Create Button */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="flex flex-1 items-center gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari username atau nama pabrik..."
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
            />
          </div>

          <div className="relative w-44 shrink-0">
            <Filter className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400 pointer-events-none" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors appearance-none"
            >
              <option value="all">SEMUA ROLE</option>
              <option value="superadmin">SUPERADMIN</option>
              <option value="owner">OWNER</option>
              <option value="admin">ADMIN MASTER</option>
              <option value="spv_production">SPV PRODUCTION</option>
              <option value="spv_warehouse">SPV WAREHOUSE</option>
              <option value="spv_global">SPV GLOBAL</option>
            </select>
          </div>
        </div>

        <button
          onClick={() => {
            setEditingUser(null);
            setSelectedRole("owner");
            setIsModalOpen(true);
          }}
          className="text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> BUAT AKUN BARU
        </button>
      </div>

      {/* Tabel Users List */}
      <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40">
        {usersList.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Users className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              Tidak ada akun user terdaftar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
            {usersList.map((user) => (
              <div
                key={user.id}
                className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-light text-neutral-900 dark:text-neutral-100">
                      {user.username}
                    </span>
                    <span
                      className={`text-[9px] font-extralight px-2 py-0.5 uppercase tracking-wider ${getRoleBadge(
                        user.role,
                      )}`}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-xs font-extralight text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-neutral-400" />
                      {user.vendorName || "Global Platform (No Vendor)"}
                    </span>
                    <span className="text-[10px] text-neutral-400">
                      ID: {user.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setEditingUser(user);
                      setSelectedRole(user.role);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition-colors"
                    title="Edit User"
                  >
                    <Edit2 className="w-3.5 h-3.5 stroke-1.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(user.id);
                      setDeletingName(user.username);
                    }}
                    className="p-2 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800 hover:border-red-300 transition-colors"
                    title="Hapus User"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-1.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Anchor element untuk Infinite Scroll */}
        <div
          ref={observerTarget}
          className="p-4 text-center border-t border-neutral-100 dark:border-neutral-800/40"
        >
          {isFetchingMore ? (
            <div className="flex items-center justify-center gap-2 text-xs font-extralight text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              MEMUAT USER LAINNYA...
            </div>
          ) : !hasMore && usersList.length > 0 ? (
            <span className="text-[10px] font-extralight text-neutral-400 uppercase tracking-widest">
              SEMUA DATA USER TELAH TAMPIL
            </span>
          ) : null}
        </div>
      </div>

      {/* Modal Form Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
              <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neutral-500" />
                {editingUser ? "EDIT AKUN USER" : "BUAT AKUN USER BARU"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingUser(null);
                }}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              ref={formRef}
              action={editingUser ? updateAction : createAction}
              className="space-y-4"
            >
              {editingUser && (
                <input type="hidden" name="id" value={editingUser.id} />
              )}

              {/* Username Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Username *
                </label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    name="username"
                    type="text"
                    defaultValue={editingUser?.username || ""}
                    disabled={
                      Boolean(editingUser) || isCreatePending || isUpdatePending
                    }
                    placeholder="Contoh: spv_potong"
                    className="w-full pl-9 pr-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors disabled:opacity-60"
                  />
                </div>
                {createState?.errors?.username && (
                  <p className="text-[10px] text-red-500">
                    {createState.errors.username[0]}
                  </p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  {editingUser ? "Reset Password (Opsional)" : "Password *"}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                  <input
                    name="password"
                    type="password"
                    placeholder={
                      editingUser ? "Kosongkan jika tidak diubah" : "••••••••"
                    }
                    disabled={isCreatePending || isUpdatePending}
                    className="w-full pl-9 pr-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>
                {createState?.errors?.password && (
                  <p className="text-[10px] text-red-500">
                    {createState.errors.password[0]}
                  </p>
                )}
              </div>

              {/* Role Select */}
              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Otoritas Role *
                </label>
                <select
                  name="role"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  disabled={isCreatePending || isUpdatePending}
                  className="w-full px-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                >
                  <option value="owner">OWNER (PEMILIK PABRIK)</option>
                  <option value="admin">ADMIN (MASTER DATA)</option>
                  <option value="spv_production">SPV PRODUCTION</option>
                  <option value="spv_warehouse">SPV WAREHOUSE</option>
                  <option value="spv_global">SPV GLOBAL</option>
                  <option value="superadmin">SUPERADMIN SAAS</option>
                </select>
              </div>

              {/* Vendor Selector (Khusus selain Superadmin) */}
              {selectedRole !== "superadmin" && (
                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Asosiasi Pabrik / Vendor *
                  </label>
                  <select
                    name="vendorId"
                    defaultValue={editingUser?.vendorId || ""}
                    disabled={isCreatePending || isUpdatePending}
                    className="w-full px-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  >
                    <option value="">-- Pilih Vendor --</option>
                    {vendorOptions.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.brandName} ({v.id})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2.5 text-xs font-light text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors uppercase tracking-wider"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isCreatePending || isUpdatePending}
                  className="px-5 py-2.5 text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center gap-2 uppercase disabled:opacity-50"
                >
                  {(isCreatePending || isUpdatePending) && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingUser ? "SIMPAN PERUBAHAN" : "BUAT AKUN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="HAPUS AKUN USER"
        description={`Apakah Anda yakin ingin menghapus user "${deletingName}"? User ini tidak akan bisa login kembali.`}
        confirmText="Hapus Permanen"
        isDanger={true}
        isLoading={isDeletingLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
