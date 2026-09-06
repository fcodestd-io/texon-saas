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
  productStockMovements,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 1. Fetch Master Marketplace & Master Varian SKU/Barcode
 */
export async function getOutgoingMasterDataAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { marketplacesList: [], variantsList: [] };

  try {
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
 * 2. Submit Transaksi Barang Keluar
 */
export async function submitWarehouseOutgoingAction(data: {
  marketplaceId?: string | null;
  notes?: string;
  items: Array<{
    productVariantId: string;
    quantity: number;
  }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;

  if (!userId || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  if (!data.items || data.items.length === 0) {
    return {
      success: false,
      message: "Pilih/Scan minimal 1 item barang keluar.",
    };
  }

  try {
    const outId = `wout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const refNum = `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      100 + Math.random() * 900,
    )}`;

    await db.insert(warehouseOutgoings).values({
      id: outId,
      vendorId,
      userId,
      marketplaceId: data.marketplaceId || null,
      referenceNumber: refNum,
      notes: data.notes || null,
    });

    for (const item of data.items) {
      if (item.quantity <= 0) continue;

      // Fetch stok terkini
      const [v] = await db
        .select({ stock: productVariants.stock })
        .from(productVariants)
        .where(eq(productVariants.id, item.productVariantId))
        .limit(1);

      const currentStock = parseFloat(v?.stock || "0");
      const newStock = Math.max(0, currentStock - item.quantity);

      // Insert Detail Outgoing Item
      await db.insert(warehouseOutgoingItems).values({
        id: `wouti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        warehouseOutgoingId: outId,
        productVariantId: item.productVariantId,
        quantity: item.quantity.toString(),
        stockBefore: currentStock.toString(),
        stockAfter: newStock.toString(),
      });

      // Update Potong Stok Utama
      await db
        .update(productVariants)
        .set({
          stock: newStock.toString(),
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, item.productVariantId));

      // Record Kartu Stok Movement (OUT)
      await db.insert(productStockMovements).values({
        id: `psm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        vendorId,
        productVariantId: item.productVariantId,
        type: "out",
        quantity: (-item.quantity).toString(),
        stockBefore: currentStock.toString(),
        stockAfter: newStock.toString(),
        referenceType: "WAREHOUSE_OUTGOING",
        referenceId: outId,
        notes: `Pengeluaran Barang (${refNum})`,
      });
    }

    revalidatePath("/supervisor/warehouse/outgoing");
    revalidatePath("/supervisor/warehouse/stock-adjustment");
    return {
      success: true,
      message: "Pengeluaran barang berhasil disimpan dan stok dipotong!",
    };
  } catch (error: any) {
    console.error("Submit Warehouse Outgoing Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat barang keluar.",
    };
  }
}

/**
 * 3. Fetch Riwayat Transaksi Barang Keluar
 */
export async function getWarehouseOutgoingHistoryAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
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
