import { getProductsWithVariantsAction } from "./action";
import { StockAdjustmentPageClient } from "./page-client";

export default async function StockAdjustmentPage() {
  const products = await getProductsWithVariantsAction();

  return <StockAdjustmentPageClient initialProducts={products || []} />;
}
