"use server";

import { db } from "@/db";
import {
  materials,
  materialColors,
  colors,
  units,
  materialStockMovements,
  materialStockAdjustments,
  materialStockAdjustmentItems,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc, inArray, aliasedTable } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// Helper internal untuk memastikan angka desimal maksimal 2 digit
function roundTo2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

async function getVendorIdAndUser() {
  try {
    const session = await auth();
    return {
      vendorId: (session?.user as any)?.vendorId || null,
      userId: (session?.user as any)?.id || null,
    };
  } catch (err) {
    console.error("Auth Session Error:", err);
    return { vendorId: null, userId: null };
  }
}

/**
 * 1. Fetch Materials beserta Varian Warna & Detail Satuan
 */
export async function getMaterialsForAdjustmentAction() {
  const { vendorId } = await getVendorIdAndUser();
  if (!vendorId) return [];

  try {
    const purchaseUnits = aliasedTable(units, "purchase_units");
    const baseUnits = aliasedTable(units, "base_units");

    const rawMaterials = await db
      .select({
        id: materials.id,
        name: materials.name,
        category: materials.category,
        purchaseUnitId: materials.purchaseUnitId,
        purchaseUnitName: purchaseUnits.name,
        baseUnitId: materials.baseUnitId,
        baseUnitName: baseUnits.name,
        conversionValue: materials.conversionValue,
        stock: materials.stock, // Dalam SATUAN PAKAI (Base Unit)
      })
      .from(materials)
      .leftJoin(purchaseUnits, eq(materials.purchaseUnitId, purchaseUnits.id))
      .leftJoin(baseUnits, eq(materials.baseUnitId, baseUnits.id))
      .where(eq(materials.vendorId, vendorId))
      .orderBy(materials.name);

    if (rawMaterials.length === 0) return [];

    const materialIds = rawMaterials.map((m) => m.id);

    const rawVariants = await db
      .select({
        id: materialColors.id,
        materialId: materialColors.materialId,
        colorId: materialColors.colorId,
        stock: materialColors.stock, // Dalam SATUAN PAKAI (Base Unit)
        colorName: colors.name,
      })
      .from(materialColors)
      .leftJoin(colors, eq(materialColors.colorId, colors.id))
      .where(
        and(
          eq(materialColors.vendorId, vendorId),
          inArray(materialColors.materialId, materialIds),
        ),
      );

    return rawMaterials.map((m) => {
      const conversionVal = parseFloat(m.conversionValue || "1") || 1;
      const baseStock = roundTo2(parseFloat(m.stock || "0"));
      const vars = rawVariants.filter((v) => v.materialId === m.id);

      return {
        ...m,
        conversionValue: conversionVal,
        stockBase: baseStock,
        // Stok dalam satuan simpan (beli) dibulatkan max 2 desimal
        stockPurchase: roundTo2(baseStock / conversionVal),
        variants: vars.map((v) => {
          const vBaseStock = roundTo2(parseFloat(v.stock || "0"));
          return {
            ...v,
            stockBase: vBaseStock,
            stockPurchase: roundTo2(vBaseStock / conversionVal),
          };
        }),
      };
    });
  } catch (error) {
    console.error("Error getMaterialsForAdjustmentAction:", error);
    return [];
  }
}

/**
 * 2. Submit Action Opname Stok Material
 */
