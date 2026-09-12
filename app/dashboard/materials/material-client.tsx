"use client";

import { useState, useActionState, useEffect, useRef } from "react";
import {
  syncMaterialGroup,
  deleteMaterial,
  deleteMaterialVariant,
  getPaginatedMaterials,
} from "./action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Boxes,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  X,
  Palette,
  Calculator,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export interface MaterialVariant {
  id: string;
  materialId: string;
  colorId: string;
  stock: string;
  colorName: string | null;
}

export interface MaterialItem {
  id: string;
  vendorId: string;
  name: string;
  category: "fabric" | "thread" | "accessory";
  baseUnitId: string;
  purchaseUnitId: string;
  conversionValue: string;
  purchasePrice: string;
  stock: string;
  variants: MaterialVariant[];
  createdAt: Date;
}

export interface OptionItem {
  id: string;
  name: string;
}

export function MaterialClient({
  initialMaterials,
  colorOptions,
  unitOptions,
}: {
  initialMaterials: MaterialItem[];
  colorOptions: OptionItem[];
  unitOptions: OptionItem[];
}) {
  const [materialsList, setMaterialsList] =
    useState<MaterialItem[]>(initialMaterials);
  const [searchQuery, setSearchQuery] = useState("");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<MaterialItem | null>(
    null,
  );

  // Form State
  const [category, setCategory] = useState<"fabric" | "thread" | "accessory">(
    "fabric",
  );
  const [purchaseUnitId, setPurchaseUnitId] = useState<string>("");
  const [baseUnitId, setBaseUnitId] = useState<string>("");
  const [purchasePrice, setPurchasePrice] = useState<number>(0);
  const [convValue, setConvValue] = useState<number>(1);
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);

  // Delete State
  const [deletingParams, setDeletingParams] = useState<{
    id: string;
    name: string;
    isVariant: boolean;
  } | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [state, formAction, isPending] = useActionState(
    syncMaterialGroup,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const getUnitName = (id: string) =>
    unitOptions.find((u) => u.id === id)?.name || id;

  const formatNumber = (val: string | number, maxDecimals = 2) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0";
    return num.toLocaleString("id-ID", { maximumFractionDigits: maxDecimals });
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      const data = await getPaginatedMaterials({
        search: searchQuery,
        page: 1,
        limit: 50,
      });
      setMaterialsList(data as any);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
        setIsModalOpen(false);
        setEditingMaterial(null);
        getPaginatedMaterials({ search: searchQuery, page: 1, limit: 50 }).then(
          (res) => setMaterialsList(res as any),
        );
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const handleOpenAdd = () => {
    setEditingMaterial(null);
    setCategory("fabric");
    setPurchaseUnitId(unitOptions[0]?.id || "");
    setBaseUnitId(unitOptions[0]?.id || "");
    setPurchasePrice(0);
    setConvValue(1);
    setSelectedColorIds([]);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (m: MaterialItem) => {
    setEditingMaterial(m);
    setCategory(m.category);
    setPurchaseUnitId(m.purchaseUnitId);
    setBaseUnitId(m.baseUnitId);
    setPurchasePrice(parseFloat(m.purchasePrice || "0"));
    setConvValue(parseFloat(m.conversionValue || "1"));
    setSelectedColorIds(m.variants.map((v) => v.colorId));
    setIsModalOpen(true);
  };

  const handleSelectAllColors = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) setSelectedColorIds(colorOptions.map((c) => c.id));
    else setSelectedColorIds([]);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingParams) return;
    setIsDeletingLoading(true);

    let res;
    if (deletingParams.isVariant) {
      res = await deleteMaterialVariant(deletingParams.id);
    } else {
      res = await deleteMaterial(deletingParams.id);
    }

    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setDeletingParams(null);
      getPaginatedMaterials({ search: searchQuery, page: 1, limit: 50 }).then(
        (r) => setMaterialsList(r as any),
      );
    } else {
      toast.error(res.message);
    }
  };

  const numericConv = convValue > 0 ? convValue : 1;
  const calculatedBaseUnitPrice = purchasePrice / numericConv;

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama bahan atau kategori..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:border-neutral-900 dark:focus:border-neutral-100 transition-colors"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="text-xs font-light tracking-wider bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 dark:hover:bg-neutral-300 transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> TAMBAH BAHAN BARU
        </button>
      </div>

      {/* Accordion Table List */}
      <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40 divide-y divide-neutral-200 dark:divide-neutral-800/80">
        {materialsList.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Boxes className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              Belum ada data bahan terdaftar.
            </p>
          </div>
        ) : (
          materialsList.map((m) => {
            const isOpen = Boolean(openAccordions[m.id]);
            const isGroupable = m.category !== "accessory";

            // Kolom stock di database mewakili Satuan Pakai
            const totalStockBase = isGroupable
              ? m.variants.reduce(
                  (acc, curr) => acc + parseFloat(curr.stock || "0"),
                  0,
                )
              : parseFloat(m.stock || "0");

            const simpanUnitName = getUnitName(m.purchaseUnitId);
            const pakaiUnitName = getUnitName(m.baseUnitId);
            const pPrice = parseFloat(m.purchasePrice || "0");
            const cVal = parseFloat(m.conversionValue || "1");
            const bPrice = cVal > 0 ? pPrice / cVal : 0;

            // Perhitungan nominal stok dalam Satuan Simpan
            const totalStockPurchase = cVal > 0 ? totalStockBase / cVal : 0;

            return (
              <div key={m.id} className="transition-colors">
                <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-neutral-50/50 dark:bg-neutral-900/30 hover:bg-neutral-100/50 dark:hover:bg-neutral-900/80">
                  <div className="flex items-center gap-3">
                    {isGroupable && (
                      <button
                        onClick={() => toggleAccordion(m.id)}
                        className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                      >
                        {isOpen ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>
                    )}

                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-normal text-neutral-900 dark:text-neutral-100">
                          {m.name}
                        </span>
                        {isGroupable && (
                          <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
                            {m.variants.length} Warna
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-neutral-500">
                        Rp {formatNumber(pPrice, 0)} per {simpanUnitName} (Rp{" "}
                        {formatNumber(bPrice, 1)} per {pakaiUnitName}) • 1{" "}
                        {simpanUnitName} = {formatNumber(cVal)} {pakaiUnitName}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end md:self-center">
                    {/* TAMPILAN NOMINAL STOK DUA SATUAN (SIMPAN & PAKAI) */}
                    <div className="text-right">
                      <span className="text-xs font-medium text-neutral-900 dark:text-neutral-100 block">
                        {formatNumber(totalStockPurchase)} {simpanUnitName}
                      </span>
                      <span className="text-[11px] text-neutral-500 block">
                        ({formatNumber(totalStockBase)} {pakaiUnitName})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 border-l border-neutral-200 dark:border-neutral-800 pl-4">
                      <button
                        onClick={() => handleOpenEdit(m)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 border border-neutral-200 dark:border-neutral-800 transition-colors"
                        title="Edit Bahan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() =>
                          setDeletingParams({
                            id: m.id,
                            name: m.name,
                            isVariant: false,
                          })
                        }
                        className="p-2 text-neutral-500 hover:text-red-400 border border-neutral-200 dark:border-neutral-800 transition-colors"
                        title="Hapus Bahan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Body Varian Warna */}
                {isOpen && isGroupable && (
                  <div className="bg-neutral-100/30 dark:bg-neutral-950/60 pl-8 pr-4 py-2 divide-y divide-neutral-200/50 dark:divide-neutral-800/40">
                    {m.variants.length === 0 ? (
                      <div className="py-3 text-[10px] text-neutral-500 italic">
                        Belum ada warna. Klik Edit untuk menambahkan.
                      </div>
                    ) : (
                      m.variants.map((v) => {
                        const variantStockBase = parseFloat(v.stock || "0");
                        const variantStockPurchase =
                          cVal > 0 ? variantStockBase / cVal : 0;

                        return (
                          <div
                            key={v.id}
                            className="py-2.5 flex justify-between items-center text-xs font-light"
                          >
                            <div className="flex items-center gap-2">
                              <Palette className="w-3.5 h-3.5 text-neutral-400" />
                              <span className="text-neutral-900 dark:text-neutral-200 font-normal">
                                {v.colorName || "Netral"}
                              </span>
                            </div>

                            <div className="flex items-center gap-6">
                              {/* STOK PER WARNA DALAM SATUAN SIMPAN & PAKAI */}
                              <div className="text-right">
                                <span className="text-neutral-200 text-xs font-medium block">
                                  {formatNumber(variantStockPurchase)}{" "}
                                  {simpanUnitName}
                                </span>
                                <span className="text-neutral-500 text-[10px] block">
                                  ({formatNumber(variantStockBase)}{" "}
                                  {pakaiUnitName})
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  setDeletingParams({
                                    id: v.id,
                                    name: `${m.name} (${v.colorName})`,
                                    isVariant: true,
                                  })
                                }
                                className="p-1.5 text-neutral-400 hover:text-red-400 border border-neutral-300 dark:border-neutral-800"
                                title="Hapus Warna Ini"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal Form Global Add/Edit */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl my-8">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
              <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-neutral-500" />
                {editingMaterial
                  ? "EDIT & SINKRON WARNA BAHAN"
                  : "TAMBAH MASTER BAHAN BARU"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form ref={formRef} action={formAction} className="space-y-4">
              {editingMaterial && (
                <input type="hidden" name="id" value={editingMaterial.id} />
              )}

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  NAMA BAHAN *
                </label>
                <input
                  name="name"
                  type="text"
                  defaultValue={editingMaterial?.name || ""}
                  placeholder="Contoh: Spandex Balon / Cotton Combed 30s"
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  KATEGORI BAHAN *
                </label>
                <select
                  name="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-800 text-xs font-light uppercase focus:outline-none"
                >
                  <option
                    value="fabric"
                    className="bg-neutral-900 text-neutral-100"
                  >
                    FABRIC (KAIN)
                  </option>
                  <option
                    value="thread"
                    className="bg-neutral-900 text-neutral-100"
                  >
                    THREAD (BENANG)
                  </option>
                  <option
                    value="accessory"
                    className="bg-neutral-900 text-neutral-100"
                  >
                    ACCESSORY (AKSESORIS / LABEL)
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                    SATUAN SIMPAN (BELI) *
                  </label>
                  <select
                    name="purchaseUnitId"
                    value={purchaseUnitId}
                    onChange={(e) => setPurchaseUnitId(e.target.value)}
                    disabled={isPending}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-800 text-xs font-light focus:outline-none"
                  >
                    <option
                      value=""
                      className="bg-neutral-900 text-neutral-100"
                    >
                      -- Pilih Satuan Simpan --
                    </option>
                    {unitOptions.map((u) => (
                      <option
                        key={u.id}
                        value={u.id}
                        className="bg-neutral-900 text-neutral-100"
                      >
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                    SATUAN PAKAI (HPP) *
                  </label>
                  <select
                    name="baseUnitId"
                    value={baseUnitId}
                    onChange={(e) => setBaseUnitId(e.target.value)}
                    disabled={isPending}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border border-neutral-300 dark:border-neutral-800 text-xs font-light focus:outline-none"
                  >
                    <option
                      value=""
                      className="bg-neutral-900 text-neutral-100"
                    >
                      -- Pilih Satuan Pakai --
                    </option>
                    {unitOptions.map((u) => (
                      <option
                        key={u.id}
                        value={u.id}
                        className="bg-neutral-900 text-neutral-100"
                      >
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                    HARGA PEMBELIAN (RP) *
                  </label>
                  <input
                    name="purchasePrice"
                    type="number"
                    value={purchasePrice}
                    onChange={(e) =>
                      setPurchasePrice(parseFloat(e.target.value) || 0)
                    }
                    disabled={isPending}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider leading-tight">
                    NILAI KONVERSI (1{" "}
                    {getUnitName(purchaseUnitId).toUpperCase() || "SIMPAN"} = X{" "}
                    {getUnitName(baseUnitId).toUpperCase() || "PAKAI"}) *
                  </label>
                  <input
                    name="conversionValue"
                    type="number"
                    step="0.01"
                    value={convValue}
                    onChange={(e) =>
                      setConvValue(parseFloat(e.target.value) || 1)
                    }
                    disabled={isPending}
                    className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 border border-neutral-200 dark:border-neutral-800 bg-neutral-100/50 dark:bg-neutral-950/40 flex justify-between items-center text-xs">
                <span className="font-light text-neutral-500 flex items-center gap-1.5">
                  <Calculator className="w-3.5 h-3.5" /> Estimasi Harga per{" "}
                  {getUnitName(baseUnitId) || "Satuan Pakai"}:
                </span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  Rp {formatNumber(calculatedBaseUnitPrice, 2)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  STOK AWAL (
                  {getUnitName(baseUnitId).toUpperCase() || "SATUAN PAKAI"})
                </label>
                <input
                  type="text"
                  value={`0 ${getUnitName(baseUnitId)} (Otomatis dari Sistem)`}
                  disabled
                  className="w-full px-3 py-2 bg-neutral-200 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs font-light text-neutral-500 cursor-not-allowed"
                />
              </div>

              {category !== "accessory" && (
                <div className="space-y-3 pt-3 border-t border-neutral-200 dark:border-neutral-800/80">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                      ASOSIASI WARNA TERSEDIA
                    </span>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-light text-neutral-400 hover:text-neutral-100">
                      <input
                        type="checkbox"
                        onChange={handleSelectAllColors}
                        checked={
                          selectedColorIds.length === colorOptions.length &&
                          colorOptions.length > 0
                        }
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                      />
                      Pilih Semua
                    </label>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 p-3 bg-neutral-950 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2">
                      {colorOptions.map((c) => {
                        const isChecked = selectedColorIds.includes(c.id);
                        return (
                          <label
                            key={c.id}
                            className={`flex items-center gap-2 text-xs font-light p-1.5 border transition-colors cursor-pointer ${isChecked ? "bg-neutral-900 border-neutral-600 text-neutral-100" : "border-neutral-900 text-neutral-500 hover:border-neutral-800"}`}
                          >
                            <input
                              type="checkbox"
                              name="selectedColors"
                              value={c.id}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked)
                                  setSelectedColorIds((p) => [...p, c.id]);
                                else
                                  setSelectedColorIds((p) =>
                                    p.filter((id) => id !== c.id),
                                  );
                              }}
                              className="rounded border-neutral-300 text-neutral-900 focus:ring-0"
                            />
                            {c.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-light text-neutral-400 border border-neutral-300 dark:border-neutral-800 hover:bg-neutral-800 transition-colors uppercase"
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
                  {editingMaterial ? "SINKRONKAN & SIMPAN" : "SIMPAN BAHAN"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingParams)}
        title={
          deletingParams?.isVariant
            ? "HAPUS VARIAN WARNA"
            : "HAPUS DATA BAHAN UTAMA"
        }
        description={
          deletingParams?.isVariant
            ? `Apakah Anda yakin ingin menghapus varian "${deletingParams?.name}" ini?`
            : `Apakah Anda yakin ingin menghapus seluruh material "${deletingParams?.name}" beserta semua variannya? Tindakan ini tidak dapat dibatalkan.`
        }
        confirmText="Hapus Permanen"
        isDanger={true}
        isLoading={isDeletingLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingParams(null)}
      />
    </div>
  );
}
