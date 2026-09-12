"use client";

import React, { useState } from "react";

export interface OptionItem {
  id: string;
  name: string;
}

export interface VariantConfigItem {
  price: number;
  finishingPrice?: number;
  barcode?: string;
}

interface ProductPricesTabProps {
  selectedSizes: string[];
  selectedColors: string[];
  sizeOptions: OptionItem[];
  colorOptions: OptionItem[];
  basePrice: number;
  setBasePrice: (val: number) => void;
  applyGlobalPrice: (price: number) => void;
  variantConfigs: Record<string, VariantConfigItem>;
  setVariantConfigs: React.Dispatch<
    React.SetStateAction<Record<string, VariantConfigItem>>
  >;
  setPriceUpdateConfirm?: (data: any) => void; // Dibuat opsional agar kompatibel dengan parent
}

export const ProductPricesTab: React.FC<ProductPricesTabProps> = ({
  selectedSizes,
  selectedColors,
  sizeOptions,
  colorOptions,
  basePrice,
  setBasePrice,
  applyGlobalPrice,
  variantConfigs,
  setVariantConfigs,
}) => {
  // State Modal Update Harga Jual Per Size
  const [priceModal, setPriceModal] = useState<{
    isOpen: boolean;
    sizeId: string;
    sizeName: string;
    newPrice: number;
  }>({
    isOpen: false,
    sizeId: "",
    sizeName: "",
    newPrice: 0,
  });

  // State Modal Set Finishing Price Per Size
  const [finishingModal, setFinishingModal] = useState<{
    isOpen: boolean;
    sizeId: string;
    sizeName: string;
    finishingPrice: number;
  }>({
    isOpen: false,
    sizeId: "",
    sizeName: "",
    finishingPrice: 0,
  });

  // Handler Apply Harga Jual khusus 1 Size
  const handleApplyPriceToSize = () => {
    const { sizeId, newPrice } = priceModal;
    if (!sizeId) return;

    setVariantConfigs((prev) => {
      const next = { ...prev };
      selectedColors.forEach((cId) => {
        const comboKey = `${sizeId}_${cId}`;
        next[comboKey] = {
          ...next[comboKey],
          price: newPrice,
        };
      });
      return next;
    });

    setPriceModal({ isOpen: false, sizeId: "", sizeName: "", newPrice: 0 });
  };

  // Handler Apply Finishing Price khusus 1 Size
  const handleApplyFinishingToSize = () => {
    const { sizeId, finishingPrice } = finishingModal;
    if (!sizeId) return;

    setVariantConfigs((prev) => {
      const next = { ...prev };
      selectedColors.forEach((cId) => {
        const comboKey = `${sizeId}_${cId}`;
        next[comboKey] = {
          ...next[comboKey],
          finishingPrice: finishingPrice,
        };
      });
      return next;
    });

    setFinishingModal({
      isOpen: false,
      sizeId: "",
      sizeName: "",
      finishingPrice: 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* GLOBAL PRICE BAR */}
      <div className="p-3 border border-neutral-800 bg-neutral-950 flex justify-between items-center">
        <span className="text-xs text-neutral-400">
          Atur Harga Dasar Seluruh SKU (0 = Default/Kosong):
        </span>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={basePrice}
            onChange={(e) => setBasePrice(parseFloat(e.target.value) || 0)}
            className="w-32 px-2 py-1 bg-neutral-900 border border-neutral-700 text-xs text-neutral-100 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => applyGlobalPrice(basePrice)}
            className="px-3 py-1 bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200"
          >
            Terapkan ke Semua
          </button>
        </div>
      </div>

      {/* MATRIX SKU PER SIZE */}
      <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
        {selectedSizes.map((sId) => {
          const sizeName = sizeOptions.find((s) => s.id === sId)?.name || "";
          return (
            <div
              key={sId}
              className="border border-neutral-800 p-3 space-y-3 bg-neutral-950"
            >
              {/* HEADER LEVEL SIZE WITH BOTH MODAL TRIGGERS */}
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-xs font-medium text-neutral-200">
                  UKURAN: {sizeName}
                </span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setPriceModal({
                        isOpen: true,
                        sizeId: sId,
                        sizeName: sizeName,
                        newPrice: basePrice,
                      })
                    }
                    className="text-[10px] text-neutral-400 hover:text-neutral-100 underline"
                  >
                    Set Harga Jual Size Ini
                  </button>

                  <span className="text-neutral-700">|</span>

                  <button
                    type="button"
                    onClick={() =>
                      setFinishingModal({
                        isOpen: true,
                        sizeId: sId,
                        sizeName: sizeName,
                        finishingPrice: 0,
                      })
                    }
                    className="text-[10px] text-amber-500 hover:text-amber-400 underline"
                  >
                    Set Finishing Price Size Ini
                  </button>
                </div>
              </div>

              {/* GRID SKU VARIAN WARNA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedColors.map((cId) => {
                  const colorName = colorOptions.find(
                    (c) => c.id === cId,
                  )?.name;
                  const comboKey = `${sId}_${cId}`;
                  const currentPrice = variantConfigs[comboKey]?.price ?? 0;
                  const currentFinishingPrice =
                    variantConfigs[comboKey]?.finishingPrice ?? 0;
                  const currentBarcode =
                    variantConfigs[comboKey]?.barcode || "";

                  return (
                    <div
                      key={cId}
                      className="p-2.5 border border-neutral-900 bg-neutral-900/60 space-y-2"
                    >
                      <div className="text-[11px] text-neutral-300 font-mono font-medium">
                        {colorName} - {sizeName}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-400 uppercase block">
                            Harga Jual (Rp)
                          </label>
                          <input
                            type="number"
                            value={currentPrice}
                            onChange={(e) =>
                              setVariantConfigs((prev) => ({
                                ...prev,
                                [comboKey]: {
                                  ...prev[comboKey],
                                  price: parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-neutral-600"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-amber-500 uppercase block">
                            Finishing (Rp)
                          </label>
                          <input
                            type="number"
                            value={currentFinishingPrice}
                            onChange={(e) =>
                              setVariantConfigs((prev) => ({
                                ...prev,
                                [comboKey]: {
                                  ...prev[comboKey],
                                  finishingPrice:
                                    parseFloat(e.target.value) || 0,
                                },
                              }))
                            }
                            placeholder="0"
                            className="w-full px-2 py-1 bg-neutral-950 border border-amber-900/50 text-xs text-amber-200 focus:outline-none focus:border-amber-600"
                          />
                        </div>

                        <div>
                          <label className="text-[9px] text-neutral-400 uppercase block">
                            Barcode
                          </label>
                          <input
                            type="text"
                            value={currentBarcode}
                            onChange={(e) =>
                              setVariantConfigs((prev) => ({
                                ...prev,
                                [comboKey]: {
                                  ...prev[comboKey],
                                  barcode: e.target.value,
                                },
                              }))
                            }
                            placeholder="Auto"
                            className="w-full px-2 py-1 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none focus:border-neutral-600"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: SET HARGA JUAL PER SIZE */}
      {priceModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md p-5 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-medium text-neutral-100 uppercase tracking-wider">
                SET HARGA JUAL - UKURAN {priceModal.sizeName}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Tentukan harga jual yang akan diterapkan ke seluruh warna varian
                untuk ukuran{" "}
                <strong className="text-neutral-200">
                  {priceModal.sizeName}
                </strong>
                .
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 block">
                Nominal Harga Jual (Rp)
              </label>
              <input
                type="number"
                value={priceModal.newPrice}
                onChange={(e) =>
                  setPriceModal((prev) => ({
                    ...prev,
                    newPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Masukkan nominal"
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-sm text-neutral-100 focus:outline-none focus:border-neutral-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setPriceModal({
                    isOpen: false,
                    sizeId: "",
                    sizeName: "",
                    newPrice: 0,
                  })
                }
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyPriceToSize}
                className="px-4 py-1.5 bg-neutral-100 text-neutral-950 text-xs font-medium hover:bg-neutral-200"
              >
                Terapkan ke Varian Size Ini
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SET FINISHING PRICE PER SIZE */}
      {finishingModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="bg-neutral-950 border border-neutral-800 w-full max-w-md p-5 space-y-4 shadow-xl">
            <div>
              <h3 className="text-sm font-medium text-neutral-100 uppercase tracking-wider">
                SET FINISHING PRICE - UKURAN {finishingModal.sizeName}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Tentukan ongkos finishing yang akan diterapkan ke seluruh warna
                varian untuk ukuran{" "}
                <strong className="text-neutral-200">
                  {finishingModal.sizeName}
                </strong>
                .
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-neutral-400 block">
                Nominal Ongkos Finishing (Rp)
              </label>
              <input
                type="number"
                value={finishingModal.finishingPrice}
                onChange={(e) =>
                  setFinishingModal((prev) => ({
                    ...prev,
                    finishingPrice: parseFloat(e.target.value) || 0,
                  }))
                }
                placeholder="Masukkan nominal"
                className="w-full px-3 py-1.5 bg-neutral-900 border border-neutral-700 text-sm text-neutral-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setFinishingModal({
                    isOpen: false,
                    sizeId: "",
                    sizeName: "",
                    finishingPrice: 0,
                  })
                }
                className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleApplyFinishingToSize}
                className="px-4 py-1.5 bg-amber-500 text-neutral-950 text-xs font-medium hover:bg-amber-400"
              >
                Terapkan ke Varian Size Ini
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