export async function submitMaterialStockAdjustmentAction(data: {
  title: string;
  notes?: string;
  adjustments: {
    materialId: string;
    materialColorId?: string | null;
    systemStockPurchase: number; // Dalam Satuan Beli
    actualStockPurchase: number; // Dalam Satuan Beli
    conversionValue: number;
  }[];
}) {
  const { vendorId, userId } = await getVendorIdAndUser();
  if (!vendorId || !userId) {
    return { success: false, message: "Akses ditolak. Sesi tidak valid." };
  }

  if (
    !data.title?.trim() ||
    !data.adjustments ||
    data.adjustments.length === 0
  ) {
    return { success: false, message: "Judul dan item opname wajib diisi." };
  }

  try {
    await db.transaction(async (tx) => {
      const adjId = `matadj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      // Insert Header
      await tx.insert(materialStockAdjustments).values({
        id: adjId,
        vendorId,
        userId,
        title: data.title.trim(),
        notes: data.notes?.trim() || null,
      });

      for (const item of data.adjustments) {
        const conversionVal = item.conversionValue || 1;

        const systemStockPurchase = roundTo2(item.systemStockPurchase);
        const actualStockPurchase = roundTo2(item.actualStockPurchase);
        const diffPurchase = roundTo2(
          actualStockPurchase - systemStockPurchase,
        );

        // Hitung nilai riil ke Satuan Pakai (Base Unit) & pastikan max 2 desimal
        const actualStockBase = roundTo2(actualStockPurchase * conversionVal);
        const systemStockBase = roundTo2(systemStockPurchase * conversionVal);
        const diffBase = roundTo2(actualStockBase - systemStockBase);

        // Insert Detail Item Audit (Snapshot disimpan max 2 desimal)
        await tx.insert(materialStockAdjustmentItems).values({
          id: `matadjitem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          materialStockAdjustmentId: adjId,
          materialId: item.materialId,
          materialColorId: item.materialColorId || null,
          systemStock: systemStockPurchase.toFixed(2),
          actualStock: actualStockPurchase.toFixed(2),
          difference: diffPurchase.toFixed(2),
        });

        // Update Stok Utama & Record Log Mutasi jika ada selisih
        if (diffBase !== 0) {
          if (item.materialColorId) {
            await tx
              .update(materialColors)
              .set({
                stock: actualStockBase.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(materialColors.id, item.materialColorId));
          } else {
            await tx
              .update(materials)
              .set({
                stock: actualStockBase.toFixed(2),
                updatedAt: new Date(),
              })
              .where(eq(materials.id, item.materialId));
          }

          // Catat Log Mutasi Stok dalam Satuan Pakai (Base Unit)
          await tx.insert(materialStockMovements).values({
            id: `matmov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            vendorId,
            materialId: item.materialId,
            materialColorId: item.materialColorId || null,
            type: "adjustment",
            quantity: diffBase.toFixed(2),
            stockBefore: systemStockBase.toFixed(2),
            stockAfter: actualStockBase.toFixed(2),
            referenceType: "STOCK_ADJUSTMENT",
            referenceId: adjId,
            notes: data.title,
          });
        }
      }
    });

    revalidatePath("/supervisor/production/material-stock-adjustment");
    return {
      success: true,
      message: "Opname stok material berhasil disimpan!",
    };
  } catch (error: any) {
    console.error("Error submitMaterialStockAdjustmentAction:", error);
    return {
      success: false,
      message: error?.message || "Gagal menyimpan opname stok material.",
    };
  }
}

/**
 * 3. Fetch Kartu Stok Material (Per Varian / Induk)
 */
export async function getMaterialStockMovementsAction(params: {
  materialId: string;
  materialColorId?: string | null;
}) {
  const { vendorId } = await getVendorIdAndUser();
  if (!vendorId) return [];

  try {
    const whereConditions = [eq(materialStockMovements.vendorId, vendorId)];

    if (params.materialColorId) {
      whereConditions.push(
        eq(materialStockMovements.materialColorId, params.materialColorId),
      );
    } else {
      whereConditions.push(
        eq(materialStockMovements.materialId, params.materialId),
      );
    }

    const movements = await db
      .select({
        id: materialStockMovements.id,
        type: materialStockMovements.type,
        quantity: materialStockMovements.quantity,
        stockBefore: materialStockMovements.stockBefore,
        stockAfter: materialStockMovements.stockAfter,
        notes: materialStockMovements.notes,
        createdAt: materialStockMovements.createdAt,
      })
      .from(materialStockMovements)
      .where(and(...whereConditions))
      .orderBy(desc(materialStockMovements.createdAt))
      .limit(50);

    return movements.map((m) => ({
      ...m,
      quantity: roundTo2(parseFloat(m.quantity || "0")),
      stockBefore: roundTo2(parseFloat(m.stockBefore || "0")),
      stockAfter: roundTo2(parseFloat(m.stockAfter || "0")),
    }));
  } catch (error) {
    console.error("Error getMaterialStockMovementsAction:", error);
    return [];
  }
}

/**
 * 4. Fetch Histori Audit Opname Material
 */
export async function getMaterialStockAdjustmentHistoryAction() {
  const { vendorId } = await getVendorIdAndUser();
  if (!vendorId) return [];

  try {
    const history = await db
      .select({
        id: materialStockAdjustments.id,
        title: materialStockAdjustments.title,
        notes: materialStockAdjustments.notes,
        createdAt: materialStockAdjustments.createdAt,
      })
      .from(materialStockAdjustments)
      .where(eq(materialStockAdjustments.vendorId, vendorId))
      .orderBy(desc(materialStockAdjustments.createdAt))
      .limit(20);

    if (history.length === 0) return [];

    const adjIds = history.map((h) => h.id);

    const rawItems = await db
      .select({
        id: materialStockAdjustmentItems.id,
        materialStockAdjustmentId:
          materialStockAdjustmentItems.materialStockAdjustmentId,
        materialName: materials.name,
        colorName: colors.name,
        systemStock: materialStockAdjustmentItems.systemStock,
        actualStock: materialStockAdjustmentItems.actualStock,
        difference: materialStockAdjustmentItems.difference,
        purchaseUnitName: units.name,
      })
      .from(materialStockAdjustmentItems)
      .leftJoin(
        materials,
        eq(materialStockAdjustmentItems.materialId, materials.id),
      )
      .leftJoin(
        materialColors,
        eq(materialStockAdjustmentItems.materialColorId, materialColors.id),
      )
      .leftJoin(colors, eq(materialColors.colorId, colors.id))
      .leftJoin(units, eq(materials.purchaseUnitId, units.id))
      .where(
        inArray(materialStockAdjustmentItems.materialStockAdjustmentId, adjIds),
      );

    return history.map((h) => ({
      ...h,
      items: rawItems
        .filter((i) => i.materialStockAdjustmentId === h.id)
        .map((item) => ({
          ...item,
          systemStock: roundTo2(parseFloat(item.systemStock || "0")),
          actualStock: roundTo2(parseFloat(item.actualStock || "0")),
          difference: roundTo2(parseFloat(item.difference || "0")),
        })),
    }));
  } catch (error) {
    console.error("Error getMaterialStockAdjustmentHistoryAction:", error);
    return [];
  }
}
