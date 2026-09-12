import { getMaterialsForAdjustmentAction } from "./action";
import { MaterialStockAdjustmentClient } from "./material-stock-adjustment-client";

export const dynamic = "force-dynamic";

export default async function MaterialStockAdjustmentPage() {
  const materialsList = await getMaterialsForAdjustmentAction();

  return (
    <div className="p-4 md:p-6">
      <MaterialStockAdjustmentClient initialMaterials={materialsList} />
    </div>
  );
}
