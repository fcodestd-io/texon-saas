"use server";

import { db } from "@/db";
import {
  marketplaces,
  productVariants,
  products,
  colors,
  sizes,
  warehouseOutgoings,
  warehouseOutgoingItems,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, desc } from "drizzle-orm";

/**
 * 1. Fetch Master Marketplace & Master Varian SKU/Barcode
 */
export async function getOutgoingMasterDataAction() {
  try {
    const session = await auth();
    const vendorId = (session?.user as any)?.vendorId;
    if (!vendorId) return { marketplacesList: [], variantsList: [] };

    const [mktList, varList] = await Promise.all([
      db
        .select({
          id: marketplaces.id,
          name: marketplaces.name,
        })
        .from(marketplaces)
        .where(eq(marketplaces.vendorId, vendorId)),

      db
        .select({
          id: productVariants.id,
          sku: productVariants.sku,
          barcode: productVariants.barcode,
          stock: productVariants.stock,
          productName: products.name,
          colorName: colors.name,
          sizeName: sizes.name,
        })
        .from(productVariants)
        .leftJoin(products, eq(productVariants.productId, products.id))
        .leftJoin(colors, eq(productVariants.colorId, colors.id))
        .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .where(eq(productVariants.vendorId, vendorId)),
    ]);

    return {
      marketplacesList: mktList || [],
      variantsList: (varList || []).map((v) => ({
        ...v,
        color: v.colorName || "-",
        size: v.sizeName || "-",
        stock: parseFloat(v.stock || "0"),
      })),
    };
  } catch (error) {
    console.error("Get Outgoing Master Data Error:", error);
    return { marketplacesList: [], variantsList: [] };
  }
}

/**
 * 2. Fetch Riwayat Transaksi Barang Keluar
 */
export async function getWarehouseOutgoingHistoryAction() {
  try {
    const session = await auth();
    const vendorId = (session?.user as any)?.vendorId;
    if (!vendorId) return [];

    const history = await db
      .select({
        id: warehouseOutgoings.id,
        referenceNumber: warehouseOutgoings.referenceNumber,
        marketplaceName: marketplaces.name,
        notes: warehouseOutgoings.notes,
        createdAt: warehouseOutgoings.createdAt,
      })
      .from(warehouseOutgoings)
      .leftJoin(
        marketplaces,
        eq(warehouseOutgoings.marketplaceId, marketplaces.id),
      )
      .where(eq(warehouseOutgoings.vendorId, vendorId))
      .orderBy(desc(warehouseOutgoings.createdAt));

    const results = [];
    for (const h of history) {
      const items = await db
        .select({
          id: warehouseOutgoingItems.id,
          quantity: warehouseOutgoingItems.quantity,
          stockBefore: warehouseOutgoingItems.stockBefore,
          stockAfter: warehouseOutgoingItems.stockAfter,
          sku: productVariants.sku,
          colorName: colors.name,
          sizeName: sizes.name,
        })
        .from(warehouseOutgoingItems)
        .leftJoin(
          productVariants,
          eq(warehouseOutgoingItems.productVariantId, productVariants.id),
        )
        .leftJoin(colors, eq(productVariants.colorId, colors.id))
        .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .where(eq(warehouseOutgoingItems.warehouseOutgoingId, h.id));

      results.push({ ...h, items: items || [] });
    }

    return results;
  } catch (error) {
    console.error("Get Warehouse Outgoing History Error:", error);
    return [];
  }
}
