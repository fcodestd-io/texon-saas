"use client";

import {
  useState,
  useActionState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  createVendorWithOwner,
  updateVendor,
  deleteVendor,
  getPaginatedVendors,
} from "./action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Phone,
  MapPin,
  User,
  Lock,
  X,
  Search,
} from "lucide-react";

export interface VendorItem {
  id: string;
  brandName: string;
  phone: string | null;
  address: string | null;
  createdAt: Date;
}

export function VendorClient({
  initialVendors,
}: {
  initialVendors: VendorItem[];
}) {
  const [vendorsList, setVendorsList] = useState<VendorItem[]>(initialVendors);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVendor, setEditingVendor] = useState<VendorItem | null>(null);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [createState, createAction, isCreatePending] = useActionState(
    createVendorWithOwner,
    undefined,
  );
  const [updateState, updateAction, isUpdatePending] = useActionState(
    updateVendor,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Helper untuk merefresh data list terbaru dari Server Action
  const refreshVendorList = async () => {
    setPage(1);
    const freshData = await getPaginatedVendors({
      search: searchQuery,
      page: 1,
      limit: 10,
    });
    setVendorsList(freshData);
    setHasMore(freshData.length === 10);
  };

  // Live Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setPage(1);
      const data = await getPaginatedVendors({
        search: searchQuery,
        page: 1,
        limit: 10,
      });
      setVendorsList(data);
      setHasMore(data.length === 10);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Infinite Scroll Fetcher
  const loadMoreData = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;
    const newItems = await getPaginatedVendors({
      search: searchQuery,
      page: nextPage,
      limit: 10,
    });

    if (newItems.length > 0) {
      setVendorsList((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(newItems.length === 10);
    } else {
      setHasMore(false);
    }
    setIsFetchingMore(false);
  }, [page, searchQuery, isFetchingMore, hasMore]);

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

  // 1. OTOMATIS REFRESH STATE SETELAH SUCCESS CREATE
  useEffect(() => {
    if (createState?.message) {
      if (createState.success) {
        toast.success(createState.message);
        setIsModalOpen(false);
        formRef.current?.reset();
        refreshVendorList(); // 👈 Refetch data otomatis tanpa reload browser
      } else {
        toast.error(createState.message);
      }
    }
  }, [createState]);

  // 2. OTOMATIS REFRESH STATE SETELAH SUCCESS UPDATE
  useEffect(() => {
    if (updateState?.message) {
      if (updateState.success) {
        toast.success(updateState.message);
        setIsModalOpen(false);
        setEditingVendor(null);
        refreshVendorList(); // 👈 Refetch data otomatis tanpa reload browser
      } else {
        toast.error(updateState.message);
      }
    }
  }, [updateState]);

  // 3. OTOMATIS FILTER REMOVE SETELAH SUCCESS DELETE
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeletingLoading(true);
    const res = await deleteVendor(deletingId);
    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      // Hapus item dari state lokal seketika
      setVendorsList((prev) => prev.filter((v) => v.id !== deletingId));
      setDeletingId(null);
    } else {
      toast.error(res.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Action Button */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama brand, telepon, atau alamat..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
          />
        </div>

        <button
          onClick={() => {
            setEditingVendor(null);
            setIsModalOpen(true);
          }}
          className="text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> TAMBAH VENDOR BARU
        </button>
      </div>

      {/* Vendor Table */}
      <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40">
        {vendorsList.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Building2 className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              {searchQuery
                ? `Tidak ada vendor yang cocok dengan kata kunci "${searchQuery}".`
                : "Belum ada vendor terdaftar."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
            {vendorsList.map((vendor) => (
              <div
                key={vendor.id}
                className="p-5 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-light text-neutral-900 dark:text-neutral-100">
                      {vendor.brandName}
                    </span>
                    <span className="text-[9px] font-extralight text-neutral-400 border border-neutral-200 dark:border-neutral-800 px-1.5 py-0.5 uppercase">
                      ID: {vendor.id}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs font-extralight text-neutral-500">
                    {vendor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-neutral-400" />{" "}
                        {vendor.phone}
                      </span>
                    )}
                    {vendor.address && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-neutral-400" />{" "}
                        {vendor.address}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center">
                  <button
                    onClick={() => {
                      setEditingVendor(vendor);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition-colors"
                    title="Edit Vendor"
                  >
                    <Edit2 className="w-3.5 h-3.5 stroke-1.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(vendor.id);
                      setDeletingName(vendor.brandName);
                    }}
                    className="p-2 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800 hover:border-red-300 transition-colors"
                    title="Hapus Vendor"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-1.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div
          ref={observerTarget}
          className="p-4 text-center border-t border-neutral-100 dark:border-neutral-800/40"
        >
          {isFetchingMore ? (
            <div className="flex items-center justify-center gap-2 text-xs font-extralight text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              MEMUAT VENDOR LAINNYA...
            </div>
          ) : !hasMore && vendorsList.length > 0 ? (
            <span className="text-[10px] font-extralight text-neutral-400 uppercase tracking-widest">
              SEMUA DATA VENDOR TELAH TAMPIL
            </span>
          ) : null}
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
              <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100">
                {editingVendor
                  ? "EDIT DATA VENDOR"
                  : "REGISTRASI VENDOR & OWNER"}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingVendor(null);
                }}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              ref={formRef}
              action={editingVendor ? updateAction : createAction}
              className="space-y-4"
            >
              {editingVendor && (
                <input type="hidden" name="id" value={editingVendor.id} />
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Nama Brand / Konveksi *
                  </label>
                  <input
                    name="brandName"
                    type="text"
                    defaultValue={editingVendor?.brandName || ""}
                    placeholder="Contoh: CV Garment Bandung"
                    disabled={isCreatePending || isUpdatePending}
                    className="w-full px-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                  {(createState?.errors?.brandName ||
                    updateState?.errors?.brandName) && (
                    <p className="text-[10px] text-red-500">
                      {createState?.errors?.brandName?.[0] ||
                        updateState?.errors?.brandName?.[0]}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    No. Telepon / WhatsApp
                  </label>
                  <input
                    name="phone"
                    type="text"
                    defaultValue={editingVendor?.phone || ""}
                    placeholder="081234567890"
                    disabled={isCreatePending || isUpdatePending}
                    className="w-full px-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                    Alamat Pabrik
                  </label>
                  <textarea
                    name="address"
                    rows={2}
                    defaultValue={editingVendor?.address || ""}
                    placeholder="Jl. Raya Konveksi No. 100, Bandung"
                    disabled={isCreatePending || isUpdatePending}
                    className="w-full px-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors resize-none"
                  />
                </div>
              </div>

              {!editingVendor && (
                <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800/80">
                  <span className="text-[10px] font-extralight uppercase tracking-widest text-neutral-500 block">
                    AKUN LOGIN OWNER (PEMILIK)
                  </span>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      Username Owner *
                    </label>
                    <div className="relative">
                      <User className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                      <input
                        name="ownerUsername"
                        type="text"
                        placeholder="owner_bandung"
                        disabled={isCreatePending}
                        className="w-full pl-9 pr-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                      />
                    </div>
                    {createState?.errors?.ownerUsername && (
                      <p className="text-[10px] text-red-500">
                        {createState.errors.ownerUsername[0]}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                      Password Awal *
                    </label>
                    <div className="relative">
                      <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-neutral-400" />
                      <input
                        name="ownerPassword"
                        type="password"
                        placeholder="••••••••"
                        disabled={isCreatePending}
                        className="w-full pl-9 pr-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                      />
                    </div>
                    {createState?.errors?.ownerPassword && (
                      <p className="text-[10px] text-red-500">
                        {createState.errors.ownerPassword[0]}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingVendor(null);
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
                  {editingVendor ? "SIMPAN PERUBAHAN" : "SIMPAN VENDOR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="HAPUS VENDOR"
        description={`Apakah Anda yakin ingin menghapus vendor "${deletingName}"? Seluruh data terkait vendor ini akan dihapus secara permanen.`}
        confirmText="Hapus Permanen"
        isDanger={true}
        isLoading={isDeletingLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
