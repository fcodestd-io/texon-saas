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
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 1. Fetch Master Produk & Varian untuk Modal Create Target
 */
export async function getMasterProductsForTargetAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    const allProducts = await db
      .select({
        productId: products.id,
        productName: products.name,
      })
      .from(products)
      .where(eq(products.vendorId, vendorId));

    const result = [];
    for (const prod of allProducts) {
      const variants = await db
        .select({
          variantId: productVariants.id,
          sku: productVariants.sku,
          sizeName: sizes.name,
          colorName: colors.name,
        })
        .from(productVariants)
        .innerJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .innerJoin(colors, eq(productVariants.colorId, colors.id))
        .where(eq(productVariants.productId, prod.productId));

      const variantDetails = [];
      for (const v of variants) {
        const parts = await db
          .select({
            id: productParts.id,
            partName: productParts.name,
          })
          .from(productParts)
          .where(eq(productParts.productVariantId, v.variantId));

        variantDetails.push({
          ...v,
          parts:
            parts.length > 0 ? parts : [{ id: null, partName: "Utama / Baju" }],
        });
      }

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
 * 2. Simpan Target Potongan Baru (Status: STARTED)
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
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;

  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };
  if (!data.items || data.items.length === 0)
    return { success: false, message: "Pilih minimal 1 item target." };

  try {
    const targetHeaderId = `ct_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(cuttingTargets).values({
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

      await db.insert(cuttingTargetItems).values({
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

      for (const partName of item.parts) {
        await db.insert(cuttingTargetItemParts).values({
          id: `ctip_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          cuttingTargetItemId: targetItemId,
          partName,
          partTargetQty: item.targetQty.toString(),
        });
      }
    }

    revalidatePath("/supervisor/production/cutting-target");
    return {
      success: true,
      message: "Target potongan berhasil dibuat (Status: STARTED).",
    };
  } catch (error: any) {
    console.error("Create Cutting Target Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal membuat target.",
    };
  }
}

/**
 * 3. Fetch Target Potongan Beserta Progress Real-time Produksi (Cutting, Sewing, Overdeck, & Finishing)
 */
export async function getCuttingTargetsByDateAction(dateStr: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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

    const results = [];
    for (const t of targets) {
      const items = await db
        .select()
        .from(cuttingTargetItems)
        .where(eq(cuttingTargetItems.cuttingTargetId, t.id));

      const itemsWithProgress = [];
      for (const item of items) {
        // Fetch Finishing Qty (Level SKU / Siap Jual)
        const finishingLogs = await db
          .select({
            completedQty: productionLogFinishingItems.completedQty,
          })
          .from(productionLogFinishingItems)
          .where(eq(productionLogFinishingItems.cuttingTargetItemId, item.id));

        const totalFinishedSkuQty = finishingLogs.reduce(
          (sum, l) => sum + parseFloat(l.completedQty || "0"),
          0,
        );

        // Fetch Parts (Level Part)
        const parts = await db
          .select()
          .from(cuttingTargetItemParts)
          .where(eq(cuttingTargetItemParts.cuttingTargetItemId, item.id));

        const partsWithProgress = [];
        for (const pt of parts) {
          const logParts = await db
            .select({
              category: productionLogs.category,
              qty: productionLogParts.qty,
            })
            .from(productionLogParts)
            .innerJoin(
              productionLogs,
              eq(productionLogParts.productionLogId, productionLogs.id),
            )
            .where(eq(productionLogParts.cuttingTargetItemPartId, pt.id));

          const cutQty = logParts
            .filter((l) => l.category === "cutting")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

          const sewQty = logParts
            .filter((l) => l.category === "sewing")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

          const ovdQty = logParts
            .filter((l) => l.category === "overdeck")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

          partsWithProgress.push({
            ...pt,
            cutQty,
            sewQty,
            ovdQty,
          });
        }

        itemsWithProgress.push({
          ...item,
          totalFinishedSkuQty,
          parts: partsWithProgress,
        });
      }

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
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
