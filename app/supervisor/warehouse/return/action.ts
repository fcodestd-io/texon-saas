"use server";

import { db } from "@/db";
import {
  marketplaces,
  productVariants,
  products,
  colors,
  sizes,
  warehouseReturns,
  warehouseReturnItems,
  productStockMovements,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 1. Fetch Master Marketplace & Varian Produk
 */
export async function getReturnMasterDataAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { marketplacesList: [], variantsList: [] };

  try {
    const [mktList, varList] = await Promise.all([
      db
        .select({ id: marketplaces.id, name: marketplaces.name })
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
    console.error("Get Return Master Data Error:", error);
    return { marketplacesList: [], variantsList: [] };
  }
}

/**
 * 2. Submit Transaksi Retur / Barang Kembali
 */
export async function submitWarehouseReturnAction(data: {
  marketplaceId?: string | null;
  notes?: string;
  items: Array<{
    productVariantId: string;
    returnType: "RESTOCK" | "DEFECTIVE";
    quantity: number;
    reason?: string;
  }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;

  if (!userId || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  if (!data.items || data.items.length === 0) {
    return { success: false, message: "Pilih minimal 1 item barang retur." };
  }

  try {
    const retId = `wret_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const refNum = `RET-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      100 + Math.random() * 900,
    )}`;

    await db.insert(warehouseReturns).values({
      id: retId,
      vendorId,
      userId,
      marketplaceId: data.marketplaceId || null,
      referenceNumber: refNum,
      notes: data.notes || null,
    });

    for (const item of data.items) {
      if (item.quantity <= 0) continue;

      const [v] = await db
        .select({ stock: productVariants.stock })
        .from(productVariants)
        .where(eq(productVariants.id, item.productVariantId))
        .limit(1);

      const currentStock = parseFloat(v?.stock || "0");

      // Jika RESTOCK (Bagus), tambahkan ke stok fisik. Jika DEFECTIVE (Cacat), stok fisik tidak berubah.
      const newStock =
        item.returnType === "RESTOCK"
          ? currentStock + item.quantity
          : currentStock;

      await db.insert(warehouseReturnItems).values({
        id: `wreti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        warehouseReturnId: retId,
        productVariantId: item.productVariantId,
        returnType: item.returnType,
        quantity: item.quantity.toString(),
        stockBefore: currentStock.toString(),
        stockAfter: newStock.toString(),
        reason: item.reason || null,
      });

      // Update stok fisik di master jika tipe RESTOCK
      if (item.returnType === "RESTOCK") {
        await db
          .update(productVariants)
          .set({
            stock: newStock.toString(),
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, item.productVariantId));

        // Catat di Kartu Stok
        await db.insert(productStockMovements).values({
          id: `psm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          vendorId,
          productVariantId: item.productVariantId,
          type: "in",
          quantity: item.quantity.toString(),
          stockBefore: currentStock.toString(),
          stockAfter: newStock.toString(),
          referenceType: "WAREHOUSE_RETURN",
          referenceId: retId,
          notes: `Retur Etalase (${refNum}) - ${item.reason || "Kondisi Baik"}`,
        });
      }
    }

    revalidatePath("/supervisor/warehouse/return");
    revalidatePath("/supervisor/warehouse/stock-adjustment");
    return {
      success: true,
      message: "Pencatatan barang retur berhasil disimpan!",
    };
  } catch (error: any) {
    console.error("Submit Warehouse Return Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat barang retur.",
    };
  }
}

/**
 * 3. Fetch Riwayat Retur
 */
export async function getWarehouseReturnHistoryAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    const history = await db
      .select({
        id: warehouseReturns.id,
        referenceNumber: warehouseReturns.referenceNumber,
        marketplaceName: marketplaces.name,
        notes: warehouseReturns.notes,
        createdAt: warehouseReturns.createdAt,
      })
      .from(warehouseReturns)
      .leftJoin(
        marketplaces,
        eq(warehouseReturns.marketplaceId, marketplaces.id),
      )
      .where(eq(warehouseReturns.vendorId, vendorId))
      .orderBy(desc(warehouseReturns.createdAt));

    const results = [];
    for (const h of history) {
      const items = await db
        .select({
          id: warehouseReturnItems.id,
          returnType: warehouseReturnItems.returnType,
          quantity: warehouseReturnItems.quantity,
          stockBefore: warehouseReturnItems.stockBefore,
          stockAfter: warehouseReturnItems.stockAfter,
          reason: warehouseReturnItems.reason,
          sku: productVariants.sku,
          colorName: colors.name,
          sizeName: sizes.name,
        })
        .from(warehouseReturnItems)
        .leftJoin(
          productVariants,
          eq(warehouseReturnItems.productVariantId, productVariants.id),
        )
        .leftJoin(colors, eq(productVariants.colorId, colors.id))
        .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .where(eq(warehouseReturnItems.warehouseReturnId, h.id));

      results.push({ ...h, items: items || [] });
    }

    return results;
  } catch (error) {
    console.error("Get Warehouse Return History Error:", error);
    return [];
  }
}
