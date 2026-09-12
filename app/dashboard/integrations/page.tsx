import { getMarketplacesData } from "./action";
import { IntegrationClient } from "./integration-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { marketplacesList } = await getMarketplacesData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 tracking-wider uppercase">
          INTEGRASI MARKETPLACE
        </h1>
        <p className="text-xs text-neutral-500 font-light">
          Kelola master marketplace dan persentase potongan biaya admin untuk
          pencatatan transaksi penjualan.
        </p>
      </div>

      <IntegrationClient initialMarketplaces={marketplacesList} />
    </div>
  );
}
