import { getPaginatedMaterials, getMaterialOptions } from "./action";
import { MaterialClient } from "./material-client";

export const dynamic = "force-dynamic";

export default async function MaterialsPage() {
  const [initialMaterials, { colorOptions, unitOptions }] = await Promise.all([
    getPaginatedMaterials({ page: 1, limit: 50 }),
    getMaterialOptions(),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            MASTER DATA & INVENTORY
          </span>
          <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Raw Materials & Supplies
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
          Kelola data kain, benang, dan aksesoris beserta konversi dan varian
          warna
        </p>
      </div>

      <MaterialClient
        initialMaterials={initialMaterials as any}
        colorOptions={colorOptions}
        unitOptions={unitOptions}
      />
    </div>
  );
}
