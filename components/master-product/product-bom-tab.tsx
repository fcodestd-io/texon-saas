"use client";

import React from "react";
import { Copy, Tag, Trash2, X } from "lucide-react";

export interface OptionItem {
  id: string;
  name: string;
  category?: string;
  baseUnitId?: string;
  purchasePrice?: string;
  conversionValue?: string;
}

interface ProductBomTabProps {
  selectedSizes: string[];
  sizeOptions: OptionItem[];
  colorOptions: OptionItem[];
  materialOptions: OptionItem[];
  unitOptions: OptionItem[];
  activeBomSizeId: string;
  setActiveBomSizeId: (id: string) => void;
  partsPerSize: Record<string, any[]>;
  setPartsPerSize: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  copyBomFromPreviousSize: (targetId: string, sourceId: string) => void;
  removePartFromSize: (sizeId: string, pIdx: number) => void;
  getMaterialPricePerBaseUnit: (matId: string) => number;
  getUnitName: (unitId: string) => string;
  formatRupiah: (val: number | string) => string;
}

export const ProductBomTab: React.FC<ProductBomTabProps> = ({
  selectedSizes,
  sizeOptions,
  colorOptions,
  materialOptions,
  unitOptions,
  activeBomSizeId,
  setActiveBomSizeId,
  partsPerSize,
  setPartsPerSize,
  copyBomFromPreviousSize,
  removePartFromSize,
  getMaterialPricePerBaseUnit,
  getUnitName,
  formatRupiah,
}) => {
  return (
    <div className="space-y-6">
      <div className="p-3 border border-neutral-800 bg-neutral-950 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          <span className="text-xs text-neutral-400 font-medium mr-1">
            Pilih Size:
          </span>
          {selectedSizes.map((sId) => {
            const sName = sizeOptions.find((s) => s.id === sId)?.name;
            const isSel = activeBomSizeId === sId;
            return (
              <button
                key={sId}
                type="button"
                onClick={() => setActiveBomSizeId(sId)}
                className={`px-3 py-1 text-xs border ${
                  isSel
                    ? "bg-neutral-100 text-neutral-950 font-normal"
                    : "bg-neutral-950 text-neutral-400 border-neutral-800"
                }`}
              >
                Size: {sName}
              </button>
            );
          })}
        </div>

        {selectedSizes.length > 1 && activeBomSizeId && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] text-neutral-400">Copy BOM:</span>
            {selectedSizes
              .filter((id) => id !== activeBomSizeId)
              .map((prevSizeId) => {
                const prevName = sizeOptions.find(
                  (s) => s.id === prevSizeId,
                )?.name;
                return (
                  <button
                    key={prevSizeId}
                    type="button"
                    onClick={() =>
                      copyBomFromPreviousSize(activeBomSizeId, prevSizeId)
                    }
                    className="text-[10px] bg-neutral-800 hover:bg-neutral-700 text-neutral-200 px-2 py-1 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" /> Salin dari `{prevName}`
                  </button>
                );
              })}
          </div>
        )}
      </div>

      {activeBomSizeId && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs text-neutral-200 uppercase font-medium">
              PARTS PRODUK & KONFIGURASI WARNA (SIZE `
              {sizeOptions.find((s) => s.id === activeBomSizeId)?.name}`)
            </span>
            <button
              type="button"
              onClick={() => {
                const updated = { ...partsPerSize };
                if (!updated[activeBomSizeId]) updated[activeBomSizeId] = [];
                updated[activeBomSizeId].push({
                  name: `Part ${updated[activeBomSizeId].length + 1}`,
                  cuttingPrice: 0,
                  sewingPrice: 0,
                  overdeckPrice: 0,
                  listPrice: 0,
                  colorMode: "matching_sku",
                  fixedColorId: "",
                  materials: [],
                });
                setPartsPerSize(updated);
              }}
              className="text-[10px] bg-neutral-800 text-neutral-200 px-2 py-1 flex items-center gap-1"
            >
              + Tambah Part
            </button>
          </div>

          {(partsPerSize[activeBomSizeId] || []).map(
            (pt: any, pIdx: number) => (
              <div
                key={pIdx}
                className="p-3 border border-neutral-800 bg-neutral-950 space-y-3 relative"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-2 border-b border-neutral-800/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-neutral-200 uppercase font-mono">
                      #{pIdx + 1} {pt.name || "Part Tanpa Nama"}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-neutral-900 px-2.5 py-1 border border-neutral-800 text-xs">
                      <Tag className="w-3 h-3 text-amber-500" />
                      <span className="text-[10px] text-neutral-400">
                        Aturan Warna:
                      </span>
                      <select
                        value={pt.colorMode || "matching_sku"}
                        onChange={(e) => {
                          const updated = { ...partsPerSize };
                          const newMode = e.target.value;
                          updated[activeBomSizeId][pIdx].colorMode = newMode;

                          if (newMode === "matching_sku") {
                            updated[activeBomSizeId][pIdx].fixedColorId = "";
                          } else if (
                            !updated[activeBomSizeId][pIdx].fixedColorId
                          ) {
                            updated[activeBomSizeId][pIdx].fixedColorId =
                              colorOptions[0]?.id || "";
                          }
                          setPartsPerSize(updated);
                        }}
                        className="bg-neutral-950 text-neutral-100 border border-neutral-800 text-[11px] px-1.5 py-0.5 focus:outline-none"
                      >
                        <option value="matching_sku">
                          Dinamis (Mengikuti SKU)
                        </option>
                        <option value="fixed_color">
                          Fixed (1 Warna Default)
                        </option>
                      </select>

                      {pt.colorMode === "fixed_color" && (
                        <select
                          value={pt.fixedColorId || ""}
                          onChange={(e) => {
                            const updated = { ...partsPerSize };
                            updated[activeBomSizeId][pIdx].fixedColorId =
                              e.target.value;
                            setPartsPerSize(updated);
                          }}
                          className="bg-amber-950/40 text-amber-200 border border-amber-800/60 text-[11px] px-1.5 py-0.5 font-semibold focus:outline-none"
                        >
                          {colorOptions.map((c) => (
                            <option
                              key={c.id}
                              value={c.id}
                              className="bg-neutral-900 text-neutral-100"
                            >
                              Warna: {c.name}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => removePartFromSize(activeBomSizeId, pIdx)}
                      className="p-1.5 text-neutral-500 hover:text-red-400 border border-neutral-800 hover:border-red-900/50 bg-neutral-900"
                      title="Hapus Part Ini"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  <div>
                    <label className="text-[9px] text-neutral-400 uppercase">
                      Nama Part
                    </label>
                    <input
                      type="text"
                      value={pt.name}
                      onChange={(e) => {
                        const updated = { ...partsPerSize };
                        updated[activeBomSizeId][pIdx].name = e.target.value;
                        setPartsPerSize(updated);
                      }}
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-400 uppercase">
                      Cutting (Rp)
                    </label>
                    <input
                      type="number"
                      value={pt.cuttingPrice}
                      onChange={(e) => {
                        const updated = { ...partsPerSize };
                        updated[activeBomSizeId][pIdx].cuttingPrice =
                          parseFloat(e.target.value) || 0;
                        setPartsPerSize(updated);
                      }}
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-400 uppercase">
                      Sewing (Rp)
                    </label>
                    <input
                      type="number"
                      value={pt.sewingPrice}
                      onChange={(e) => {
                        const updated = { ...partsPerSize };
                        updated[activeBomSizeId][pIdx].sewingPrice =
                          parseFloat(e.target.value) || 0;
                        setPartsPerSize(updated);
                      }}
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-400 uppercase">
                      Overdeck (Rp)
                    </label>
                    <input
                      type="number"
                      value={pt.overdeckPrice}
                      onChange={(e) => {
                        const updated = { ...partsPerSize };
                        updated[activeBomSizeId][pIdx].overdeckPrice =
                          parseFloat(e.target.value) || 0;
                        setPartsPerSize(updated);
                      }}
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-100"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-neutral-400 uppercase">
                      Jasa List (Rp)
                    </label>
                    <input
                      type="number"
                      value={pt.listPrice ?? 0}
                      onChange={(e) => {
                        const updated = { ...partsPerSize };
                        updated[activeBomSizeId][pIdx].listPrice =
                          parseFloat(e.target.value) || 0;
                        setPartsPerSize(updated);
                      }}
                      placeholder="0"
                      className="w-full px-2 py-1 bg-neutral-900 border border-neutral-800 text-xs text-neutral-100"
                    />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-neutral-800">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-neutral-400 uppercase">
                      BAHAN BAKU (BOM MATERIAL)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = { ...partsPerSize };
                        const firstMat = materialOptions[0];
                        updated[activeBomSizeId][pIdx].materials.push({
                          materialId: firstMat?.id || "",
                          materialColorId: null, // SET NULL AGAR TIDAK MENGIRIM ID MASTER WARNA (colors.id)
                          quantity: 1,
                          consumptionUnitId:
                            firstMat?.baseUnitId || unitOptions[0]?.id || "",
                          wastePercentage: 0,
                        });
                        setPartsPerSize(updated);
                      }}
                      className="text-[9px] text-neutral-300 underline"
                    >
                      + Tambah Bahan
                    </button>
                  </div>

                  {pt.materials.map((m: any, mIdx: number) => {
                    const pricePerUnit = getMaterialPricePerBaseUnit(
                      m.materialId,
                    );
                    const subtotal =
                      m.quantity *
                      pricePerUnit *
                      (1 + (m.wastePercentage || 0) / 100);
                    const unitName = getUnitName(m.consumptionUnitId);

                    return (
                      <div
                        key={mIdx}
                        className="grid grid-cols-12 gap-2 items-center text-xs"
                      >
                        <div className="col-span-4">
                          <select
                            value={m.materialId}
                            onChange={(e) => {
                              const updated = { ...partsPerSize };
                              const sel = materialOptions.find(
                                (mat) => mat.id === e.target.value,
                              );
                              updated[activeBomSizeId][pIdx].materials[
                                mIdx
                              ].materialId = e.target.value;
                              if (sel?.baseUnitId)
                                updated[activeBomSizeId][pIdx].materials[
                                  mIdx
                                ].consumptionUnitId = sel.baseUnitId;
                              setPartsPerSize(updated);
                            }}
                            className="w-full px-1.5 py-1 bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-100"
                          >
                            {materialOptions.map((mat) => (
                              <option
                                key={mat.id}
                                value={mat.id}
                                className="bg-neutral-900 text-neutral-100"
                              >
                                {mat.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="col-span-3 flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.001"
                            value={m.quantity}
                            onChange={(e) => {
                              const updated = { ...partsPerSize };
                              updated[activeBomSizeId][pIdx].materials[
                                mIdx
                              ].quantity = parseFloat(e.target.value) || 0;
                              setPartsPerSize(updated);
                            }}
                            className="w-full px-1.5 py-1 bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-100"
                          />
                          <span className="text-[10px] text-neutral-400 font-mono shrink-0">
                            {unitName}
                          </span>
                        </div>

                        <div className="col-span-2 flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={m.wastePercentage || 0}
                            onChange={(e) => {
                              const updated = { ...partsPerSize };
                              updated[activeBomSizeId][pIdx].materials[
                                mIdx
                              ].wastePercentage =
                                parseFloat(e.target.value) || 0;
                              setPartsPerSize(updated);
                            }}
                            placeholder="0"
                            className="w-full px-1.5 py-1 bg-neutral-900 border border-neutral-800 text-[11px] text-neutral-100"
                          />
                          <span className="text-[10px] text-amber-500 font-mono font-bold">
                            % Wst
                          </span>
                        </div>

                        <div className="col-span-2 text-right font-mono text-[11px] text-neutral-300">
                          Rp {formatRupiah(subtotal)}
                        </div>

                        <div className="col-span-1 text-center">
                          <X
                            className="w-3.5 h-3.5 text-neutral-500 hover:text-red-400 cursor-pointer mx-auto"
                            onClick={() => {
                              const updated = { ...partsPerSize };
                              updated[activeBomSizeId][pIdx].materials =
                                updated[activeBomSizeId][pIdx].materials.filter(
                                  (_: any, i: number) => i !== mIdx,
                                );
                              setPartsPerSize(updated);
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
};
