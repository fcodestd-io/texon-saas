"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  submitWarehouseReturnAction,
  getWarehouseReturnHistoryAction,
} from "./action";
import { toast } from "sonner";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import {
  RotateCcw,
  Camera,
  CameraOff,
  Plus,
  Minus,
  Trash2,
  History,
  Loader2,
  Clock,
  ChevronDown,
  ChevronUp,
  Store,
  Search,
  X,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Undo2,
} from "lucide-react";

const LOCAL_STORAGE_KEY = "SPV_WAREHOUSE_RETURN_DRAFT_V1";
const SCANNER_ELEMENT_ID = "html5qrcode-return-stream";

export function WarehouseReturnPageClient({
  initialMarketplaces = [],
  initialVariants = [],
  initialHistory = [],
}: {
  initialMarketplaces: any[];
  initialVariants: any[];
  initialHistory: any[];
}) {
  const [marketplaces] = useState<any[]>(initialMarketplaces);
  const [variants] = useState<any[]>(initialVariants);
  const [historyList, setHistoryList] = useState<any[]>(initialHistory);

  // Form State
  const [selectedMarketplaceId, setSelectedMarketplaceId] = useState("");
  const [notes, setNotes] = useState("");
  const [returnItemsMap, setReturnItemsMap] = useState<
    Record<
      string,
      {
        productVariantId: string;
        returnType: "RESTOCK" | "DEFECTIVE";
        quantity: number;
        reason: string;
      }
    >
  >({});

  const [isLoaded, setIsLoaded] = useState(false);

  // Live Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Scanner State
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openHistoryId, setOpenHistoryId] = useState<string | null>(null);

  // 1. DRAFT LOCALSTORAGE PERSISTENCE (Load Pertama)
  useEffect(() => {
    try {
      const savedDraft = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.marketplaceId)
          setSelectedMarketplaceId(parsed.marketplaceId);
        if (parsed.notes) setNotes(parsed.notes);
        if (parsed.returnItemsMap) setReturnItemsMap(parsed.returnItemsMap);
      }
    } catch (err) {
      console.error("Gagal membaca draf localstorage:", err);
    }
    setIsLoaded(true);
  }, []);

  // 2. AUTO SYNC TO LOCALSTORAGE
  useEffect(() => {
    if (!isLoaded) return;

    try {
      const draftData = {
        marketplaceId: selectedMarketplaceId,
        notes,
        returnItemsMap,
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(draftData));
    } catch (err) {
      console.error("Gagal menyimpan draf localstorage:", err);
    }
  }, [selectedMarketplaceId, notes, returnItemsMap, isLoaded]);

  // Reset Draft LocalStorage
  const handleResetDraft = () => {
    setSelectedMarketplaceId("");
    setNotes("");
    setReturnItemsMap({});
    setSearchQuery("");
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    toast.info("Draf barang kembali berhasil dibersihkan!");
  };

  // Handler Select SKU
  const handleBarcodeScanned = (scannedCode: string) => {
    const matched = variants.find(
      (v) =>
        (v.barcode && v.barcode.toLowerCase() === scannedCode.toLowerCase()) ||
        v.sku.toLowerCase() === scannedCode.toLowerCase(),
    );

    if (matched) {
      toast.success(
        `Ditambahkan: ${matched.productName} (${matched.color} - ${matched.size})`,
      );
      setReturnItemsMap((prev) => {
        const current = prev[matched.id];
        return {
          ...prev,
          [matched.id]: {
            productVariantId: matched.id,
            returnType: current?.returnType || "RESTOCK", // Default kembali ke etalase
            quantity: (current?.quantity || 0) + 1,
            reason: current?.reason || "",
          },
        };
      });
      setSearchQuery("");
      setIsSearchOpen(false);
    } else {
      toast.error(`SKU / Barcode "${scannedCode}" tidak ditemukan!`);
    }
  };

  // 3. HTML5-QRCODE DIRECT WEBCAM CONTROLLER
  useEffect(() => {
    if (!isScannerOpen) {
      if (html5QrcodeRef.current && html5QrcodeRef.current.isScanning) {
        html5QrcodeRef.current.stop().catch(console.error);
      }
      return;
    }

    const html5Qrcode = new Html5Qrcode(SCANNER_ELEMENT_ID, {
      formatsToSupport: [
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.QR_CODE,
      ],
      verbose: false,
    });

    html5QrcodeRef.current = html5Qrcode;

    html5Qrcode
      .start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 260, height: 130 } },
        (decodedText) => handleBarcodeScanned(decodedText.trim()),
        () => {},
      )
      .catch((err) => {
        console.error("Gagal kamera belakang:", err);
        html5Qrcode
          .start(
            { facingMode: "user" },
            { fps: 15, qrbox: { width: 260, height: 130 } },
            (decodedText) => handleBarcodeScanned(decodedText.trim()),
            () => {},
          )
          .catch(() => {
            toast.error("Gagal mengakses kamera.");
            setIsScannerOpen(false);
          });
      });

    return () => {
      if (html5Qrcode.isScanning) {
        html5Qrcode.stop().catch(console.error);
      }
    };
  }, [isScannerOpen]);

  // Filter Varian
  const filteredVariants = variants.filter((v) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      v.productName?.toLowerCase().includes(q) ||
      v.sku?.toLowerCase().includes(q) ||
      v.color?.toLowerCase().includes(q) ||
      v.size?.toLowerCase().includes(q) ||
      (v.barcode && v.barcode.toLowerCase().includes(q))
    );
  });

  // Handlers Modifikasi Item
  const handleTypeChange = (
    variantId: string,
    type: "RESTOCK" | "DEFECTIVE",
  ) => {
    setReturnItemsMap((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], returnType: type },
    }));
  };

  const handleReasonChange = (variantId: string, reason: string) => {
    setReturnItemsMap((prev) => ({
      ...prev,
      [variantId]: { ...prev[variantId], reason },
    }));
  };

  const handleIncrement = (variantId: string) => {
    setReturnItemsMap((prev) => ({
      ...prev,
      [variantId]: {
        ...prev[variantId],
        quantity: (prev[variantId]?.quantity || 0) + 1,
      },
    }));
  };

  const handleDecrement = (variantId: string) => {
    setReturnItemsMap((prev) => {
      const currentQty = prev[variantId]?.quantity || 0;
      if (currentQty <= 1) {
        const copy = { ...prev };
        delete copy[variantId];
        return copy;
      }
      return {
        ...prev,
        [variantId]: {
          ...prev[variantId],
          quantity: currentQty - 1,
        },
      };
    });
  };

  const handleRemoveItem = (variantId: string) => {
    setReturnItemsMap((prev) => {
      const copy = { ...prev };
      delete copy[variantId];
      return copy;
    });
  };

  // Submit Transaksi
  const handleSubmit = async () => {
    const validItems = Object.values(returnItemsMap).filter(
      (i) => i.quantity > 0,
    );

    if (validItems.length === 0) {
      toast.warning("Tambahkan minimal 1 barang kembali.");
      return;
    }

    setIsSubmitting(true);
    const res = await submitWarehouseReturnAction({
      marketplaceId: selectedMarketplaceId || null,
      notes,
      items: validItems,
    });
    setIsSubmitting(false);

    if (res.success) {
      toast.success(res.message);
      handleResetDraft();
      setIsScannerOpen(false);

      const updatedHistory = await getWarehouseReturnHistoryAction();
      setHistoryList(updatedHistory || []);
    } else {
      toast.error(res.message);
    }
  };

  // UI Mapping List
  const returnListUI = Object.values(returnItemsMap)
    .map((item) => {
      const vObj = variants.find((v) => v.id === item.productVariantId);
      if (!vObj) return null;
      const stockBefore = vObj.stock;
      const stockAfter =
        item.returnType === "RESTOCK"
          ? stockBefore + item.quantity
          : stockBefore;

      return {
        ...item,
        ...vObj,
        stockBefore,
        stockAfter,
      };
    })
    .filter(Boolean);

  return (
    <div className="space-y-4 text-xs font-sans max-w-md mx-auto">
      {/* Top Bar */}
      <div className="flex items-center justify-between font-mono">
        <Link
          href="/supervisor/warehouse/dashboard"
          className="p-2 bg-neutral-900 border border-neutral-800 text-neutral-300 hover:text-amber-400 rounded-lg flex items-center gap-1.5 transition-colors font-bold text-[10px]"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>KEMBALI KE MENU UTAMA</span>
        </Link>

        <button
          onClick={handleResetDraft}
          className="p-2 text-[10px] font-mono text-neutral-400 hover:text-red-400 bg-neutral-900 border border-neutral-800 rounded-lg flex items-center gap-1 transition-colors font-bold"
        >
          <RotateCcw className="w-3.5 h-3.5" /> RESET DRAF
        </button>
      </div>

      {/* Header Bar */}
      <div className="p-3.5 bg-neutral-900 border border-neutral-800 rounded-xl space-y-3">
        <div>
          <span className="text-[9px] font-mono tracking-widest text-amber-500 uppercase font-semibold block">
            GUDANG RETUR & INVENTORY
          </span>
          <h2 className="text-sm font-bold text-neutral-100 uppercase tracking-wide font-mono mt-0.5">
            PENGEMBALIAN BARANG (RETURN)
          </h2>
        </div>

        {/* Marketplace & Catatan Header */}
        <div className="space-y-2 bg-neutral-950 p-3 rounded-lg border border-neutral-800 font-mono">
          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">
              ASAL MARKETPLACE / CHANNEL (OPSIONAL):
            </label>
            <select
              value={selectedMarketplaceId}
              onChange={(e) => setSelectedMarketplaceId(e.target.value)}
              className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
            >
              <option value="">-- TANPA MARKETPLACE (OFFLINE/GROSIR) --</option>
              {marketplaces.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] text-neutral-400 block mb-1">
              CATATAN / NOMOR RETUR (OPSIONAL):
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nomor Resi Retur / Catatan..."
              className="w-full p-2 bg-neutral-900 border border-neutral-800 text-neutral-100 rounded focus:outline-none"
            />
          </div>
        </div>

        {/* Toggle Webcam Scanner */}
        <button
          onClick={() => setIsScannerOpen(!isScannerOpen)}
          className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 uppercase font-mono font-bold transition-colors ${
            isScannerOpen
              ? "bg-red-500 hover:bg-red-400 text-neutral-950"
              : "bg-amber-500 hover:bg-amber-400 text-neutral-950"
          }`}
        >
          {isScannerOpen ? (
            <>
              <CameraOff className="w-4 h-4" /> TUTUP WEBCAM SCANNER
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" /> SCAN BARCODE SKU (WEBCAM)
            </>
          )}
        </button>
      </div>

      {/* WEBCAM SCANNER CONTAINER */}
      {isScannerOpen && (
        <div className="relative bg-neutral-950 border border-neutral-800 rounded-xl overflow-hidden p-2 space-y-2">
          <div
            id={SCANNER_ELEMENT_ID}
            className="w-full rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 [&_video]:w-full [&_video]:h-full [&_video]:object-cover"
          ></div>
          <p className="text-[9.5px] font-mono text-neutral-400 text-center">
            Arahkan Barcode SKU retur ke area kamera.
          </p>
        </div>
      )}

      {/* LIVE SEARCH MANUAL INPUT */}
      <div className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2 relative font-mono">
        <label className="text-[10px] text-neutral-400 uppercase block">
          PILIH MANUAL (LIVE SEARCH SKU / PRODUK):
        </label>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-neutral-500 absolute left-2.5 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsSearchOpen(true)}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsSearchOpen(true);
            }}
            placeholder="Cari nama produk, SKU, warna, size..."
            className="w-full pl-8 pr-8 p-2 bg-neutral-950 border border-neutral-800 text-neutral-100 rounded focus:outline-none text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setIsSearchOpen(false);
              }}
              className="absolute right-2.5 top-2.5 text-neutral-500 hover:text-neutral-300"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Dropdown Results */}
        {isSearchOpen && (
          <div className="max-h-52 overflow-y-auto bg-neutral-950 border border-neutral-800 rounded-lg p-1 space-y-1 shadow-2xl z-20 absolute left-3 right-3 top-[68px]">
            {filteredVariants.length === 0 ? (
              <p className="p-3 text-center text-neutral-500 italic text-[10px]">
                Produk / SKU tidak ditemukan.
              </p>
            ) : (
              filteredVariants.map((v) => (
                <button
                  key={v.id}
                  onClick={() => handleBarcodeScanned(v.sku)}
                  className="w-full p-2 hover:bg-neutral-900 text-left rounded flex justify-between items-center transition-colors border-b border-neutral-900 last:border-0"
                >
                  <div>
                    <span className="font-bold text-neutral-200 block text-[11px]">
                      {v.productName} ({v.color} - {v.size})
                    </span>
                    <span className="text-[9px] text-neutral-500">
                      SKU: {v.sku}
                    </span>
                  </div>

                  <span className="text-[10px] font-extrabold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/50">
                    STOK: {v.stock}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* DAFTAR ITEM BARANG KEMBALI */}
      <div className="space-y-2">
        <p className="text-[10px] font-mono text-neutral-500 uppercase px-1">
          DAFTAR BARANG RETUR ({returnListUI.length} ITEM):
        </p>

        {returnListUI.length === 0 ? (
          <p className="p-6 text-center text-neutral-500 font-mono italic bg-neutral-900/50 border border-neutral-800 rounded-xl">
            Scan barcode atau gunakan live search di atas untuk menambahkan item
            retur.
          </p>
        ) : (
          returnListUI.map((item: any) => (
            <div
              key={item.id}
              className="p-3 bg-neutral-900 border border-neutral-800 rounded-xl space-y-2.5 font-mono"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-neutral-100 uppercase text-xs">
                    {item.productName} ({item.color} - {item.size})
                  </h3>
                  <span className="text-[9px] text-neutral-500 block">
                    SKU: {item.sku}
                  </span>
                </div>

                <button
                  onClick={() => handleRemoveItem(item.id)}
                  className="text-red-400 hover:text-red-300 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2 MODE SELECTION SWITCHER */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800 text-[10px]">
                <button
                  type="button"
                  onClick={() => handleTypeChange(item.id, "RESTOCK")}
                  className={`p-1.5 rounded font-bold flex items-center justify-center gap-1 transition-colors ${
                    item.returnType === "RESTOCK"
                      ? "bg-emerald-500 text-neutral-950"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" /> KE ETALASE (BAGUS)
                </button>

                <button
                  type="button"
                  onClick={() => handleTypeChange(item.id, "DEFECTIVE")}
                  className={`p-1.5 rounded font-bold flex items-center justify-center gap-1 transition-colors ${
                    item.returnType === "DEFECTIVE"
                      ? "bg-red-500 text-neutral-950"
                      : "text-neutral-400 hover:text-neutral-200"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3" /> CACAT / AFKIR
                </button>
              </div>

              {/* REASON INPUT */}
              <div>
                <input
                  type="text"
                  value={item.reason}
                  onChange={(e) => handleReasonChange(item.id, e.target.value)}
                  placeholder="Alasan retur (misal: jahitan lepas, kain kotor...)"
                  className="w-full p-1.5 bg-neutral-950 border border-neutral-800 text-neutral-200 text-[10px] rounded focus:outline-none"
                />
              </div>

              {/* STOK IMPACT CONTROL */}
              <div className="grid grid-cols-3 gap-1 bg-neutral-950 p-2 rounded border border-neutral-800/80 text-[10px] text-center">
                <div>
                  <span className="text-[8.5px] text-neutral-500 block">
                    STOK AWAL
                  </span>
                  <span className="font-bold text-neutral-300">
                    {item.stockBefore}
                  </span>
                </div>

                <div>
                  <span className="text-[8.5px] text-amber-400 block font-bold">
                    QTY RETUR
                  </span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <button
                      onClick={() => handleDecrement(item.id)}
                      className="p-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="font-extrabold text-amber-400 px-1">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => handleIncrement(item.id)}
                      className="p-0.5 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 rounded"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <div>
                  <span className="text-[8.5px] text-neutral-500 block">
                    STOK SETELAH
                  </span>
                  <span
                    className={`font-extrabold ${
                      item.returnType === "RESTOCK"
                        ? "text-emerald-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {item.stockAfter}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}

        {returnListUI.length > 0 && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold rounded-xl flex items-center justify-center gap-2 uppercase tracking-wider text-xs font-mono disabled:opacity-50 transition-colors shadow-lg mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Undo2 className="w-4 h-4" />
            )}
            <span>SIMPAN RETUR & PROSES STOK</span>
          </button>
        )}
      </div>

      {/* RIWAYAT BARANG KEMBALI */}
      <div className="space-y-2 pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between px-1 font-mono">
          <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-amber-500" />
            RIWAYAT BARANG KEMBALI ({historyList.length})
          </span>
        </div>

        {historyList.length === 0 ? (
          <p className="p-6 text-center text-neutral-500 font-mono italic bg-neutral-900/50 border border-neutral-800 rounded-xl">
            Belum ada riwayat transaksi barang kembali.
          </p>
        ) : (
          historyList.map((hist) => {
            const isOpen = openHistoryId === hist.id;
            const totalQtyRet = hist.items.reduce(
              (sum: number, it: any) => sum + parseFloat(it.quantity || "0"),
              0,
            );

            return (
              <div
                key={hist.id}
                className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden font-mono"
              >
                <button
                  onClick={() => setOpenHistoryId(isOpen ? null : hist.id)}
                  className="w-full p-3 flex items-center justify-between text-left hover:bg-neutral-800/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <span className="font-bold text-amber-400 text-xs block">
                      {hist.referenceNumber}
                    </span>
                    <span className="text-[10px] text-neutral-300 block flex items-center gap-1">
                      <Store className="w-3 h-3 text-neutral-500" />
                      {hist.marketplaceName || "Offline / Grosir"}
                    </span>
                    <span className="text-[9px] text-neutral-500 flex items-center gap-1 pt-0.5">
                      <Clock className="w-3 h-3 text-neutral-600" />
                      {new Date(hist.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <span className="text-[9px] text-neutral-500 block">
                        TOTAL RETUR
                      </span>
                      <span className="text-amber-400 font-extrabold text-xs">
                        +{totalQtyRet} SET
                      </span>
                    </div>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-neutral-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-neutral-400" />
                    )}
                  </div>
                </button>

                {isOpen && (
                  <div className="p-3 bg-neutral-950 border-t border-neutral-800 space-y-1.5 text-[10px]">
                    {hist.notes && (
                      <p className="text-[9px] text-neutral-400 italic mb-2">
                        Catatan: "{hist.notes}"
                      </p>
                    )}

                    {hist.items?.map((it: any) => (
                      <div
                        key={it.id}
                        className="p-2 bg-neutral-900 border border-neutral-800/80 rounded flex justify-between items-center text-neutral-200"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold">
                              {it.sku} ({it.colorName || "-"} -{" "}
                              {it.sizeName || "-"})
                            </span>
                            <span
                              className={`text-[8px] font-bold px-1.5 py-0.2 rounded ${
                                it.returnType === "RESTOCK"
                                  ? "bg-emerald-950 text-emerald-400 border border-emerald-900"
                                  : "bg-red-950 text-red-400 border border-red-900"
                              }`}
                            >
                              {it.returnType === "RESTOCK"
                                ? "ETALASE"
                                : "CACAT"}
                            </span>
                          </div>
                          {it.reason && (
                            <span className="text-[8.5px] text-neutral-400 block italic">
                              Alasan: "{it.reason}"
                            </span>
                          )}
                          {it.returnType === "RESTOCK" && (
                            <span className="text-[8.5px] text-neutral-500 block">
                              Stok: {it.stockBefore} ➔ {it.stockAfter}
                            </span>
                          )}
                        </div>

                        <span className="font-bold text-amber-400">
                          +{parseFloat(it.quantity)} SET
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
