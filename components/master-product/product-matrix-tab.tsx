"use client";

import React from "react";

export interface OptionItem {
  id: string;
  name: string;
}

interface ProductMatrixTabProps {
  sizeOptions: OptionItem[];
  colorOptions: OptionItem[];
  selectedSizes: string[];
  selectedColors: string[];
  toggleSizeSelection: (sId: string) => void;
  toggleColorSelection: (cId: string) => void;
}

export const ProductMatrixTab: React.FC<ProductMatrixTabProps> = ({
  sizeOptions,
  colorOptions,
  selectedSizes,
  selectedColors,
  toggleSizeSelection,
  toggleColorSelection,
}) => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <span className="text-[11px] text-neutral-400 uppercase block font-medium">
          PILIH UKURAN (SIZE) TERSEDIA
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-neutral-800 p-3 bg-neutral-950">
          {sizeOptions.map((s) => {
            const isChecked = selectedSizes.includes(s.id);
            return (
              <label
                key={s.id}
                className={`flex items-center gap-2 text-xs p-2 border cursor-pointer select-none transition-colors ${
                  isChecked
                    ? "bg-neutral-900 border-neutral-600 text-neutral-100 font-semibold"
                    : "border-neutral-900 text-neutral-500 hover:border-neutral-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleSizeSelection(s.id)}
                  className="rounded border-neutral-800 bg-neutral-950"
                />
                {s.name}
              </label>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <span className="text-[11px] text-neutral-400 uppercase block font-medium">
          PILIH WARNA TERSEDIA (VARIAN SETELAN)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border border-neutral-800 p-3 bg-neutral-950">
          {colorOptions.map((c) => {
            const isChecked = selectedColors.includes(c.id);
            return (
              <label
                key={c.id}
                className={`flex items-center gap-2 text-xs p-2 border cursor-pointer select-none transition-colors ${
                  isChecked
                    ? "bg-neutral-900 border-neutral-600 text-neutral-100 font-semibold"
                    : "border-neutral-900 text-neutral-500 hover:border-neutral-800"
                }`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggleColorSelection(c.id)}
                  className="rounded border-neutral-800 bg-neutral-950"
                />
                {c.name}
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
};
