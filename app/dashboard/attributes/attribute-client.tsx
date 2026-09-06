"use client";

import {
  useState,
  useActionState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  upsertAttribute,
  deleteAttribute,
  getPaginatedAttributes,
} from "./action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Layers,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  X,
  Ruler,
  Palette,
  Box,
} from "lucide-react";

export interface AttributeItem {
  id: string;
  vendorId: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

type TabType = "unit" | "size" | "color";

export function AttributeClient({
  initialUnits,
  initialSizes,
  initialColors,
}: {
  initialUnits: AttributeItem[];
  initialSizes: AttributeItem[];
  initialColors: AttributeItem[];
}) {
  const [activeTab, setActiveTab] = useState<TabType>("unit");

  // State List Data
  const [itemsList, setItemsList] = useState<AttributeItem[]>(initialUnits);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AttributeItem | null>(null);

  // Confirm Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [state, formAction, isPending] = useActionState(
    upsertAttribute,
    undefined,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Switch Tab Handler
  const handleTabChange = async (tab: TabType) => {
    setActiveTab(tab);
    setSearchQuery("");
    setPage(1);

    let initialData = [];
    if (tab === "unit") initialData = initialUnits;
    else if (tab === "size") initialData = initialSizes;
    else initialData = initialColors;

    const freshData = await getPaginatedAttributes({
      type: tab,
      search: "",
      page: 1,
      limit: 10,
    });

    setItemsList(freshData.length > 0 ? freshData : initialData);
    setHasMore(freshData.length === 10);
  };

  // Refetch Helper tanpa reload
  const refreshList = async () => {
    setPage(1);
    const freshData = await getPaginatedAttributes({
      type: activeTab,
      search: searchQuery,
      page: 1,
      limit: 10,
    });
    setItemsList(freshData);
    setHasMore(freshData.length === 10);
  };

  // Live Search
  useEffect(() => {
    const timer = setTimeout(async () => {
      setPage(1);
      const data = await getPaginatedAttributes({
        type: activeTab,
        search: searchQuery,
        page: 1,
        limit: 10,
      });
      setItemsList(data);
      setHasMore(data.length === 10);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  // Infinite Scroll Fetcher
  const loadMoreData = useCallback(async () => {
    if (isFetchingMore || !hasMore) return;

    setIsFetchingMore(true);
    const nextPage = page + 1;
    const newItems = await getPaginatedAttributes({
      type: activeTab,
      search: searchQuery,
      page: nextPage,
      limit: 10,
    });

    if (newItems.length > 0) {
      setItemsList((prev) => [...prev, ...newItems]);
      setPage(nextPage);
      setHasMore(newItems.length === 10);
    } else {
      setHasMore(false);
    }
    setIsFetchingMore(false);
  }, [page, searchQuery, activeTab, isFetchingMore, hasMore]);

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

  // Toast Action Listeners
  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
        setIsModalOpen(false);
        setEditingItem(null);
        formRef.current?.reset();
        refreshList();
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  // Instant Delete Handler
  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeletingLoading(true);
    const res = await deleteAttribute({ id: deletingId, type: activeTab });
    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setItemsList((prev) => prev.filter((item) => item.id !== deletingId));
      setDeletingId(null);
    } else {
      toast.error(res.message);
    }
  };

  const getTabIcon = (tab: TabType) => {
    switch (tab) {
      case "unit":
        return <Box className="w-3.5 h-3.5" />;
      case "size":
        return <Ruler className="w-3.5 h-3.5" />;
      case "color":
        return <Palette className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigasi & Live Search */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="flex items-center gap-2 border border-neutral-200 dark:border-neutral-800 p-1 bg-white dark:bg-neutral-900">
          {(["unit", "size", "color"] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              className={`flex items-center gap-2 px-4 py-1.5 text-xs font-light tracking-wider uppercase transition-colors ${
                activeTab === tab
                  ? "bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 font-normal"
                  : "text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-neutral-100"
              }`}
            >
              {getTabIcon(tab)}
              {tab}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 flex-1 sm:flex-none">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Cari nama ${activeTab}...`}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
            />
          </div>

          <button
            onClick={() => {
              setEditingItem(null);
              setIsModalOpen(true);
            }}
            className="text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> TAMBAH {activeTab.toUpperCase()}
          </button>
        </div>
      </div>

      {/* Table Data */}
      <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40">
        {itemsList.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Layers className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              Belum ada data {activeTab} terdaftar.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-neutral-200 dark:divide-neutral-800/80">
            {itemsList.map((item) => (
              <div
                key={item.id}
                className="p-4 flex justify-between items-center hover:bg-neutral-50 dark:hover:bg-neutral-900/60 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                    {getTabIcon(activeTab)}
                  </div>
                  <div>
                    <p className="text-sm font-light text-neutral-900 dark:text-neutral-100">
                      {item.name}
                    </p>
                    <p className="text-[9px] font-extralight text-neutral-400 uppercase">
                      ID: {item.id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                    className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-400 transition-colors"
                    title="Edit Data"
                  >
                    <Edit2 className="w-3.5 h-3.5 stroke-1.5" />
                  </button>
                  <button
                    onClick={() => {
                      setDeletingId(item.id);
                      setDeletingName(item.name);
                    }}
                    className="p-2 text-neutral-500 hover:text-red-500 border border-neutral-200 dark:border-neutral-800 hover:border-red-300 transition-colors"
                    title="Hapus Data"
                  >
                    <Trash2 className="w-3.5 h-3.5 stroke-1.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Infinite Scroll Anchor */}
        <div
          ref={observerTarget}
          className="p-4 text-center border-t border-neutral-100 dark:border-neutral-800/40"
        >
          {isFetchingMore ? (
            <div className="flex items-center justify-center gap-2 text-xs font-extralight text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              MEMUAT DATA {activeTab.toUpperCase()} LAINNYA...
            </div>
          ) : !hasMore && itemsList.length > 0 ? (
            <span className="text-[10px] font-extralight text-neutral-400 uppercase tracking-widest">
              SEMUA DATA {activeTab.toUpperCase()} TELAH TAMPIL
            </span>
          ) : null}
        </div>
      </div>

      {/* Modal Add / Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
              <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                {getTabIcon(activeTab)}
                {editingItem
                  ? `EDIT ${activeTab.toUpperCase()}`
                  : `TAMBAH ${activeTab.toUpperCase()} BARU`}
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingItem(null);
                }}
                className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form ref={formRef} action={formAction} className="space-y-4">
              <input type="hidden" name="type" value={activeTab} />
              {editingItem && (
                <input type="hidden" name="id" value={editingItem.id} />
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
                  Nama {activeTab.toUpperCase()} *
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingItem?.name || ""}
                  placeholder={
                    activeTab === "unit"
                      ? "Contoh: Meter, Roll, Pcs"
                      : activeTab === "size"
                        ? "Contoh: S, M, L, XL, 42"
                        : "Contoh: Hitam Jetblack, White"
                  }
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-neutral-100/50 dark:bg-neutral-950/50 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
                />
                {state?.errors?.name && (
                  <p className="text-[10px] text-red-500">
                    {state.errors.name[0]}
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2.5 text-xs font-light text-neutral-600 dark:text-neutral-400 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors uppercase tracking-wider"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center gap-2 uppercase disabled:opacity-50"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingItem ? "SIMPAN PERUBAHAN" : "SIMPAN DATA"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Dialog Delete */}
      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title={`HAPUS DATA ${activeTab.toUpperCase()}`}
        description={`Apakah Anda yakin ingin menghapus ${activeTab} "${deletingName}"? Data ini akan terhapus secara permanen.`}
        confirmText="Hapus Permanen"
        isDanger={true}
        isLoading={isDeletingLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
