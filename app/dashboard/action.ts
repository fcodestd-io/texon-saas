"use server";

import { db } from "@/db";
import {
  warehouseOutgoingItems,
  warehouseOutgoings,
  warehouseReturnItems,
  warehouseReturns,
  marketplaces,
  productVariants,
  productParts,
  productPartMaterials,
  materials,
  products,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, sql, gte, lte } from "drizzle-orm";

async function getVendorId() {
  const session = await auth();
  return (session?.user as any)?.vendorId || null;
}

export async function getDashboardMetricsAction(
  monthStr: string,
  yearStr: string,
) {
  const vendorId = await getVendorId();
  if (!vendorId) return null;

  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  try {
    // 1. QUERY SALES OUTGOING (OMSET GROSS DIPOTONG FEE MARKETPLACE)
    const [salesSummary] = await db
      .select({
        totalQtySold: sql<string>`COALESCE(SUM(${warehouseOutgoingItems.quantity}), 0)`,
        totalGrossOmset: sql<string>`
          COALESCE(
            SUM(
              ${warehouseOutgoingItems.quantity} * ${productVariants.price} * 
              (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
            ), 
            0
          )`,
      })
      .from(warehouseOutgoingItems)
      .innerJoin(
        warehouseOutgoings,
        eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseOutgoingItems.productVariantId, productVariants.id),
      )
      .leftJoin(
        marketplaces,
        eq(warehouseOutgoings.marketplaceId, marketplaces.id),
      )
      .where(
        and(
          eq(warehouseOutgoings.vendorId, vendorId),
          gte(warehouseOutgoings.createdAt, startDate),
          lte(warehouseOutgoings.createdAt, endDate),
        ),
      );

    // 2. QUERY RETUR PENJUALAN (NOMINAL RETUR DIPOTONG FEE MARKETPLACE)
    const [returnsSummary] = await db
      .select({
        totalQtyReturned: sql<string>`COALESCE(SUM(${warehouseReturnItems.quantity}), 0)`,
        totalReturnOmsetDeduction: sql<string>`
          COALESCE(
            SUM(
              ${warehouseReturnItems.quantity} * ${productVariants.price} * 
              (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
            ), 
            0
          )`,
      })
      .from(warehouseReturnItems)
      .innerJoin(
        warehouseReturns,
        eq(warehouseReturnItems.warehouseReturnId, warehouseReturns.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseReturnItems.productVariantId, productVariants.id),
      )
      .leftJoin(
        marketplaces,
        eq(warehouseReturns.marketplaceId, marketplaces.id),
      )
      .where(
        and(
          eq(warehouseReturns.vendorId, vendorId),
          gte(warehouseReturns.createdAt, startDate),
          lte(warehouseReturns.createdAt, endDate),
        ),
      );

    // 3. KALKULASI HPP PRESISI (BOM + JASA PARTS + FINISHING)
    const partLaborCosts = await db
      .select({
        variantId: productParts.productVariantId,
        totalLaborCost: sql<string>`
          COALESCE(
            SUM(
              COALESCE(${productParts.cuttingPrice}, 0) + 
              COALESCE(${productParts.sewingPrice}, 0) + 
              COALESCE(${productParts.overdeckPrice}, 0) + 
              COALESCE(${productParts.listPrice}, 0)
            ), 
            0
          )
        `,
      })
      .from(productParts)
      .where(eq(productParts.vendorId, vendorId))
      .groupBy(productParts.productVariantId);

    const partBomCosts = await db
      .select({
        variantId: productParts.productVariantId,
        totalBomCost: sql<string>`
          COALESCE(
            SUM(
              ${productPartMaterials.quantity} * 
              (1 + COALESCE(${productPartMaterials.wastePercentage}, 0) / 100) * 
              (
                COALESCE(${materials.purchasePrice}, 0) / 
                NULLIF(COALESCE(${materials.conversionValue}, 1), 0)
              )
            ),
            0
          )
        `,
      })
      .from(productPartMaterials)
      .innerJoin(
        productParts,
        eq(productPartMaterials.productPartId, productParts.id),
      )
      .innerJoin(materials, eq(productPartMaterials.materialId, materials.id))
      .where(eq(productParts.vendorId, vendorId))
      .groupBy(productParts.productVariantId);

    const variantList = await db
      .select({
        id: productVariants.id,
        finishingPrice: productVariants.finishingPrice,
      })
      .from(productVariants)
      .where(eq(productVariants.vendorId, vendorId));

    const hppMap = new Map<string, number>();
    variantList.forEach((v) => {
      const finishing = parseFloat(v.finishingPrice || "0");
      const laborObj = partLaborCosts.find((l) => l.variantId === v.id);
      const labor = parseFloat(laborObj?.totalLaborCost || "0");

      const bomObj = partBomCosts.find((b) => b.variantId === v.id);
      const bom = parseFloat(bomObj?.totalBomCost || "0");

      hppMap.set(v.id, finishing + labor + bom);
    });

    const soldItems = await db
      .select({
        variantId: warehouseOutgoingItems.productVariantId,
        qty: warehouseOutgoingItems.quantity,
      })
      .from(warehouseOutgoingItems)
      .innerJoin(
        warehouseOutgoings,
        eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
      )
      .where(
        and(
          eq(warehouseOutgoings.vendorId, vendorId),
          gte(warehouseOutgoings.createdAt, startDate),
          lte(warehouseOutgoings.createdAt, endDate),
        ),
      );

    const returnedItems = await db
      .select({
        variantId: warehouseReturnItems.productVariantId,
        qty: warehouseReturnItems.quantity,
      })
      .from(warehouseReturnItems)
      .innerJoin(
        warehouseReturns,
        eq(warehouseReturnItems.warehouseReturnId, warehouseReturns.id),
      )
      .where(
        and(
          eq(warehouseReturns.vendorId, vendorId),
          gte(warehouseReturns.createdAt, startDate),
          lte(warehouseReturns.createdAt, endDate),
        ),
      );

    let totalHpp = 0;
    soldItems.forEach((item) => {
      const unitHpp = hppMap.get(item.variantId) || 0;
      totalHpp += unitHpp * parseFloat(item.qty || "0");
    });

    returnedItems.forEach((item) => {
      const unitHpp = hppMap.get(item.variantId) || 0;
      totalHpp -= unitHpp * parseFloat(item.qty || "0");
    });

    // 4. METRIK HARIAN UNTUK CHART (OMSET HARIAN DIKURANGI RETUR HARIAN)
    const dailySales = await db
      .select({
        day: sql<number>`EXTRACT(DAY FROM ${warehouseOutgoings.createdAt})`,
        dailyOmset: sql<string>`
          COALESCE(
            SUM(
              ${warehouseOutgoingItems.quantity} * ${productVariants.price} * 
              (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
            ), 
            0
          )`,
      })
      .from(warehouseOutgoingItems)
      .innerJoin(
        warehouseOutgoings,
        eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseOutgoingItems.productVariantId, productVariants.id),
      )
      .leftJoin(
        marketplaces,
        eq(warehouseOutgoings.marketplaceId, marketplaces.id),
      )
      .where(
        and(
          eq(warehouseOutgoings.vendorId, vendorId),
          gte(warehouseOutgoings.createdAt, startDate),
          lte(warehouseOutgoings.createdAt, endDate),
        ),
      )
      .groupBy(sql`EXTRACT(DAY FROM ${warehouseOutgoings.createdAt})`);

    const dailyReturns = await db
      .select({
        day: sql<number>`EXTRACT(DAY FROM ${warehouseReturns.createdAt})`,
        dailyReturnOmset: sql<string>`
          COALESCE(
            SUM(
              ${warehouseReturnItems.quantity} * ${productVariants.price} * 
              (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
            ), 
            0
          )`,
      })
      .from(warehouseReturnItems)
      .innerJoin(
        warehouseReturns,
        eq(warehouseReturnItems.warehouseReturnId, warehouseReturns.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseReturnItems.productVariantId, productVariants.id),
      )
      .leftJoin(
        marketplaces,
        eq(warehouseReturns.marketplaceId, marketplaces.id),
      )
      .where(
        and(
          eq(warehouseReturns.vendorId, vendorId),
          gte(warehouseReturns.createdAt, startDate),
          lte(warehouseReturns.createdAt, endDate),
        ),
      )
      .groupBy(sql`EXTRACT(DAY FROM ${warehouseReturns.createdAt})`);

    const grossOmset = parseFloat(salesSummary?.totalGrossOmset || "0");
    const returnOmset = parseFloat(
      returnsSummary?.totalReturnOmsetDeduction || "0",
    );
    const netOmset = Math.max(0, grossOmset - returnOmset);

    const netProfit = netOmset - totalHpp;
    const totalQtySold = parseFloat(salesSummary?.totalQtySold || "0");
    const totalQtyReturned = parseFloat(
      returnsSummary?.totalQtyReturned || "0",
    );

    // Array Omset Bersih Harian (Gross - Return per Hari)
    const chartDailyOmset = Array.from({ length: totalDaysInMonth }, () => 0);
    dailySales.forEach((item) => {
      const dayIndex = Number(item.day) - 1;
      if (dayIndex >= 0 && dayIndex < totalDaysInMonth) {
        chartDailyOmset[dayIndex] += parseFloat(item.dailyOmset || "0");
      }
    });

    dailyReturns.forEach((item) => {
      const dayIndex = Number(item.day) - 1;
      if (dayIndex >= 0 && dayIndex < totalDaysInMonth) {
        chartDailyOmset[dayIndex] = Math.max(
          0,
          chartDailyOmset[dayIndex] - parseFloat(item.dailyReturnOmset || "0"),
        );
      }
    });

    return {
      grossOmset,
      returnOmset,
      netOmset,
      totalHpp: Math.max(0, totalHpp),
      netProfit,
      totalQtySold,
      totalQtyReturned,
      totalDaysInMonth,
      chartDailyOmset,
    };
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    return null;
  }
}

