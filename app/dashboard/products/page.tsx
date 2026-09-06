import { getPaginatedProducts, getProductOptions } from "./action";
import { ProductClient } from "./product-client";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const [
    initialProducts,
    { colorOptions, sizeOptions, materialOptions, unitOptions },
  ] = await Promise.all([
    getPaginatedProducts({ page: 1, limit: 50 }),
    getProductOptions(),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-6 pb-6 border-b border-neutral-200 dark:border-neutral-800/80">
        <div>
          <span className="text-xs font-extralight tracking-[0.25em] text-neutral-500 uppercase">
            MASTER DATA & PRODUCTION
          </span>
          <h1 className="text-3xl font-extralight tracking-tight text-neutral-900 dark:text-neutral-100 mt-1">
            Products & Bill of Materials (BOM)
          </h1>
        </div>
        <p className="text-xs font-light text-neutral-500 dark:text-neutral-400">
          Kelola master produk, varian SKU, biaya jasa part, BOM bahan baku,
          serta kalkulasi HPP otomatis
        </p>
      </div>

      <ProductClient
        initialProducts={initialProducts || []}
        colorOptions={colorOptions || []}
        sizeOptions={sizeOptions || []}
        materialOptions={materialOptions || []}
        unitOptions={unitOptions || []}
      />
    </div>
  );
}
