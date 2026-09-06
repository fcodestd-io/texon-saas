import { getIntegrationsData } from "./action";
import { IntegrationClient } from "./integration-client";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const { couriersList, marketplacesList } = await getIntegrationsData();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-lg font-medium text-neutral-900 dark:text-neutral-100 tracking-wider uppercase">
          INTEGRASI EKSPEDISI & MARKETPLACE
        </h1>
        <p className="text-xs text-neutral-500 font-light">
          Kelola ekspedisi pengiriman, awalan resi, biaya admin marketplace,
          serta relasi ekspedisi bawaannya.
        </p>
      </div>

      <IntegrationClient
        initialCouriers={couriersList}
        initialMarketplaces={marketplacesList}
      />
    </div>
  );
}
