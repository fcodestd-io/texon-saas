"use server";

import { db } from "@/db";
import {
  cuttingTargets,
  cuttingTargetItems,
  productVariants,
  colors,
  sizes,
  productionLogs,
  productionLogFinishingItems,
  warehouseIncomings,
  warehouseIncomingItems,
  productStockMovements,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 1. Fetch Agregat SKU Siap Masuk Gudang dari SELURUH Target Aktif
 */
export async function getAllPendingIncomingVariantsAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    // Ambil semua target yang statusnya 'started'
    const activeTargets = await db
      .select({ id: cuttingTargets.id })
      .from(cuttingTargets)
      .where(
        and(
          eq(cuttingTargets.vendorId, vendorId),
          eq(cuttingTargets.status, "started"),
        ),
      );

    if (activeTargets.length === 0) return [];
    const activeTargetIds = activeTargets.map((t) => t.id);

    // Ambil seluruh target items / SKU dari target-target aktif tersebut
    const targetItems = await db
      .select({
        cuttingTargetItemId: cuttingTargetItems.id,
        cuttingTargetId: cuttingTargetItems.cuttingTargetId,
        productVariantId: cuttingTargetItems.productVariantId,
        productName: cuttingTargetItems.productNameSnapshot,
        sku: cuttingTargetItems.skuSnapshot,
        colorName: colors.name,
        sizeName: sizes.name,
        currentVariantStock: productVariants.stock,
      })
      .from(cuttingTargetItems)
      .leftJoin(
        productVariants,
        eq(cuttingTargetItems.productVariantId, productVariants.id),
      )
      .leftJoin(colors, eq(productVariants.colorId, colors.id))
      .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .where(inArray(cuttingTargetItems.cuttingTargetId, activeTargetIds));

    // Map untuk Agregat berdasarkan productVariantId
    const variantMap = new Map<string, any>();

    for (const item of targetItems) {
      // 1. Total Qty Setelan Lolos Finishing untuk item ini
      const finishingLogs = await db
        .select({
          completedQty: productionLogFinishingItems.completedQty,
        })
        .from(productionLogFinishingItems)
        .leftJoin(
          productionLogs,
          eq(productionLogFinishingItems.productionLogId, productionLogs.id),
        )
        .where(
          and(
            eq(productionLogs.vendorId, vendorId),
            eq(productionLogs.cuttingTargetId, item.cuttingTargetId),
            eq(
              productionLogFinishingItems.cuttingTargetItemId,
              item.cuttingTargetItemId,
            ),
          ),
        );

      const totalFinishedQty = finishingLogs.reduce(
        (sum, l) => sum + parseFloat(l.completedQty || "0"),
        0,
      );

      // 2. Total Qty yang SUDAH Pernah Masuk Gudang
      const incomingLogs = await db
        .select({
          qty: warehouseIncomingItems.quantity,
        })
        .from(warehouseIncomingItems)
        .leftJoin(
          warehouseIncomings,
          eq(warehouseIncomingItems.warehouseIncomingId, warehouseIncomings.id),
        )
        .where(
          and(
            eq(warehouseIncomings.vendorId, vendorId),
            eq(warehouseIncomings.cuttingTargetId, item.cuttingTargetId),
            eq(warehouseIncomingItems.productVariantId, item.productVariantId),
          ),
        );

      const totalAlreadyIncomingQty = incomingLogs.reduce(
        (sum, l) => sum + parseFloat(l.qty || "0"),
        0,
      );

      const availableToReceive = totalFinishedQty - totalAlreadyIncomingQty;

      if (availableToReceive > 0.01) {
        const key = item.productVariantId;
        if (!variantMap.has(key)) {
          variantMap.set(key, {
            productVariantId: item.productVariantId,
            targetIds: [item.cuttingTargetId],
            productName: item.productName,
            sku: item.sku,
            color: item.colorName || "-",
            size: item.sizeName || "-",
            availableQty: availableToReceive,
            inputQty: availableToReceive,
            currentVariantStock: parseFloat(item.currentVariantStock || "0"),
          });
        } else {
          const existing = variantMap.get(key);
          existing.availableQty += availableToReceive;
          existing.inputQty += availableToReceive;
          if (!existing.targetIds.includes(item.cuttingTargetId)) {
            existing.targetIds.push(item.cuttingTargetId);
          }
        }
      }
    }

    return Array.from(variantMap.values());
  } catch (error) {
    console.error("Get All Pending Incoming Variants Error:", error);
    return [];
  }
}

