import { getPaginatedAttributes } from "./action";
import { AttributeClient } from "./attribute-client";

export const dynamic = "force-dynamic";

export default async function AttributesPage() {
  const [initialUnits, initialSizes, initialColors] = await Promise.all([
    getPaginatedAttributes({ type: "unit", page: 1, limit: 10 }),
    getPaginatedAttributes({ type: "size", page: 1, limit: 10 }),
    getPaginatedAttributes({ type: "color", page: 1, limit: 10 }),
  ]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            MASTER ATTRIBUTES MANAGEMENT
          </span>
          <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Unit, Size & Color
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
          Kelola master acuan satuan, ukuran produk, dan varian warna pabrik
        </p>
      </div>

      <AttributeClient
        initialUnits={initialUnits}
        initialSizes={initialSizes}
        initialColors={initialColors}
      />
    </div>
  );
}
