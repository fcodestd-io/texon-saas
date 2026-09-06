"use client";

import React from "react";

export interface OptionItem {
  id: string;
  name: string;
}

interface ProductPricesTabProps {
  selectedSizes: string[];
  selectedColors: string[];
  sizeOptions: OptionItem[];
  colorOptions: OptionItem[];
  basePrice: number;
  setBasePrice: (val: number) => void;
  applyGlobalPrice: (price: number) => void;
  variantConfigs: Record<string, { price: number; barcode?: string }>;
  setVariantConfigs: React.Dispatch<
    React.SetStateAction<Record<string, { price: number; barcode?: string }>>
  >;
  setPriceUpdateConfirm: (data: {
    isOpen: boolean;
    sizeId?: string;
    sizeName?: string;
    newPrice: number;
  }) => void;
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
  setPriceUpdateConfirm,
}) => {
  return (
    <div className="space-y-6">
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

      <div className="space-y-4 max-h-80 overflow-y-auto pr-1">
        {selectedSizes.map((sId) => {
          const sizeName = sizeOptions.find((s) => s.id === sId)?.name;
          return (
            <div
              key={sId}
              className="border border-neutral-800 p-3 space-y-3 bg-neutral-950"
            >
              <div className="flex justify-between items-center pb-2 border-b border-neutral-800">
                <span className="text-xs font-medium text-neutral-200">
                  UKURAN: {sizeName}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPriceUpdateConfirm({
                      isOpen: true,
                      sizeId: sId,
                      sizeName,
                      newPrice: basePrice,
                    })
                  }
                  className="text-[10px] text-neutral-400 hover:text-neutral-100 underline"
                >
                  Update Harga Size Ini
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedColors.map((cId) => {
                  const colorName = colorOptions.find(
                    (c) => c.id === cId,
                  )?.name;
                  const comboKey = `${sId}_${cId}`;
                  const currentPrice = variantConfigs[comboKey]?.price ?? 0;
                  const currentBarcode =
                    variantConfigs[comboKey]?.barcode || "";

                  return (
                    <div
                      key={cId}
                      className="p-2 border border-neutral-900 bg-neutral-900/60 space-y-1.5"
                    >
                      <div className="text-[11px] text-neutral-300 font-mono">
                        {colorName} - {sizeName}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[9px] text-neutral-500 uppercase block">
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
                            placeholder="0 (Default)"
                            className="w-full px-2 py-1 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] text-neutral-500 uppercase block">
                            Barcode (Numeric)
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
                            placeholder="Auto Generate"
                            className="w-full px-2 py-1 bg-neutral-950 border border-neutral-800 text-xs text-neutral-100 focus:outline-none"
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
    </div>
  );
};
