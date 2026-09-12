"use server";

import { db } from "@/db";
import {
  cuttingTargets,
  cuttingTargetItems,
  cuttingTargetItemParts,
  productionLogs,
  productionLogParts,
  productionLogFinishingItems,
  products,
  productVariants,
  productParts,
  sizes,
  colors,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Helper untuk mendapatkan vendorId dan userId
 */
async function getVendorAndUser() {
  try {
    const session = await auth();
    return {
      vendorId: (session?.user as any)?.vendorId || null,
      userId: session?.user?.id || null,
    };
  } catch (err) {
    console.error("Auth Session Error:", err);
    return { vendorId: null, userId: null };
  }
}

/**
 * 1. Fetch Master Produk & Varian untuk Modal Create Target
 */
export async function getMasterProductsForTargetAction() {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const allProducts = await db
      .select({
        productId: products.id,
        productName: products.name,
      })
      .from(products)
      .where(eq(products.vendorId, vendorId));

    if (allProducts.length === 0) return [];

    const productIds = allProducts.map((p) => p.productId);

    // Fetch semua varian produk
    const rawVariants = await db
      .select({
        variantId: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        sizeName: sizes.name,
        colorName: colors.name,
      })
      .from(productVariants)
      .innerJoin(sizes, eq(productVariants.sizeId, sizes.id))
      .innerJoin(colors, eq(productVariants.colorId, colors.id))
      .where(
        and(
          eq(productVariants.vendorId, vendorId),
          inArray(productVariants.productId, productIds),
        ),
      );

    if (rawVariants.length === 0) return [];

    const variantIds = rawVariants.map((v) => v.variantId);

    // Fetch semua parts produk
    const rawParts = await db
      .select({
        id: productParts.id,
        productVariantId: productParts.productVariantId,
        partName: productParts.name,
      })
      .from(productParts)
      .where(
        and(
          eq(productParts.vendorId, vendorId),
          inArray(productParts.productVariantId, variantIds),
        ),
      );

    const result = [];

    for (const prod of allProducts) {
      const prodVariants = rawVariants.filter(
        (v) => v.productId === prod.productId,
      );

      const variantDetails = prodVariants.map((v) => {
        const parts = rawParts.filter(
          (pt) => pt.productVariantId === v.variantId,
        );
        return {
          ...v,
          parts:
            parts.length > 0 ? parts : [{ id: null, partName: "Utama / Baju" }],
        };
      });

      if (variantDetails.length > 0) {
        result.push({
          productId: prod.productId,
          productName: prod.productName,
          variants: variantDetails,
        });
      }
    }

    return result;
  } catch (error) {
    console.error("Get Master Products Error:", error);
    return [];
  }
}

/**
 * 2. Simpan Target Potongan Baru (Status: STARTED) Tanpa Memotong Stok Bahan Baku
 */
