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
  cuttingTargets,
  cuttingTargetItems,
  cuttingTargetItemParts,
  productionLogs,
  productionLogParts,
  productionLogFinishingItems,
  productParts,
  productPartMaterials,
  employees,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc, inArray, aliasedTable, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { alias } from "drizzle-orm/pg-core";

// ==========================================
// HELPER UTILS & AUTH
// ==========================================

// Helper internal pembulatan desimal maksimal 2 digit
function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

// Helper Auth Session
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

// ==========================================
// 1. RAW MATERIAL CONTROL & OPNAME ACTIONS
// ==========================================

/**
 * Fetch Materials beserta Varian Warna & Detail Satuan
 */
export async function getMaterialsForAdjustmentAction() {
  const { vendorId } = await getVendorAndUser();
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
 * Submit Action Opname Stok Material
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
  const { vendorId, userId } = await getVendorAndUser();
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

        const actualStockBase = roundTo2(actualStockPurchase * conversionVal);
        const systemStockBase = roundTo2(systemStockPurchase * conversionVal);
        const diffBase = roundTo2(actualStockBase - systemStockBase);

        // Insert Detail Item Audit
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
 * Fetch Kartu Stok Material (Per Varian / Induk)
 */
export async function getMaterialStockMovementsAction(params: {
  materialId: string;
  materialColorId?: string | null;
}) {
  const { vendorId } = await getVendorAndUser();
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
 * Fetch Histori Audit Opname Material
 */
export async function getMaterialStockAdjustmentHistoryAction() {
  const { vendorId } = await getVendorAndUser();
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

// ==========================================
// 2. PRODUCTION TRACKING & DEDUCTION ACTIONS
// ==========================================

/**
 * Helper Potong Stok Presisi Sesuai Kategori Material & Pencocokan Warna Fleksibel
 * Mendukung Aturan Warna Baris Part: `fixed_color` & `matching_sku`
 */
async function deductMaterialStockWithCategoryAndConversion(
  tx: any,
  vendorId: string,
  cuttingTargetItemPartId: string,
  processedQty: number,
  allowedCategories: ("fabric" | "thread" | "accessory")[],
  referenceType: string,
  referenceId: string,
  actionNotes: string,
) {
  if (processedQty <= 0) return;

  // 1. Ambil Detail Part, Snapshot Produk, & Snapshot Warna
  const [targetPartInfo] = await tx
    .select({
      partName: cuttingTargetItemParts.partName,
      productVariantId: cuttingTargetItems.productVariantId,
      productId: cuttingTargetItems.productId,
      productNameSnapshot: cuttingTargetItems.productNameSnapshot,
      colorSnapshot: cuttingTargetItems.colorSnapshot,
      sizeSnapshot: cuttingTargetItems.sizeSnapshot,
    })
    .from(cuttingTargetItemParts)
    .innerJoin(
      cuttingTargetItems,
      eq(cuttingTargetItemParts.cuttingTargetItemId, cuttingTargetItems.id),
    )
    .where(eq(cuttingTargetItemParts.id, cuttingTargetItemPartId));

  if (!targetPartInfo) return;

  // 2. Lookup Material BOM beserta informasi colorMode & fixedColorId di level part
  let bomMaterials = await tx
    .select({
      materialId: productPartMaterials.materialId,
      materialColorId: productPartMaterials.materialColorId,
      quantity: productPartMaterials.quantity,
      wastePercentage: productPartMaterials.wastePercentage,
      category: materials.category,
      materialName: materials.name,
      colorMode: productParts.colorMode,
      fixedColorId: productParts.fixedColorId,
    })
    .from(productPartMaterials)
    .innerJoin(
      productParts,
      eq(productPartMaterials.productPartId, productParts.id),
    )
    .innerJoin(materials, eq(productPartMaterials.materialId, materials.id))
    .where(
      and(
        eq(productPartMaterials.vendorId, vendorId),
        eq(productParts.productVariantId, targetPartInfo.productVariantId),
        eq(productParts.name, targetPartInfo.partName),
      ),
    );

  // Fallback ke BOM Varian jika Nama Part tidak match presisi
  if (bomMaterials.length === 0) {
    bomMaterials = await tx
      .select({
        materialId: productPartMaterials.materialId,
        materialColorId: productPartMaterials.materialColorId,
        quantity: productPartMaterials.quantity,
        wastePercentage: productPartMaterials.wastePercentage,
        category: materials.category,
        materialName: materials.name,
        colorMode: productParts.colorMode,
        fixedColorId: productParts.fixedColorId,
      })
      .from(productPartMaterials)
      .innerJoin(
        productParts,
        eq(productPartMaterials.productPartId, productParts.id),
      )
      .innerJoin(materials, eq(productPartMaterials.materialId, materials.id))
      .where(
        and(
          eq(productPartMaterials.vendorId, vendorId),
          eq(productParts.productVariantId, targetPartInfo.productVariantId),
        ),
      );
  }

  const filteredMaterials = bomMaterials.filter((m: any) =>
    allowedCategories.includes(m.category as any),
  );

  if (filteredMaterials.length === 0) return;

  for (const mat of filteredMaterials) {
    if (!mat.materialId) continue;

    let targetMaterialColorId = mat.materialColorId;

    // 3. Penentuan Varian Warna Berdasarkan Aturan Part (Fixed vs Dinamis)
    if (!targetMaterialColorId) {
      let targetColorIdToSearch: string | null = null;

      if (mat.colorMode === "fixed_color" && mat.fixedColorId) {
        // Skema A: Part diset Fixed Color (misal: Kerudung / Celana = Hitam)
        targetColorIdToSearch = mat.fixedColorId;
      } else if (targetPartInfo.colorSnapshot) {
        // Skema B: Part diset Dinamis (matching_sku), cari ID Warna berdasarkan nama snapshot SKU
        const [matchedMasterColor] = await tx
          .select({ id: colors.id })
          .from(colors)
          .where(
            and(
              eq(colors.vendorId, vendorId),
              ilike(colors.name, targetPartInfo.colorSnapshot.trim()),
            ),
          )
          .limit(1);

        if (matchedMasterColor) {
          targetColorIdToSearch = matchedMasterColor.id;
        }
      }

      // Cari ID Relasi `materialColors` berdasarkan `materialId` dan `colorId`
      if (targetColorIdToSearch) {
        const [matchedMaterialColor] = await tx
          .select({ id: materialColors.id })
          .from(materialColors)
          .where(
            and(
              eq(materialColors.vendorId, vendorId),
              eq(materialColors.materialId, mat.materialId),
              eq(materialColors.colorId, targetColorIdToSearch),
            ),
          )
          .limit(1);

        if (matchedMaterialColor) {
          targetMaterialColorId = matchedMaterialColor.id;
        }
      }

      // Fallback: Jika tidak terikat varian warna khusus, ambil varian pertama jika ada
      if (!targetMaterialColorId) {
        const [fallbackMatColor] = await tx
          .select({ id: materialColors.id })
          .from(materialColors)
          .where(
            and(
              eq(materialColors.vendorId, vendorId),
              eq(materialColors.materialId, mat.materialId),
            ),
          )
          .limit(1);

        if (fallbackMatColor) {
          targetMaterialColorId = fallbackMatColor.id;
        }
      }
    }

    const qtyPerSetInUsageUnit = parseFloat(mat.quantity || "0");
    const wastePct = parseFloat(mat.wastePercentage || "0");

    // Pemakaian dalam Satuan Pakai (Base Unit)
    const totalDeductionBaseUnit = roundTo2(
      processedQty * qtyPerSetInUsageUnit * (1 + wastePct / 100),
    );

    if (totalDeductionBaseUnit <= 0) continue;

    let stockBefore = 0;
    let stockAfter = 0;

    // 4. Eksekusi Potong Stok Varian Warna / Induk Material
    if (targetMaterialColorId) {
      const [colorRecord] = await tx
        .select({ stock: materialColors.stock })
        .from(materialColors)
        .where(eq(materialColors.id, targetMaterialColorId));

      stockBefore = roundTo2(parseFloat(colorRecord?.stock || "0"));
      stockAfter = roundTo2(stockBefore - totalDeductionBaseUnit);

      await tx
        .update(materialColors)
        .set({
          stock: stockAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(materialColors.id, targetMaterialColorId));
    } else {
      const [matRecord] = await tx
        .select({ stock: materials.stock })
        .from(materials)
        .where(eq(materials.id, mat.materialId));

      stockBefore = roundTo2(parseFloat(matRecord?.stock || "0"));
      stockAfter = roundTo2(stockBefore - totalDeductionBaseUnit);

      await tx
        .update(materials)
        .set({
          stock: stockAfter.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(materials.id, mat.materialId));
    }

    // 5. Format Keterangan Kartu Stok
    const formattedNote = `${actionNotes} - ${targetPartInfo.productNameSnapshot} (${targetPartInfo.partName})`;

    // Insert Log Mutasi Stok (Out)
    await tx.insert(materialStockMovements).values({
      id: `msm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      vendorId,
      materialId: mat.materialId,
      materialColorId: targetMaterialColorId || null,
      type: "out",
      quantity: (-totalDeductionBaseUnit).toFixed(2),
      stockBefore: stockBefore.toFixed(2),
      stockAfter: stockAfter.toFixed(2),
      referenceType,
      referenceId,
      notes: formattedNote,
    });
  }
}

/**
 * Submit Record Cutting (HANYA MEMOTONG KAIN / FABRIC)
 */
export async function submitCuttingProcessAction(data: {
  cuttingTargetId: string;
  cutterEmployeeId: string;
  sewerEmployeeId: string;
  items: Array<{
    cuttingTargetItemId: string;
    cuttingTargetItemPartId: string;
    productPartId?: string | null;
    qty: number;
  }>;
}) {
  const { vendorId, userId } = await getVendorAndUser();
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak. Sesi tidak valid." };

  try {
    await db.transaction(async (tx) => {
      const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await tx.insert(productionLogs).values({
        id: logId,
        vendorId,
        userId,
        cuttingTargetId: data.cuttingTargetId,
        category: "cutting",
        employeeId: data.cutterEmployeeId,
        nextEmployeeId: data.sewerEmployeeId,
      });

      for (const item of data.items) {
        if (item.qty <= 0) continue;

        await deductMaterialStockWithCategoryAndConversion(
          tx,
          vendorId,
          item.cuttingTargetItemPartId,
          roundTo2(item.qty),
          ["fabric"],
          "PRODUCTION_CUTTING",
          logId,
          "Pemotongan Bahan (Cutting)",
        );

        await tx.insert(productionLogParts).values({
          id: `plp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productionLogId: logId,
          cuttingTargetItemId: item.cuttingTargetItemId,
          cuttingTargetItemPartId: item.cuttingTargetItemPartId,
          productPartId: item.productPartId || null,
          qty: roundTo2(item.qty).toFixed(2),
          defectNotes: null,
        });
      }
    });

    revalidatePath("/supervisor/production/tracking");
    revalidatePath("/supervisor/production/material-stock-adjustment");

    return {
      success: true,
      message:
        "Proses cutting berhasil dicatat, kain terpotong & kartu stok tercatat!",
    };
  } catch (error: any) {
    console.error("Cutting Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat cutting.",
    };
  }
}

/**
 * Submit Record Sewing (HANYA MEMOTONG BENANG & AKSESORIS)
 */
export async function submitSewingProcessAction(data: {
  cuttingTargetId: string;
  sewerEmployeeId: string;
  nextOverdeckEmployeeId?: string | null;
  items: Array<{
    cuttingTargetItemId: string;
    cuttingTargetItemPartId: string;
    productPartId?: string | null;
    qty: number;
    defectQty?: number;
    defectNotes?: string | null;
  }>;
}) {
  const { vendorId, userId } = await getVendorAndUser();
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak. Sesi tidak valid." };

  try {
    await db.transaction(async (tx) => {
      const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await tx.insert(productionLogs).values({
        id: logId,
        vendorId,
        userId,
        cuttingTargetId: data.cuttingTargetId,
        category: "sewing",
        employeeId: data.sewerEmployeeId,
        nextEmployeeId: data.nextOverdeckEmployeeId || null,
      });

      for (const item of data.items) {
        const goodQty = roundTo2(item.qty || 0);
        const badQty = roundTo2(item.defectQty || 0);
        const totalProcessedQty = roundTo2(goodQty + badQty);

        if (totalProcessedQty <= 0) continue;

        await deductMaterialStockWithCategoryAndConversion(
          tx,
          vendorId,
          item.cuttingTargetItemPartId,
          totalProcessedQty,
          ["thread", "accessory"],
          "PRODUCTION_SEWING",
          logId,
          "Pemakaian Bahan (Sewing)",
        );

        await tx.insert(productionLogParts).values({
          id: `plp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productionLogId: logId,
          cuttingTargetItemId: item.cuttingTargetItemId,
          cuttingTargetItemPartId: item.cuttingTargetItemPartId,
          productPartId: item.productPartId || null,
          qty: goodQty.toFixed(2),
          defectQty: badQty.toFixed(2),
          defectNotes: item.defectNotes || null,
        });
      }
    });

    revalidatePath("/supervisor/production/tracking");
    revalidatePath("/supervisor/production/material-stock-adjustment");

    return {
      success: true,
      message: "Proses jahit berhasil divalidasi & bahan terpotong presisi!",
    };
  } catch (error: any) {
    console.error("Sewing Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat jahit.",
    };
  }
}

/**
 * Submit Record Overdeck
 */
export async function submitOverdeckProcessAction(data: {
  cuttingTargetId: string;
  overdeckEmployeeId: string;
  items: Array<{
    cuttingTargetItemId: string;
    cuttingTargetItemPartId: string;
    productPartId?: string | null;
    qty: number;
    defectQty?: number;
    defectNotes?: string | null;
  }>;
}) {
  const { vendorId, userId } = await getVendorAndUser();
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak. Sesi tidak valid." };

  try {
    await db.transaction(async (tx) => {
      const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await tx.insert(productionLogs).values({
        id: logId,
        vendorId,
        userId,
        cuttingTargetId: data.cuttingTargetId,
        category: "overdeck",
        employeeId: data.overdeckEmployeeId,
      });

      for (const item of data.items) {
        const goodQty = roundTo2(item.qty || 0);
        const badQty = roundTo2(item.defectQty || 0);

        await tx.insert(productionLogParts).values({
          id: `plp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productionLogId: logId,
          cuttingTargetItemId: item.cuttingTargetItemId,
          cuttingTargetItemPartId: item.cuttingTargetItemPartId,
          productPartId: item.productPartId || null,
          qty: goodQty.toFixed(2),
          defectQty: badQty.toFixed(2),
          defectNotes: item.defectNotes || null,
        });
      }
    });

    revalidatePath("/supervisor/production/tracking");
    return { success: true, message: "Proses overdeck berhasil dicatat!" };
  } catch (error: any) {
    console.error("Overdeck Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat overdeck.",
    };
  }
}

/**
 * Submit Record Finishing
 */
export async function submitFinishingProcessAction(data: {
  cuttingTargetId: string;
  finishingEmployeeId: string;
  items: Array<{
    cuttingTargetItemId: string;
    productVariantId: string;
    completedQty: number;
    rejectQty?: number;
    defectNotes?: string | null;
  }>;
}) {
  const { vendorId, userId } = await getVendorAndUser();
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak. Sesi tidak valid." };

  try {
    await db.transaction(async (tx) => {
      const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

      await tx.insert(productionLogs).values({
        id: logId,
        vendorId,
        userId,
        cuttingTargetId: data.cuttingTargetId,
        category: "finishing",
        employeeId: data.finishingEmployeeId,
      });

      for (const item of data.items) {
        const goodQty = roundTo2(item.completedQty || 0);
        const badQty = roundTo2(item.rejectQty || 0);

        await tx.insert(productionLogFinishingItems).values({
          id: `plfi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          productionLogId: logId,
          cuttingTargetItemId: item.cuttingTargetItemId,
          productVariantId: item.productVariantId,
          completedQty: goodQty.toFixed(2),
          defectQty: badQty.toFixed(2),
          defectNotes: item.defectNotes || null,
        });
      }
    });

    revalidatePath("/supervisor/production/tracking");
    revalidatePath("/supervisor/production/cutting-target");

    return {
      success: true,
      message: "Finishing SKU berhasil divalidasi!",
    };
  } catch (error: any) {
    console.error("Finishing Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal mencatat finishing.",
    };
  }
}

/**
 * Fetch Riwayat Log Produksi
 */
export async function getProductionLogsHistoryAction() {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const workerEmp = alias(employees, "worker_emp");
    const nextWorkerEmp = alias(employees, "next_worker_emp");

    const logs = await db
      .select({
        id: productionLogs.id,
        category: productionLogs.category,
        targetTitle: cuttingTargets.title,
        targetDate: cuttingTargets.targetDate,
        workerName: workerEmp.name,
        nextWorkerName: nextWorkerEmp.name,
        notes: productionLogs.notes,
        createdAt: productionLogs.createdAt,
      })
      .from(productionLogs)
      .leftJoin(
        cuttingTargets,
        eq(productionLogs.cuttingTargetId, cuttingTargets.id),
      )
      .leftJoin(workerEmp, eq(productionLogs.employeeId, workerEmp.id))
      .leftJoin(
        nextWorkerEmp,
        eq(productionLogs.nextEmployeeId, nextWorkerEmp.id),
      )
      .where(eq(productionLogs.vendorId, vendorId))
      .orderBy(desc(productionLogs.createdAt));

    if (logs.length === 0) return [];

    const logIds = logs.map((l) => l.id);

    const finishingItems = await db
      .select({
        id: productionLogFinishingItems.id,
        productionLogId: productionLogFinishingItems.productionLogId,
        completedQty: productionLogFinishingItems.completedQty,
        defectQty: productionLogFinishingItems.defectQty,
        defectNotes: productionLogFinishingItems.defectNotes,
        productName: cuttingTargetItems.productNameSnapshot,
        color: cuttingTargetItems.colorSnapshot,
        size: cuttingTargetItems.sizeSnapshot,
      })
      .from(productionLogFinishingItems)
      .leftJoin(
        cuttingTargetItems,
        eq(
          productionLogFinishingItems.cuttingTargetItemId,
          cuttingTargetItems.id,
        ),
      )
      .where(inArray(productionLogFinishingItems.productionLogId, logIds));

    const logParts = await db
      .select({
        id: productionLogParts.id,
        productionLogId: productionLogParts.productionLogId,
        qty: productionLogParts.qty,
        defectQty: productionLogParts.defectQty,
        defectNotes: productionLogParts.defectNotes,
        productName: cuttingTargetItems.productNameSnapshot,
        color: cuttingTargetItems.colorSnapshot,
        size: cuttingTargetItems.sizeSnapshot,
        partName: cuttingTargetItemParts.partName,
      })
      .from(productionLogParts)
      .leftJoin(
        cuttingTargetItems,
        eq(productionLogParts.cuttingTargetItemId, cuttingTargetItems.id),
      )
      .leftJoin(
        cuttingTargetItemParts,
        eq(
          productionLogParts.cuttingTargetItemPartId,
          cuttingTargetItemParts.id,
        ),
      )
      .where(inArray(productionLogParts.productionLogId, logIds));

    return logs.map((log) => {
      const header = {
        id: log.id,
        category: log.category,
        targetTitle: log.targetTitle || "Target Tanpa Judul",
        targetDate: log.targetDate || "-",
        workerName: log.workerName || "Pekerja Tidak Terdaftar",
        nextWorkerName: log.nextWorkerName || null,
        notes: log.notes || "",
        createdAt: log.createdAt,
      };

      if (log.category === "finishing") {
        return {
          ...header,
          items: finishingItems
            .filter((i) => i.productionLogId === log.id)
            .map((item) => ({
              ...item,
              completedQty: roundTo2(parseFloat(item.completedQty || "0")),
              defectQty: roundTo2(parseFloat(item.defectQty || "0")),
            })),
        };
      } else {
        return {
          ...header,
          parts: logParts
            .filter((p) => p.productionLogId === log.id)
            .map((part) => ({
              ...part,
              qty: roundTo2(parseFloat(part.qty || "0")),
              defectQty: roundTo2(parseFloat(part.defectQty || "0")),
            })),
        };
      }
    });
  } catch (error) {
    console.error("Get Production Logs Error:", error);
    return [];
  }
}

/**
 * Fetch Queue Part yang diserahkan ke Penjahit / Obras
 */
export async function getPendingPartsByWorkerAction(data: {
  cuttingTargetId: string;
  category: "sewing" | "overdeck";
  workerId: string;
}) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId || !data.cuttingTargetId || !data.workerId) return [];

  try {
    const sourceCategory = data.category === "sewing" ? "cutting" : "sewing";
    const currentCategory = data.category;

    const incomingLogs = await db
      .select({
        cuttingTargetItemId: productionLogParts.cuttingTargetItemId,
        cuttingTargetItemPartId: productionLogParts.cuttingTargetItemPartId,
        productPartId: productionLogParts.productPartId,
        qty: productionLogParts.qty,
        productName: cuttingTargetItems.productNameSnapshot,
        color: cuttingTargetItems.colorSnapshot,
        size: cuttingTargetItems.sizeSnapshot,
        partName: cuttingTargetItemParts.partName,
      })
      .from(productionLogParts)
      .leftJoin(
        productionLogs,
        eq(productionLogParts.productionLogId, productionLogs.id),
      )
      .leftJoin(
        cuttingTargetItems,
        eq(productionLogParts.cuttingTargetItemId, cuttingTargetItems.id),
      )
      .leftJoin(
        cuttingTargetItemParts,
        eq(
          productionLogParts.cuttingTargetItemPartId,
          cuttingTargetItemParts.id,
        ),
      )
      .where(
        and(
          eq(productionLogs.vendorId, vendorId),
          eq(productionLogs.cuttingTargetId, data.cuttingTargetId),
          eq(productionLogs.category, sourceCategory),
          eq(productionLogs.nextEmployeeId, data.workerId),
        ),
      );

    const completedLogs = await db
      .select({
        cuttingTargetItemPartId: productionLogParts.cuttingTargetItemPartId,
        qty: productionLogParts.qty,
        defectQty: productionLogParts.defectQty,
      })
      .from(productionLogParts)
      .leftJoin(
        productionLogs,
        eq(productionLogParts.productionLogId, productionLogs.id),
      )
      .where(
        and(
          eq(productionLogs.vendorId, vendorId),
          eq(productionLogs.cuttingTargetId, data.cuttingTargetId),
          eq(productionLogs.category, currentCategory),
          eq(productionLogs.employeeId, data.workerId),
        ),
      );

    const completedMap = new Map<string, number>();
    for (const comp of completedLogs) {
      if (!comp.cuttingTargetItemPartId) continue;
      const key = comp.cuttingTargetItemPartId;
      const goodQty = roundTo2(parseFloat(comp.qty || "0"));
      const badQty = roundTo2(parseFloat(comp.defectQty || "0"));

      const prevQty = completedMap.get(key) || 0;
      completedMap.set(key, roundTo2(prevQty + goodQty + badQty));
    }

    const queueMap = new Map<string, any>();
    for (const item of incomingLogs) {
      if (!item.cuttingTargetItemPartId) continue;
      const key = item.cuttingTargetItemPartId;
      const incomingQty = roundTo2(parseFloat(item.qty || "0"));

      if (!queueMap.has(key)) {
        queueMap.set(key, {
          cuttingTargetItemId: item.cuttingTargetItemId,
          cuttingTargetItemPartId: item.cuttingTargetItemPartId,
          productPartId: item.productPartId,
          displayName: `${item.productName || "Produk"} (${item.color || "-"} - ${item.size || "-"})`,
          partName: item.partName || "Part Utama",
          totalIncomingQty: incomingQty,
        });
      } else {
        const existing = queueMap.get(key);
        existing.totalIncomingQty = roundTo2(
          existing.totalIncomingQty + incomingQty,
        );
      }
    }

    const resultPendingQueue = [];
    for (const [key, item] of queueMap.entries()) {
      const alreadyProcessedQty = completedMap.get(key) || 0;
      const remainingQty = roundTo2(
        item.totalIncomingQty - alreadyProcessedQty,
      );

      if (remainingQty > 0.01) {
        resultPendingQueue.push({
          cuttingTargetItemId: item.cuttingTargetItemId,
          cuttingTargetItemPartId: item.cuttingTargetItemPartId,
          productPartId: item.productPartId,
          displayName: item.displayName,
          partName: item.partName,
          qty: remainingQty,
          defectQty: 0,
          defectNotes: null,
        });
      }
    }

    return resultPendingQueue;
  } catch (error) {
    console.error("Get Pending Parts Error:", error);
    return [];
  }
}

/**
 * Fetch SKU Antrean Finishing
 */
export async function getPendingSkuForFinishingAction(data: {
  cuttingTargetId: string;
}) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId || !data.cuttingTargetId) return [];

  try {
    const targetItems = await db
      .select({
        id: cuttingTargetItems.id,
        productVariantId: cuttingTargetItems.productVariantId,
        productName: cuttingTargetItems.productNameSnapshot,
        color: cuttingTargetItems.colorSnapshot,
        size: cuttingTargetItems.sizeSnapshot,
        targetQty: cuttingTargetItems.targetQty,
      })
      .from(cuttingTargetItems)
      .where(eq(cuttingTargetItems.cuttingTargetId, data.cuttingTargetId));

    const resultSkuList = [];

    for (const item of targetItems) {
      const parts = await db
        .select({
          id: cuttingTargetItemParts.id,
          partName: cuttingTargetItemParts.partName,
        })
        .from(cuttingTargetItemParts)
        .where(eq(cuttingTargetItemParts.cuttingTargetItemId, item.id));

      if (parts.length === 0) continue;

      const partReadyQtyList: number[] = [];

      for (const pt of parts) {
        const allLogParts = await db
          .select({
            category: productionLogs.category,
            qty: productionLogParts.qty,
          })
          .from(productionLogParts)
          .innerJoin(
            productionLogs,
            eq(productionLogParts.productionLogId, productionLogs.id),
          )
          .where(
            and(
              eq(productionLogs.vendorId, vendorId),
              eq(productionLogs.cuttingTargetId, data.cuttingTargetId),
              eq(productionLogParts.cuttingTargetItemPartId, pt.id),
            ),
          );

        const sewQty = roundTo2(
          allLogParts
            .filter((l) => l.category === "sewing")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0),
        );

        const ovdQty = roundTo2(
          allLogParts
            .filter((l) => l.category === "overdeck")
            .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0),
        );

        const readyQtyForPart = ovdQty > 0 ? ovdQty : sewQty;
        partReadyQtyList.push(readyQtyForPart);
      }

      const maxCompletableSet = roundTo2(Math.min(...partReadyQtyList));

      const finishedLogs = await db
        .select({
          completedQty: productionLogFinishingItems.completedQty,
          defectQty: productionLogFinishingItems.defectQty,
        })
        .from(productionLogFinishingItems)
        .where(eq(productionLogFinishingItems.cuttingTargetItemId, item.id));

      const alreadyProcessedQty = roundTo2(
        finishedLogs.reduce(
          (sum, l) =>
            sum +
            parseFloat(l.completedQty || "0") +
            parseFloat(l.defectQty || "0"),
          0,
        ),
      );

      const availableToFinish = roundTo2(
        maxCompletableSet - alreadyProcessedQty,
      );

      if (availableToFinish > 0.01) {
        resultSkuList.push({
          cuttingTargetItemId: item.id,
          productVariantId: item.productVariantId,
          displayName: `${item.productName || "Produk"} (${item.color || "-"} - ${item.size || "-"})`,
          targetQty: roundTo2(parseFloat(item.targetQty || "0")),
          maxCompletableSet,
          alreadyProcessedQty,
          qty: availableToFinish,
          completedQty: availableToFinish,
          rejectQty: 0,
          defectNotes: null,
        });
      }
    }

    return resultSkuList;
  } catch (error) {
    console.error("Get Pending SKU Finishing Error:", error);
    return [];
  }
}

/**
 * Fetch Karyawan Berdasarkan Tipe
 */
export async function getEmployeesByTypeAction(
  type?: "cutting" | "sewing" | "overdeck" | "finishing" | "packing",
) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const conditions = [eq(employees.vendorId, vendorId)];
    if (type) {
      conditions.push(eq(employees.type, type));
    }

    return await db
      .select({
        id: employees.id,
        name: employees.name,
        type: employees.type,
      })
      .from(employees)
      .where(and(...conditions));
  } catch (error) {
    console.error("Get Employees Error:", error);
    return [];
  }
}

/**
 * Fetch Target Aktif (Status STARTED)
 */
export async function getActiveCuttingTargetsAction() {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const targets = await db
      .select()
      .from(cuttingTargets)
      .where(
        and(
          eq(cuttingTargets.vendorId, vendorId),
          eq(cuttingTargets.status, "started"),
        ),
      )
      .orderBy(desc(cuttingTargets.createdAt));

    if (targets.length === 0) return [];

    const targetIds = targets.map((t) => t.id);

    const targetItems = await db
      .select()
      .from(cuttingTargetItems)
      .where(inArray(cuttingTargetItems.cuttingTargetId, targetIds));

    const itemIds = targetItems.map((i) => i.id);

    const targetParts =
      itemIds.length > 0
        ? await db
            .select()
            .from(cuttingTargetItemParts)
            .where(inArray(cuttingTargetItemParts.cuttingTargetItemId, itemIds))
        : [];

    return targets.map((t) => {
      const items = targetItems
        .filter((i) => i.cuttingTargetId === t.id)
        .map((item) => ({
          ...item,
          parts: targetParts.filter((p) => p.cuttingTargetItemId === item.id),
        }));

      return {
        ...t,
        items,
      };
    });
  } catch (error) {
    console.error("Get Active Targets Error:", error);
    return [];
  }
}
