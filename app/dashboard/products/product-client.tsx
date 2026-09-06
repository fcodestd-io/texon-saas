"use client";

import {
  useState,
  useActionState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import {
  upsertFullProduct,
  deleteProduct,
  getPaginatedProducts,
} from "./action";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { toast } from "sonner";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Search,
  X,
  ChevronDown,
  ChevronRight,
  Printer,
  Shirt,
  Undo,
  Redo,
} from "lucide-react";

import {
  ProductMatrixTab,
  ProductPricesTab,
  ProductBomTab,
  ProductThermalModal,
} from "@/components/master-product";

export function ProductClient({
  initialProducts,
  colorOptions,
  sizeOptions,
  materialOptions,
  unitOptions,
}: {
  initialProducts: any[];
  colorOptions: any[];
  sizeOptions: any[];
  materialOptions: any[];
  unitOptions: any[];
}) {
  const [productsList, setProductsList] = useState<any[]>(
    initialProducts || [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>(
    {},
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form States
  const [productName, setProductName] = useState("");
  const [basePrice, setBasePrice] = useState<number>(0);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [variantConfigs, setVariantConfigs] = useState<
    Record<string, { price: number; barcode?: string }>
  >({});
  const [partsPerSize, setPartsPerSize] = useState<Record<string, any[]>>({});

  // Active Tabs
  const [activeTab, setActiveTab] = useState<"matrix" | "prices" | "bom">(
    "matrix",
  );
  const [activeBomSizeId, setActiveBomSizeId] = useState<string>("");

  // UNDO / REDO HISTORY ENGINE
  interface FormStateSnapshot {
    productName: string;
    basePrice: number;
    selectedSizes: string[];
    selectedColors: string[];
    variantConfigs: Record<string, { price: number; barcode?: string }>;
    partsPerSize: Record<string, any[]>;
  }

  const [history, setHistory] = useState<FormStateSnapshot[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const isUndoRedoAction = useRef<boolean>(false);

  const currentFormState: FormStateSnapshot = {
    productName,
    basePrice,
    selectedSizes,
    selectedColors,
    variantConfigs,
    partsPerSize,
  };

  // Capture History Snapshot
  useEffect(() => {
    if (!isModalOpen) return;
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }

    const timer = setTimeout(() => {
      setHistory((prev) => {
        const nextHistory = prev.slice(0, historyIndex + 1);
        return [...nextHistory, currentFormState];
      });
      setHistoryIndex((prev) => prev + 1);
    }, 250);

    return () => clearTimeout(timer);
  }, [
    productName,
    basePrice,
    selectedSizes,
    selectedColors,
    variantConfigs,
    partsPerSize,
    isModalOpen,
  ]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const targetState = history[historyIndex - 1];
      setProductName(targetState.productName);
      setBasePrice(targetState.basePrice);
      setSelectedSizes(targetState.selectedSizes);
      setSelectedColors(targetState.selectedColors);
      setVariantConfigs(targetState.variantConfigs);
      setPartsPerSize(targetState.partsPerSize);
      setHistoryIndex((prev) => prev - 1);
      toast.info("Undo perubahan form.");
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const targetState = history[historyIndex + 1];
      setProductName(targetState.productName);
      setBasePrice(targetState.basePrice);
      setSelectedSizes(targetState.selectedSizes);
      setSelectedColors(targetState.selectedColors);
      setVariantConfigs(targetState.variantConfigs);
      setPartsPerSize(targetState.partsPerSize);
      setHistoryIndex((prev) => prev + 1);
      toast.info("Redo perubahan form.");
    }
  }, [historyIndex, history]);

  // Confirmation & Print Modals
  const [priceUpdateConfirm, setPriceUpdateConfirm] = useState<{
    isOpen: boolean;
    sizeId?: string;
    sizeName?: string;
    newPrice: number;
  }>({ isOpen: false, newPrice: 0 });

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printItems, setPrintItems] = useState<any[]>([]);
  const [selectedPrintVariantIds, setSelectedPrintVariantIds] = useState<
    string[]
  >([]);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingName, setDeletingName] = useState<string>("");
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  const [state, formAction, isPending] = useActionState(
    upsertFullProduct,
    undefined,
  );
  const formRef = useRef<HTMLFormElement>(null);

  // KEYBOARD SHORTCUTS: Ctrl + S, Ctrl + Z, Ctrl + Y
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isModalOpen) return;

      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      } else if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        (modifier && e.key.toLowerCase() === "y") ||
        (modifier && e.shiftKey && e.key.toLowerCase() === "z")
      ) {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, handleUndo, handleRedo]);

  const formatRupiah = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num) || num === 0) return "0";
    return num.toLocaleString("id-ID", { maximumFractionDigits: 0 });
  };

  const getMaterialPricePerBaseUnit = (matId: string) => {
    const mat = materialOptions.find((m) => m.id === matId);
    if (!mat) return 0;
    const price = parseFloat(mat.purchasePrice || "0");
    const conv = parseFloat(mat.conversionValue || "1");
    return conv > 0 ? price / conv : 0;
  };

  const getUnitName = (unitId: string) => {
    const u = unitOptions.find((item) => item.id === unitId);
    return u ? u.name : "";
  };

  const calculateVariantHPP = (variant: any) => {
    if (!variant.parts || variant.parts.length === 0) return 0;

    let totalJasa = 0;
    let totalMaterial = 0;

    variant.parts.forEach((pt: any) => {
      totalJasa +=
        parseFloat(pt.cuttingPrice || 0) +
        parseFloat(pt.sewingPrice || 0) +
        parseFloat(pt.overdeckPrice || 0) +
        parseFloat(pt.listPrice || 0);

      if (pt.materials) {
        pt.materials.forEach((m: any) => {
          const pricePerUnit = getMaterialPricePerBaseUnit(m.materialId);
          const qty = parseFloat(m.quantity || 0);
          const waste = parseFloat(m.wastePercentage || 0);
          const sub = qty * pricePerUnit * (1 + waste / 100);
          totalMaterial += sub;
        });
      }
    });

    return totalJasa + totalMaterial;
  };

  useEffect(() => {
    setProductsList(initialProducts || []);
  }, [initialProducts]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const data = await getPaginatedProducts({
        search: searchQuery,
        page: 1,
        limit: 50,
      });
      setProductsList(data as any);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (state?.message) {
      if (state.success) {
        toast.success(state.message);
        setIsModalOpen(false);
        setEditingProduct(null);
        getPaginatedProducts({ search: searchQuery, page: 1, limit: 50 }).then(
          (res) => setProductsList(res as any),
        );
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductName("");
    setBasePrice(0);

    const defaultSizes = sizeOptions.slice(0, 2).map((s) => s.id);
    const defaultColors = colorOptions.slice(0, 2).map((c) => c.id);

    setSelectedSizes(defaultSizes);
    setSelectedColors(defaultColors);

    const initConfigs: Record<string, { price: number }> = {};
    defaultSizes.forEach((sId) => {
      defaultColors.forEach((cId) => {
        initConfigs[`${sId}_${cId}`] = { price: 0 };
      });
    });
    setVariantConfigs(initConfigs);

    const defaultFixedColorId =
      colorOptions.find((c) => c.name.toLowerCase() === "hitam")?.id ||
      colorOptions[0]?.id ||
      "";

    const initPartsPerSize: Record<string, any[]> = {};
    defaultSizes.forEach((sId) => {
      initPartsPerSize[sId] = [
        {
          name: "Atasan",
          cuttingPrice: 1500,
          sewingPrice: 6000,
          overdeckPrice: 1000,
          listPrice: 0,
          colorMode: "matching_sku",
          fixedColorId: "",
          materials: [],
        },
        {
          name: "Kerudung",
          cuttingPrice: 800,
          sewingPrice: 3500,
          overdeckPrice: 0,
          listPrice: 0,
          colorMode: "fixed_color",
          fixedColorId: defaultFixedColorId,
          materials: [],
        },
        {
          name: "Bawahan",
          cuttingPrice: 1200,
          sewingPrice: 4500,
          overdeckPrice: 1000,
          listPrice: 0,
          colorMode: "fixed_color",
          fixedColorId: defaultFixedColorId,
          materials: [],
        },
      ];
    });
    setPartsPerSize(initPartsPerSize);

    // Reset History State
    setHistory([]);
    setHistoryIndex(-1);

    setActiveTab("matrix");
    setActiveBomSizeId(defaultSizes[0] || "");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product);
    setProductName(product.name);

    const existingSizeIds = Array.from(
      new Set(product.variants.map((v: any) => v.sizeId)),
    ) as string[];
    const existingColorIds = Array.from(
      new Set(product.variants.map((v: any) => v.colorId)),
    ) as string[];

    setSelectedSizes(existingSizeIds);
    setSelectedColors(existingColorIds);

    const configs: Record<string, { price: number; barcode?: string }> = {};
    product.variants.forEach((v: any) => {
      configs[`${v.sizeId}_${v.colorId}`] = {
        price: parseFloat(v.price || 0),
        barcode: v.barcode || "",
      };
    });
    setVariantConfigs(configs);

    const partsMap: Record<string, any[]> = {};
    existingSizeIds.forEach((sId) => {
      const sampleVarForSize = product.variants.find(
        (v: any) => v.sizeId === sId,
      );
      if (sampleVarForSize && sampleVarForSize.parts) {
        partsMap[sId] = sampleVarForSize.parts.map((pt: any) => ({
          name: pt.name,
          cuttingPrice: parseFloat(pt.cuttingPrice || 0),
          sewingPrice: parseFloat(pt.sewingPrice || 0),
          overdeckPrice: parseFloat(pt.overdeckPrice || 0),
          listPrice: parseFloat(pt.listPrice || 0),
          colorMode: pt.colorMode || "matching_sku",
          fixedColorId: pt.fixedColorId || "",
          materials: (pt.materials || []).map((m: any) => ({
            materialId: m.materialId,
            quantity: parseFloat(m.quantity || 0),
            consumptionUnitId: m.consumptionUnitId,
            wastePercentage: parseFloat(m.wastePercentage || 0),
          })),
        }));
      } else {
        partsMap[sId] = [];
      }
    });
    setPartsPerSize(partsMap);

    setHistory([]);
    setHistoryIndex(-1);

    setActiveTab("matrix");
    setActiveBomSizeId(existingSizeIds[0] || "");
    setIsModalOpen(true);
  };

  const copyBomFromPreviousSize = (
    targetSizeId: string,
    sourceSizeId: string,
  ) => {
    const sourceBom = partsPerSize[sourceSizeId];
    if (!sourceBom || sourceBom.length === 0) {
      toast.error("Size asal belum memiliki BOM untuk disalin.");
      return;
    }

    const copiedBom = JSON.parse(JSON.stringify(sourceBom));
    setPartsPerSize((prev) => ({
      ...prev,
      [targetSizeId]: copiedBom,
    }));

    const sourceName = sizeOptions.find((s) => s.id === sourceSizeId)?.name;
    const targetName = sizeOptions.find((s) => s.id === targetSizeId)?.name;
    toast.success(
      `Berhasil menyalin BOM dari Size "${sourceName}" ke Size "${targetName}".`,
    );
  };

  const toggleSizeSelection = (sId: string) => {
    setSelectedSizes((prev) => {
      const next = prev.includes(sId)
        ? prev.filter((id) => id !== sId)
        : [...prev, sId];
      if (!prev.includes(sId) && !partsPerSize[sId]) {
        setPartsPerSize((p) => ({
          ...p,
          [sId]: [
            {
              name: "Atasan",
              cuttingPrice: 1500,
              sewingPrice: 6000,
              overdeckPrice: 1000,
              listPrice: 0,
              colorMode: "matching_sku",
              fixedColorId: "",
              materials: [],
            },
          ],
        }));
      }
      return next;
    });
  };

  const toggleColorSelection = (cId: string) => {
    setSelectedColors((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId],
    );
  };

  const applyGlobalPrice = (price: number) => {
    const updated = { ...variantConfigs };
    selectedSizes.forEach((sId) => {
      selectedColors.forEach((cId) => {
        updated[`${sId}_${cId}`] = { ...updated[`${sId}_${cId}`], price };
      });
    });
    setVariantConfigs(updated);
    toast.success(`Harga Rp ${formatRupiah(price)} diterapkan ke seluruh SKU.`);
  };

  const applyPricePerSize = (sId: string, price: number) => {
    const updated = { ...variantConfigs };
    selectedColors.forEach((cId) => {
      updated[`${sId}_${cId}`] = { ...updated[`${sId}_${cId}`], price };
    });
    setVariantConfigs(updated);
    setPriceUpdateConfirm({ isOpen: false, newPrice: 0 });
    const sName = sizeOptions.find((s) => s.id === sId)?.name;
    toast.success(`Harga seluruh varian size "${sName}" berhasil diperbarui.`);
  };

  const removePartFromSize = (sizeId: string, pIdx: number) => {
    const updated = { ...partsPerSize };
    if (updated[sizeId]) {
      updated[sizeId] = updated[sizeId].filter((_, index) => index !== pIdx);
      setPartsPerSize(updated);
      toast.info("Part berhasil dihapus.");
    }
  };

  const openThermalPrintModal = (product: any) => {
    setPrintItems(product.variants || []);
    setSelectedPrintVariantIds((product.variants || []).map((v: any) => v.id));
    setIsPrintModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingId) return;
    setIsDeletingLoading(true);
    const res = await deleteProduct(deletingId);
    setIsDeletingLoading(false);

    if (res.success) {
      toast.success(res.message);
      setDeletingId(null);
      getPaginatedProducts({ search: searchQuery, page: 1, limit: 50 }).then(
        (r) => setProductsList(r as any),
      );
    } else {
      toast.error(res.message);
    }
  };

  const payloadToSubmit = {
    selectedSizes,
    selectedColors,
    variants: variantConfigs,
    partsPerSize,
  };

  return (
    <div className="space-y-6">
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 8mm; /* Margin kertas A4 */
          }

          /* Sembunyikan seluruh elemen UI dashboard */
          body * {
            visibility: hidden;
          }

          /* Tampilkan hanya area cetak thermal */
          #thermal-print-area,
          #thermal-print-area * {
            visibility: visible;
          }

          #thermal-print-area {
            position: static !important; /* MENGUBAH position: absolute menjadi static agar mendukung multi-halaman */
            width: 100% !important;
            max-height: none !important; /* Menghilangkan batasan scrollbar saat cetak */
            overflow: visible !important;
            display: grid !important;
            grid-template-columns: repeat(
              2,
              1fr
            ) !important; /* 2 Barcode per baris */
            gap: 4mm 6mm !important; /* Jarak antar stiker */
            background: transparent !important;
            padding: 0 !important;
          }

          .thermal-sticker-print {
            border: 1px solid #000 !important;
            padding: 2.5mm !important;
            height: 35mm !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            box-sizing: border-box !important;

            /* KUNCI MULTI-KERTAS: Mencegah stiker terpotong di tengah lipatan/pergantian halaman */
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama produk..."
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-light text-neutral-900 dark:text-neutral-100 focus:outline-none"
          />
        </div>

        <button
          onClick={handleOpenAdd}
          className="text-xs font-light bg-neutral-900 dark:bg-neutral-100 text-neutral-50 dark:text-neutral-950 px-4 py-2.5 hover:bg-neutral-800 flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" /> TAMBAH PRODUK BARU
        </button>
      </div>

      {/* Accordion Table */}
      <div className="border border-neutral-200 dark:border-neutral-800/80 bg-white dark:bg-neutral-900/40 divide-y divide-neutral-200 dark:divide-neutral-800/80">
        {productsList.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Package className="w-8 h-8 text-neutral-400 mx-auto stroke-1" />
            <p className="text-xs font-light text-neutral-500">
              Belum ada master produk terdaftar.
            </p>
          </div>
        ) : (
          productsList.map((prod) => {
            const isOpen = Boolean(openAccordions[prod.id]);
            const variants = prod.variants || [];

            const totalOmset = variants.reduce(
              (acc: number, v: any) => acc + parseFloat(v.price || "0"),
              0,
            );
            const totalHpp = variants.reduce(
              (acc: number, v: any) => acc + calculateVariantHPP(v),
              0,
            );
            const totalMargin = totalOmset - totalHpp;
            const avgMarginPct =
              totalOmset > 0 ? (totalMargin / totalOmset) * 100 : 0;
            const grandTotalStock = variants.reduce(
              (acc: number, v: any) => acc + parseFloat(v.stock || "0"),
              0,
            );

            return (
              <div key={prod.id} className="transition-colors">
                <div className="p-4 flex flex-col md:flex-row justify-between md:items-center gap-4 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() =>
                        setOpenAccordions((p) => ({
                          ...p,
                          [prod.id]: !p[prod.id],
                        }))
                      }
                      className="p-1 text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100"
                    >
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-normal text-neutral-900 dark:text-neutral-100">
                          {prod.name}
                        </span>
                        <span className="text-[10px] bg-neutral-200 dark:bg-neutral-800 px-2 py-0.5 text-neutral-600 dark:text-neutral-300">
                          {variants.length} VARIAN SKU
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 self-end md:self-center">
                    <div className="text-right flex items-center gap-4 text-xs font-mono border-r border-neutral-200 dark:border-neutral-800 pr-4">
                      <div>
                        <span className="text-[9px] uppercase text-neutral-400 block font-sans">
                          TOTAL STOK
                        </span>
                        <span className="text-neutral-900 dark:text-neutral-100 font-semibold">
                          {grandTotalStock} Pcs
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-neutral-400 block font-sans">
                          SUBTOTAL OMSET
                        </span>
                        <span className="text-neutral-900 dark:text-neutral-100">
                          {totalOmset === 0
                            ? "-"
                            : `Rp ${formatRupiah(totalOmset)}`}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-neutral-400 block font-sans">
                          ESTIMASI HPP
                        </span>
                        <span className="text-amber-500">
                          Rp {formatRupiah(totalHpp)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] uppercase text-neutral-400 block font-sans">
                          ESTIMASI MARGIN
                        </span>
                        <span className="text-emerald-500 font-semibold">
                          {totalOmset === 0
                            ? "-"
                            : `Rp ${formatRupiah(totalMargin)} (${avgMarginPct.toFixed(1)}%)`}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openThermalPrintModal(prod)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 border border-neutral-200 dark:border-neutral-800"
                        title="Cetak Label Resi Thermal"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleOpenEdit(prod)}
                        className="p-2 text-neutral-500 hover:text-neutral-900 border border-neutral-200 dark:border-neutral-800"
                        title="Edit Master Produk"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => {
                          setDeletingId(prod.id);
                          setDeletingName(prod.name);
                        }}
                        className="p-2 text-neutral-500 hover:text-red-400 border border-neutral-200 dark:border-neutral-800"
                        title="Hapus Produk"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>

                {isOpen && (
                  <div className="bg-neutral-100/30 dark:bg-neutral-950/60 pl-8 pr-4 py-3 divide-y divide-neutral-200/50 dark:divide-neutral-800/40">
                    {variants.map((v: any) => {
                      const sellingPrice = parseFloat(v.price || "0");
                      const hpp = calculateVariantHPP(v);
                      const margin = sellingPrice - hpp;
                      const marginPct =
                        sellingPrice > 0 ? (margin / sellingPrice) * 100 : 0;
                      const stockVal = parseFloat(v.stock || "0");

                      return (
                        <div
                          key={v.id}
                          className="py-2.5 flex justify-between items-center text-xs"
                        >
                          <div className="space-y-0.5">
                            <span className="font-mono text-xs text-neutral-900 dark:text-neutral-100 font-semibold">
                              {v.sku}
                            </span>
                            <span className="text-[10px] text-neutral-400 block">
                              Size: {v.sizeName} | Warna: {v.colorName} |
                              Barcode: {v.barcode || v.sku}
                            </span>
                          </div>

                          <div className="flex items-center gap-6 font-mono text-xs">
                            <div className="text-right">
                              <span className="text-[9px] text-neutral-400 uppercase block font-sans">
                                STOK READY
                              </span>
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                {stockVal} Pcs
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-neutral-400 uppercase block font-sans">
                                HARGA JUAL
                              </span>
                              <span className="font-medium text-neutral-900 dark:text-neutral-100">
                                {sellingPrice === 0
                                  ? "-"
                                  : `Rp ${formatRupiah(sellingPrice)}`}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-neutral-400 uppercase block font-sans">
                                Harga Produksi
                              </span>
                              <span className="text-amber-500">
                                Rp {formatRupiah(hpp)}
                              </span>
                            </div>

                            <div className="text-right">
                              <span className="text-[9px] text-neutral-400 uppercase block font-sans">
                                ESTIMASI MARGIN
                              </span>
                              <span className="text-emerald-500 font-semibold">
                                {sellingPrice === 0
                                  ? "-"
                                  : `Rp ${formatRupiah(margin)} (${marginPct.toFixed(1)}%)`}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Main Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-4 border-b border-neutral-200 dark:border-neutral-800/80">
              <div className="flex items-center gap-3">
                <h3 className="text-xs font-light uppercase tracking-widest text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                  <Shirt className="w-4 h-4 text-neutral-500" />
                  {editingProduct
                    ? "EDIT MASTER PRODUK & MATRIX"
                    : "TAMBAH MASTER PRODUK BARU"}
                </h3>

                {/* Shortcut Controls Helper Indicator */}
                <div className="flex items-center gap-1.5 pl-3 border-l border-neutral-800 text-[10px] text-neutral-500 font-mono">
                  <button
                    type="button"
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-1 hover:text-neutral-200 disabled:opacity-30"
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-1 hover:text-neutral-200 disabled:opacity-30"
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] bg-neutral-800 px-1.5 py-0.5 text-neutral-400">
                    Ctrl+S Simpan
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-neutral-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form ref={formRef} action={formAction} className="space-y-6">
              {editingProduct && (
                <input type="hidden" name="id" value={editingProduct.id} />
              )}
              <input
                type="hidden"
                name="payload"
                value={JSON.stringify(payloadToSubmit)}
              />

              <div className="space-y-1">
                <label className="block text-[11px] font-light text-neutral-400 uppercase tracking-wider">
                  NAMA MASTER PRODUK *
                </label>
                <input
                  name="name"
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="Contoh: Setelan Olahraga Azkadina Hoodie 3in1"
                  disabled={isPending}
                  className="w-full px-3 py-2 bg-neutral-100 dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 text-xs text-neutral-900 dark:text-neutral-100 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 border-b border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setActiveTab("matrix")}
                  className={`px-4 py-2 text-xs uppercase border-b-2 ${
                    activeTab === "matrix"
                      ? "border-neutral-100 text-neutral-100 font-normal"
                      : "border-transparent text-neutral-500"
                  }`}
                >
                  1. MATRIX SIZE & WARNA
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("prices")}
                  className={`px-4 py-2 text-xs uppercase border-b-2 ${
                    activeTab === "prices"
                      ? "border-neutral-100 text-neutral-100 font-normal"
                      : "border-transparent text-neutral-500"
                  }`}
                >
                  2. HARGA SKU & BARCODE
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("bom")}
                  className={`px-4 py-2 text-xs uppercase border-b-2 ${
                    activeTab === "bom"
                      ? "border-neutral-100 text-neutral-100 font-normal"
                      : "border-transparent text-neutral-500"
                  }`}
                >
                  3. PARTS, BORONGAN & FLEXIBLE COLOR
                </button>
              </div>

              {activeTab === "matrix" && (
                <ProductMatrixTab
                  sizeOptions={sizeOptions}
                  colorOptions={colorOptions}
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                  toggleSizeSelection={toggleSizeSelection}
                  toggleColorSelection={toggleColorSelection}
                />
              )}

              {activeTab === "prices" && (
                <ProductPricesTab
                  selectedSizes={selectedSizes}
                  selectedColors={selectedColors}
                  sizeOptions={sizeOptions}
                  colorOptions={colorOptions}
                  basePrice={basePrice}
                  setBasePrice={setBasePrice}
                  applyGlobalPrice={applyGlobalPrice}
                  variantConfigs={variantConfigs}
                  setVariantConfigs={setVariantConfigs}
                  setPriceUpdateConfirm={setPriceUpdateConfirm}
                />
              )}

              {activeTab === "bom" && (
                <ProductBomTab
                  selectedSizes={selectedSizes}
                  sizeOptions={sizeOptions}
                  colorOptions={colorOptions}
                  materialOptions={materialOptions}
                  unitOptions={unitOptions}
                  activeBomSizeId={activeBomSizeId}
                  setActiveBomSizeId={setActiveBomSizeId}
                  partsPerSize={partsPerSize}
                  setPartsPerSize={setPartsPerSize}
                  copyBomFromPreviousSize={copyBomFromPreviousSize}
                  removePartFromSize={removePartFromSize}
                  getMaterialPricePerBaseUnit={getMaterialPricePerBaseUnit}
                  getUnitName={getUnitName}
                  formatRupiah={formatRupiah}
                />
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-neutral-400 border border-neutral-800"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2.5 text-xs bg-neutral-100 text-neutral-950 flex items-center gap-2 font-medium"
                >
                  {isPending && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  )}
                  {editingProduct ? "SIMPAN PERUBAHAN" : "SIMPAN MASTER PRODUK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={priceUpdateConfirm.isOpen}
        title="KONFIRMASI UPDATE HARGA SIZE"
        description={`Update harga size "${priceUpdateConfirm.sizeName}" ke Rp ${formatRupiah(
          priceUpdateConfirm.newPrice,
        )}?`}
        confirmText="Ya, Perbarui"
        isDanger={false}
        onConfirm={() => {
          if (priceUpdateConfirm.sizeId)
            applyPricePerSize(
              priceUpdateConfirm.sizeId,
              priceUpdateConfirm.newPrice,
            );
        }}
        onCancel={() => setPriceUpdateConfirm({ isOpen: false, newPrice: 0 })}
      />

      <ProductThermalModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        printItems={printItems}
        selectedPrintVariantIds={selectedPrintVariantIds}
        formatRupiah={formatRupiah}
      />

      <ConfirmDialog
        isOpen={Boolean(deletingId)}
        title="HAPUS MASTER PRODUK"
        description={`Apakah Anda yakin ingin menghapus produk "${deletingName}"?`}
        confirmText="Hapus"
        isDanger={true}
        isLoading={isDeletingLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