/**
 * 2. Submit Transaksi Produk Masuk Gudang (Agregat All Targets)
 */
export async function submitGlobalWarehouseIncomingAction(data: {
  notes?: string;
  items: Array<{
    productVariantId: string;
    targetIds: string[];
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
      message: "Pilih minimal 1 barang untuk dimasukkan.",
    };
  }

  try {
    const incId = `winc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const refNum = `IN-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
      100 + Math.random() * 900,
    )}`;

    // Gunakan target pertama sebagai acuan header (atau default)
    const primaryTargetId = data.items[0]?.targetIds?.[0] || "";

    await db.insert(warehouseIncomings).values({
      id: incId,
      vendorId,
      userId,
      cuttingTargetId: primaryTargetId,
      referenceNumber: refNum,
      notes: data.notes || null,
    });

    for (const item of data.items) {
      if (item.quantity <= 0) continue;

      await db.insert(warehouseIncomingItems).values({
        id: `winci_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        warehouseIncomingId: incId,
        productVariantId: item.productVariantId,
        quantity: item.quantity.toString(),
      });

      const [v] = await db
        .select({ stock: productVariants.stock })
        .from(productVariants)
        .where(eq(productVariants.id, item.productVariantId))
        .limit(1);

      const currentStock = parseFloat(v?.stock || "0");
      const newStock = currentStock + item.quantity;

      await db
        .update(productVariants)
        .set({
          stock: newStock.toString(),
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, item.productVariantId));

      await db.insert(productStockMovements).values({
        id: `psm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        vendorId,
        productVariantId: item.productVariantId,
        type: "in",
        quantity: item.quantity.toString(),
        stockBefore: currentStock.toString(),
        stockAfter: newStock.toString(),
        referenceType: "WAREHOUSE_INCOMING",
        referenceId: incId,
        notes: `Produk Masuk Gudang (${refNum})`,
      });
    }

    revalidatePath("/supervisor/warehouse/incoming");
    revalidatePath("/supervisor/warehouse/stock-adjustment");
    return {
      success: true,
      message: "Produk berhasil diterima ke stok gudang!",
    };
  } catch (error: any) {
    console.error("Submit Global Warehouse Incoming Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat barang masuk.",
    };
  }
}

/**
 * 3. Fetch Riwayat Transaksi Produk Masuk
 */
export async function getWarehouseIncomingHistoryAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    const history = await db
      .select({
        id: warehouseIncomings.id,
        referenceNumber: warehouseIncomings.referenceNumber,
        notes: warehouseIncomings.notes,
        createdAt: warehouseIncomings.createdAt,
      })
      .from(warehouseIncomings)
      .where(eq(warehouseIncomings.vendorId, vendorId))
      .orderBy(desc(warehouseIncomings.createdAt));

    const results = [];
    for (const h of history) {
      const items = await db
        .select({
          id: warehouseIncomingItems.id,
          quantity: warehouseIncomingItems.quantity,
          sku: productVariants.sku,
          colorName: colors.name,
          sizeName: sizes.name,
        })
        .from(warehouseIncomingItems)
        .leftJoin(
          productVariants,
          eq(warehouseIncomingItems.productVariantId, productVariants.id),
        )
        .leftJoin(colors, eq(productVariants.colorId, colors.id))
        .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .where(eq(warehouseIncomingItems.warehouseIncomingId, h.id));

      results.push({ ...h, items: items || [] });
    }

    return results;
  } catch (error) {
    console.error("Get Warehouse Incoming History Error:", error);
    return [];
  }
}