export async function getTopProductsPaginatedAction(
  monthStr: string,
  yearStr: string,
  page: number = 1,
  limit: number = 5,
) {
  const vendorId = await getVendorId();
  if (!vendorId) return { items: [], hasMore: false };

  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const offset = (page - 1) * limit;

  try {
    const rawItems = await db
      .select({
        productName: products.name,
        sku: productVariants.sku,
        totalQty: sql<string>`SUM(${warehouseOutgoingItems.quantity})`,
      })
      .from(warehouseOutgoingItems)
      .innerJoin(
        warehouseOutgoings,
        eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseOutgoingItems.productVariantId, productVariants.id),
      )
      .innerJoin(products, eq(productVariants.productId, products.id))
      .where(
        and(
          eq(warehouseOutgoings.vendorId, vendorId),
          gte(warehouseOutgoings.createdAt, startDate),
          lte(warehouseOutgoings.createdAt, endDate),
        ),
      )
      .groupBy(products.name, productVariants.sku)
      .orderBy(sql`SUM(${warehouseOutgoingItems.quantity}) DESC`)
      .limit(limit + 1)
      .offset(offset);

    const hasMore = rawItems.length > limit;
    const items = hasMore ? rawItems.slice(0, limit) : rawItems;

    return {
      items: items.map((i) => ({
        ...i,
        totalQty: parseFloat(i.totalQty || "0"),
      })),
      hasMore,
    };
  } catch (error) {
    console.error("Top Products Error:", error);
    return { items: [], hasMore: false };
  }
}