export async function createCuttingTargetAction(data: {
  targetDate: string;
  title: string;
  notes?: string;
  items: Array<{
    productId: string;
    productVariantId: string;
    productNameSnapshot: string;
    sizeSnapshot: string;
    colorSnapshot: string;
    skuSnapshot: string;
    targetQty: number;
    parts: string[];
  }>;
}) {
  const { vendorId, userId } = await getVendorAndUser();

  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };
  if (!data.items || data.items.length === 0)
    return { success: false, message: "Pilih minimal 1 item target." };

  try {
    await db.transaction(async (tx) => {
      const targetHeaderId = `ct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // 1. Insert Header Target Potongan
      await tx.insert(cuttingTargets).values({
        id: targetHeaderId,
        vendorId,
        userId,
        targetDate: data.targetDate,
        title: data.title || `Target Potongan - ${data.targetDate}`,
        status: "started",
        notes: data.notes || "",
      });

      for (const item of data.items) {
        const targetItemId = `cti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        // 2. Insert Item Target Potongan
        await tx.insert(cuttingTargetItems).values({
          id: targetItemId,
          cuttingTargetId: targetHeaderId,
          productId: item.productId,
          productVariantId: item.productVariantId,
          productNameSnapshot: item.productNameSnapshot,
          sizeSnapshot: item.sizeSnapshot,
          colorSnapshot: item.colorSnapshot,
          skuSnapshot: item.skuSnapshot,
          targetQty: item.targetQty.toString(),
        });

        // 3. Insert Parts Target Potongan
        for (const partName of item.parts) {
          await tx.insert(cuttingTargetItemParts).values({
            id: `ctip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            cuttingTargetItemId: targetItemId,
            partName,
            partTargetQty: item.targetQty.toString(),
          });
        }
      }
    });

    revalidatePath("/supervisor/production/cutting-target");
    return {
      success: true,
      message: "Target potongan berhasil dibuat.",
    };
  } catch (error: any) {
    console.error("Create Cutting Target Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal membuat target potongan.",
    };
  }
}

/**
 * 3. Fetch Target Potongan Beserta Progress Real-time Produksi
 */
export async function getCuttingTargetsByDateAction(dateStr: string) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const targets = await db
      .select()
      .from(cuttingTargets)
      .where(
        and(
          eq(cuttingTargets.vendorId, vendorId),
          eq(cuttingTargets.targetDate, dateStr),
        ),
      )
      .orderBy(desc(cuttingTargets.createdAt));

    if (targets.length === 0) return [];

    const targetIds = targets.map((t) => t.id);

    const items = await db
      .select()
      .from(cuttingTargetItems)
      .where(inArray(cuttingTargetItems.cuttingTargetId, targetIds));

    const itemIds = items.map((i) => i.id);

    // Fetch Finishing Qty
    const finishingLogs =
      itemIds.length > 0
        ? await db
            .select({
              cuttingTargetItemId:
                productionLogFinishingItems.cuttingTargetItemId,
              completedQty: productionLogFinishingItems.completedQty,
            })
            .from(productionLogFinishingItems)
            .where(
              inArray(productionLogFinishingItems.cuttingTargetItemId, itemIds),
            )
        : [];

    // Fetch Parts
    const parts =
      itemIds.length > 0
        ? await db
            .select()
            .from(cuttingTargetItemParts)
            .where(inArray(cuttingTargetItemParts.cuttingTargetItemId, itemIds))
        : [];

    const partIds = parts.map((p) => p.id);

    // Fetch Log Parts Progress
    const logParts =
      partIds.length > 0
        ? await db
            .select({
              cuttingTargetItemPartId:
                productionLogParts.cuttingTargetItemPartId,
              category: productionLogs.category,
              qty: productionLogParts.qty,
            })
            .from(productionLogParts)
            .innerJoin(
              productionLogs,
              eq(productionLogParts.productionLogId, productionLogs.id),
            )
            .where(inArray(productionLogParts.cuttingTargetItemPartId, partIds))
        : [];

    const results = [];

    for (const t of targets) {
      const targetItems = items.filter((i) => i.cuttingTargetId === t.id);

      const itemsWithProgress = targetItems.map((item) => {
        const itemFinishing = finishingLogs.filter(
          (f) => f.cuttingTargetItemId === item.id,
        );
        const totalFinishedSkuQty = itemFinishing.reduce(
          (sum, l) => sum + parseFloat(l.completedQty || "0"),
          0,
        );

        const itemParts = parts.filter(
          (pt) => pt.cuttingTargetItemId === item.id,
        );

        const partsWithProgress = itemParts.map((pt) => {
          const ptLogs = logParts.filter(
            (l) => l.cuttingTargetItemPartId === pt.id,
          );

          const cutQty = ptLogs
            .filter((l) => l.category === "cutting")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

          const sewQty = ptLogs
            .filter((l) => l.category === "sewing")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

          const ovdQty = ptLogs
            .filter((l) => l.category === "overdeck")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

          return {
            ...pt,
            cutQty,
            sewingQty: sewQty,
            ovdQty,
          };
        });

        return {
          ...item,
          totalFinishedSkuQty,
          parts: partsWithProgress,
        };
      });

      results.push({ ...t, items: itemsWithProgress });
    }

    return results;
  } catch (error) {
    console.error("Get Cutting Targets Error:", error);
    return [];
  }
}

/**
 * 4. Closing Target Potongan (Status: FINISHED)
 */
export async function finishCuttingTargetAction(targetId: string) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    await db
      .update(cuttingTargets)
      .set({
        status: "finished",
        finishedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cuttingTargets.id, targetId),
          eq(cuttingTargets.vendorId, vendorId),
        ),
      );

    revalidatePath("/supervisor/production/cutting-target");
    return {
      success: true,
      message: "Target potongan berhasil diselesaikan (CLOSED).",
    };
  } catch (error: any) {
    console.error("Finish Target Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal menyelesaikan target.",
    };
  }
}

/**
 * 5. Pembatalan Target (Status: CANCELED)
 */
export async function cancelCuttingTargetAction(targetId: string) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    await db
      .update(cuttingTargets)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(cuttingTargets.id, targetId),
          eq(cuttingTargets.vendorId, vendorId),
        ),
      );

    revalidatePath("/supervisor/production/cutting-target");
    return { success: true, message: "Target potongan berhasil dibatalkan." };
  } catch (error: any) {
    console.error("Cancel Target Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal membatalkan target.",
    };
  }
}
