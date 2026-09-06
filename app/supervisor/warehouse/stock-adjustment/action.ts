"use server";

import { db } from "@/db";
import {
  products,
  productVariants,
  colors,
  sizes,
  stockAdjustments,
  stockAdjustmentItems,
  productStockMovements,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * 1. Fetch Produk beserta Varian SKU, Warna, Size & Stok Saat Ini
 */
export async function getProductsWithVariantsAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    const allProducts = await db
      .select({
        id: products.id,
        name: products.name,
      })
      .from(products)
      .where(eq(products.vendorId, vendorId));

    const results = [];

    for (const prod of allProducts) {
      const variants = await db
        .select({
          id: productVariants.id,
          sku: productVariants.sku,
          stock: productVariants.stock,
          colorName: colors.name,
          sizeName: sizes.name,
        })
        .from(productVariants)
        .leftJoin(colors, eq(productVariants.colorId, colors.id))
        .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .where(
          and(
            eq(productVariants.vendorId, vendorId),
            eq(productVariants.productId, prod.id),
          ),
        );

      results.push({
        ...prod,
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku,
          color: v.colorName || "-",
          size: v.sizeName || "-",
          stock: parseFloat(v.stock || "0"),
        })),
      });
    }

    return results;
  } catch (error) {
    console.error("Get Products With Variants Error:", error);
    return [];
  }
}

/**
 * 2. Submit Penyesuaian Stok Opname Mandor
 */
export async function submitStockAdjustmentAction(data: {
  title: string;
  notes?: string;
  adjustments: Array<{
    productVariantId: string;
    systemStock: number;
    actualStock: number;
  }>;
}) {
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;

  if (!userId || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  if (!data.title.trim()) {
    return { success: false, message: "Judul penyesuaian stok wajib diisi." };
  }

  try {
    const adjId = `adj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Insert Header Opname
    await db.insert(stockAdjustments).values({
      id: adjId,
      vendorId,
      userId,
      title: data.title,
      notes: data.notes || null,
    });

    for (const item of data.adjustments) {
      const diff = item.actualStock - item.systemStock;

      // Insert Detail Adjustment Item
      await db.insert(stockAdjustmentItems).values({
        id: `adji_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        stockAdjustmentId: adjId,
        productVariantId: item.productVariantId,
        systemStock: item.systemStock.toString(),
        actualStock: item.actualStock.toString(),
        difference: diff.toString(),
      });

      // Update Stok Utama di productVariants
      await db
        .update(productVariants)
        .set({
          stock: item.actualStock.toString(),
          updatedAt: new Date(),
        })
        .where(eq(productVariants.id, item.productVariantId));

      // Jika ada selisih, catat ke Kartu Stok (productStockMovements)
      if (Math.abs(diff) > 0.001) {
        await db.insert(productStockMovements).values({
          id: `psm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          vendorId,
          productVariantId: item.productVariantId,
          type: "adjustment",
          quantity: diff.toString(),
          stockBefore: item.systemStock.toString(),
          stockAfter: item.actualStock.toString(),
          referenceType: "STOCK_ADJUSTMENT",
          referenceId: adjId,
          notes: `Opname: ${data.title}`,
        });
      }
    }

    revalidatePath("/supervisor/warehouse/stock-adjustment");
    return { success: true, message: "Penyesuaian stok berhasil disimpan!" };
  } catch (error: any) {
    console.error("Submit Stock Adjustment Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal menyimpan opname stok.",
    };
  }
}

/**
 * 3. Fetch Kartu Stok (Pergerakan Stok Per SKU)
 */
export async function getStockMovementsByVariantAction(
  productVariantId: string,
) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId || !productVariantId) return [];

  try {
    return await db
      .select({
        id: productStockMovements.id,
        type: productStockMovements.type,
        quantity: productStockMovements.quantity,
        stockBefore: productStockMovements.stockBefore,
        stockAfter: productStockMovements.stockAfter,
        referenceType: productStockMovements.referenceType,
        notes: productStockMovements.notes,
        createdAt: productStockMovements.createdAt,
      })
      .from(productStockMovements)
      .where(
        and(
          eq(productStockMovements.vendorId, vendorId),
          eq(productStockMovements.productVariantId, productVariantId),
        ),
      )
      .orderBy(desc(productStockMovements.createdAt));
  } catch (error) {
    console.error("Get Stock Movements Error:", error);
    return [];
  }
}

/**
 * 4. Fetch Riwayat Dokumen Audit Opname
 */
export async function getStockAdjustmentHistoryAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    const history = await db
      .select({
        id: stockAdjustments.id,
        title: stockAdjustments.title,
        notes: stockAdjustments.notes,
        createdAt: stockAdjustments.createdAt,
      })
      .from(stockAdjustments)
      .where(eq(stockAdjustments.vendorId, vendorId))
      .orderBy(desc(stockAdjustments.createdAt));

    const results = [];
    for (const adj of history) {
      const items = await db
        .select({
          id: stockAdjustmentItems.id,
          systemStock: stockAdjustmentItems.systemStock,
          actualStock: stockAdjustmentItems.actualStock,
          difference: stockAdjustmentItems.difference,
          sku: productVariants.sku,
          colorName: colors.name,
          sizeName: sizes.name,
        })
        .from(stockAdjustmentItems)
        .leftJoin(
          productVariants,
          eq(stockAdjustmentItems.productVariantId, productVariants.id),
        )
        .leftJoin(colors, eq(productVariants.colorId, colors.id))
        .leftJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .where(eq(stockAdjustmentItems.stockAdjustmentId, adj.id));

      results.push({ ...adj, items: items || [] });
    }

    return results;
  } catch (error) {
    console.error("Get Stock Adjustment History Error:", error);
    return [];
  }
}
