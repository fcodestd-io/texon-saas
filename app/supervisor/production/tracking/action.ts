"use server";

import { db } from "@/db";
import {
  cuttingTargets,
  cuttingTargetItems,
  cuttingTargetItemParts,
  productionLogs,
  productionLogParts,
  productionLogFinishingItems,
  productParts,
  productPartMaterials,
  materials,
  materialColors,
  materialStockMovements,
  employees,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { alias } from "drizzle-orm/pg-core";

// Helper Sanitasi ID Master Product Part
function sanitizeProductPartId(id?: string | null): string | null {
  if (!id) return null;
  if (
    id.startsWith("ctip_") ||
    id.startsWith("cti_") ||
    id.startsWith("prod_")
  ) {
    return null;
  }
  return id;
}

/**
 * 1. Fetch Riwayat Produksi (Logs) - SAFE LEFT JOIN VERSION
 */
export async function getProductionLogsHistoryAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    // Alias untuk memisahkan Karyawan Pengerja vs Karyawan Penerima
    const workerEmp = alias(employees, "worker_emp");
    const nextWorkerEmp = alias(employees, "next_worker_emp");

    const logs = await db
      .select({
        id: productionLogs.id,
        category: productionLogs.category,
        targetTitle: cuttingTargets.title,
        targetDate: cuttingTargets.targetDate,
        workerName: workerEmp.name,
        nextWorkerName: nextWorkerEmp.name, // Nama Pekerja Penerima
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

    const results = [];

    for (const log of logs) {
      const safeLogHeader = {
        id: log.id,
        category: log.category,
        targetTitle: log.targetTitle || "Target Tanpa Judul",
        targetDate: log.targetDate || "-",
        workerName: log.workerName || "Pekerja Tidak Terdaftar",
        nextWorkerName: log.nextWorkerName || null, // Null jika finishing / tidak diserahkan
        notes: log.notes || "",
        createdAt: log.createdAt,
      };

      if (log.category === "finishing") {
        const items = await db
          .select({
            id: productionLogFinishingItems.id,
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
          .where(eq(productionLogFinishingItems.productionLogId, log.id));

        results.push({ ...safeLogHeader, items: items || [] });
      } else {
        const parts = await db
          .select({
            id: productionLogParts.id,
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
          .where(eq(productionLogParts.productionLogId, log.id));

        results.push({ ...log, ...safeLogHeader, parts: parts || [] });
      }
    }

    return results;
  } catch (error) {
    console.error("Get Production Logs Error:", error);
    return [];
  }
}

/**
 * 2. Fetch Queue Part yang diserahkan ke Penjahit / Obras
 */
export async function getPendingPartsByWorkerAction(data: {
  cuttingTargetId: string;
  category: "sewing" | "overdeck";
  workerId: string;
}) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
      const goodQty = parseFloat(comp.qty || "0");
      const badQty = parseFloat(comp.defectQty || "0");
      const totalProcessed = goodQty + badQty;

      const prevQty = completedMap.get(key) || 0;
      completedMap.set(key, prevQty + totalProcessed);
    }

    const queueMap = new Map<string, any>();
    for (const item of incomingLogs) {
      if (!item.cuttingTargetItemPartId) continue;
      const key = item.cuttingTargetItemPartId;
      const incomingQty = parseFloat(item.qty || "0");

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
        existing.totalIncomingQty += incomingQty;
      }
    }

    const resultPendingQueue = [];
    for (const [key, item] of queueMap.entries()) {
      const alreadyProcessedQty = completedMap.get(key) || 0;
      const remainingQty = item.totalIncomingQty - alreadyProcessedQty;

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
 * Fetch SKU Antrean Finishing - FIXED BOTTLENECK & FALLBACK TANPA OVERDECK
 */
export async function getPendingSkuForFinishingAction(data: {
  cuttingTargetId: string;
}) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId || !data.cuttingTargetId) return [];

  try {
    // 1. Ambil seluruh item/SKU di target ini
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
      // 2. Ambil seluruh part milik item ini
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
        // Ambil SEMUA log pengerjaan part ini tanpa memfilter category di WHERE agar JOIN tidak pecah
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

        // Hitung total Qty sewing & overdeck secara independen di memory
        const sewQty = allLogParts
          .filter((l) => l.category === "sewing")
          .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

        const ovdQty = allLogParts
          .filter((l) => l.category === "overdeck")
          .reduce((sum, l) => sum + parseFloat(l.qty || "0"), 0);

        // LOGIKA BOTTLENECK CERDAS:
        // Jika part tersebut PERNAH di-overdeck (> 0) -> Patokannya Qty Overdeck
        // Jika part TIDAK PERNAH di-overdeck (= 0, misal Kerudung) -> Patokannya Qty Sewing
        const readyQtyForPart = ovdQty > 0 ? ovdQty : sewQty;
        partReadyQtyList.push(readyQtyForPart);
      }

      // Hitung batas minimum setelan lengkap (Baju: 20, Kerudung: 20, Celana: 48) -> Min = 20
      const maxCompletableSet = Math.min(...partReadyQtyList);

      // Hitung Qty SKU yang SUDAH di-finishing sebelumnya
      const finishedLogs = await db
        .select({
          completedQty: productionLogFinishingItems.completedQty,
          defectQty: productionLogFinishingItems.defectQty,
        })
        .from(productionLogFinishingItems)
        .where(eq(productionLogFinishingItems.cuttingTargetItemId, item.id));

      const alreadyProcessedQty = finishedLogs.reduce(
        (sum, l) =>
          sum +
          parseFloat(l.completedQty || "0") +
          parseFloat((l as any).defectQty || "0"),
        0,
      );

      // Sisa setelan yang siap masuk pengerjaan Finishing
      const availableToFinish = maxCompletableSet - alreadyProcessedQty;

      if (availableToFinish > 0.01) {
        resultSkuList.push({
          cuttingTargetItemId: item.id,
          productVariantId: item.productVariantId,
          displayName: `${item.productName || "Produk"} (${item.color || "-"} - ${item.size || "-"})`,
          targetQty: parseFloat(item.targetQty || "0"),
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
 * 4. Submit Record Cutting
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
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };

  try {
    const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(productionLogs).values({
      id: logId,
      vendorId,
      userId,
      cuttingTargetId: data.cuttingTargetId,
      category: "cutting",
      employeeId: data.cutterEmployeeId,
      nextEmployeeId: data.sewerEmployeeId,
    });

    for (const item of data.items) {
      const validPartId = sanitizeProductPartId(item.productPartId);

      await db.insert(productionLogParts).values({
        id: `plp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productionLogId: logId,
        cuttingTargetItemId: item.cuttingTargetItemId,
        cuttingTargetItemPartId: item.cuttingTargetItemPartId,
        productPartId: validPartId,
        qty: item.qty.toString(),
        defectNotes: null,
      });

      if (validPartId) {
        const bomMaterials = await db
          .select({
            materialId: productPartMaterials.materialId,
            materialColorId: productPartMaterials.materialColorId,
            quantity: productPartMaterials.quantity,
          })
          .from(productPartMaterials)
          .leftJoin(
            materials,
            eq(productPartMaterials.materialId, materials.id),
          )
          .where(
            and(
              eq(productPartMaterials.productPartId, validPartId),
              eq(materials.category, "fabric"),
            ),
          );

        for (const bom of bomMaterials) {
          if (!bom.materialId) continue;
          const totalUsed = parseFloat(bom.quantity) * item.qty;

          await db
            .update(materials)
            .set({
              stock: sql`${materials.stock} - ${totalUsed}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(materials.id, bom.materialId),
                eq(materials.vendorId, vendorId),
              ),
            );

          if (bom.materialColorId) {
            await db
              .update(materialColors)
              .set({
                stock: sql`${materialColors.stock} - ${totalUsed}`,
                updatedAt: new Date(),
              })
              .where(eq(materialColors.id, bom.materialColorId));
          }

          await db.insert(materialStockMovements).values({
            id: `msm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            vendorId,
            materialId: bom.materialId,
            materialColorId: bom.materialColorId || null,
            type: "out",
            quantity: totalUsed.toString(),
            referenceType: "PRODUCTION_CUTTING",
            referenceId: logId,
            notes: `Pemotongan Kain oleh Pemotong`,
          });
        }
      }
    }

    revalidatePath("/supervisor/production/tracking");
    return {
      success: true,
      message: "Proses cutting berhasil dicatat & stok kain berkurang!",
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
 * 5. Submit Record Sewing
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
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };

  try {
    const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(productionLogs).values({
      id: logId,
      vendorId,
      userId,
      cuttingTargetId: data.cuttingTargetId,
      category: "sewing",
      employeeId: data.sewerEmployeeId,
      nextEmployeeId: data.nextOverdeckEmployeeId || null,
    });

    for (const item of data.items) {
      const validPartId = sanitizeProductPartId(item.productPartId);

      await db.insert(productionLogParts).values({
        id: `plp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productionLogId: logId,
        cuttingTargetItemId: item.cuttingTargetItemId,
        cuttingTargetItemPartId: item.cuttingTargetItemPartId,
        productPartId: validPartId,
        qty: item.qty.toString(),
        defectQty: (item.defectQty || 0).toString(),
        defectNotes: item.defectNotes || null,
      });

      if (validPartId) {
        const bomMaterials = await db
          .select({
            materialId: productPartMaterials.materialId,
            materialColorId: productPartMaterials.materialColorId,
            quantity: productPartMaterials.quantity,
          })
          .from(productPartMaterials)
          .leftJoin(
            materials,
            eq(productPartMaterials.materialId, materials.id),
          )
          .where(
            and(
              eq(productPartMaterials.productPartId, validPartId),
              sql`${materials.category} IN ('thread', 'accessory')`,
            ),
          );

        for (const bom of bomMaterials) {
          if (!bom.materialId) continue;
          const totalUsed = parseFloat(bom.quantity) * item.qty;

          await db
            .update(materials)
            .set({
              stock: sql`${materials.stock} - ${totalUsed}`,
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(materials.id, bom.materialId),
                eq(materials.vendorId, vendorId),
              ),
            );

          if (bom.materialColorId) {
            await db
              .update(materialColors)
              .set({
                stock: sql`${materialColors.stock} - ${totalUsed}`,
                updatedAt: new Date(),
              })
              .where(eq(materialColors.id, bom.materialColorId));
          }

          await db.insert(materialStockMovements).values({
            id: `msm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            vendorId,
            materialId: bom.materialId,
            materialColorId: bom.materialColorId || null,
            type: "out",
            quantity: totalUsed.toString(),
            referenceType: "PRODUCTION_SEWING",
            referenceId: logId,
            notes: `Pemakaian Benang/Aksesoris Jahit`,
          });
        }
      }
    }

    revalidatePath("/supervisor/production/tracking");
    return {
      success: true,
      message: "Proses jahit berhasil divalidasi & bahan dikurangi!",
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
 * 6. Submit Record Overdeck
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
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };

  try {
    const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(productionLogs).values({
      id: logId,
      vendorId,
      userId,
      cuttingTargetId: data.cuttingTargetId,
      category: "overdeck",
      employeeId: data.overdeckEmployeeId,
    });

    for (const item of data.items) {
      const validPartId = sanitizeProductPartId(item.productPartId);

      await db.insert(productionLogParts).values({
        id: `plp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productionLogId: logId,
        cuttingTargetItemId: item.cuttingTargetItemId,
        cuttingTargetItemPartId: item.cuttingTargetItemPartId,
        productPartId: validPartId,
        qty: item.qty.toString(),
        defectQty: (item.defectQty || 0).toString(),
        defectNotes: item.defectNotes || null,
      });
    }

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
 * 7. Submit Record Finishing
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
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;
  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };

  try {
    const logId = `plog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(productionLogs).values({
      id: logId,
      vendorId,
      userId,
      cuttingTargetId: data.cuttingTargetId,
      category: "finishing",
      employeeId: data.finishingEmployeeId,
    });

    for (const item of data.items) {
      const goodQty = item.completedQty || 0;
      const badQty = item.rejectQty || 0;

      await db.insert(productionLogFinishingItems).values({
        id: `plfi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        productionLogId: logId,
        cuttingTargetItemId: item.cuttingTargetItemId,
        productVariantId: item.productVariantId,
        completedQty: goodQty.toString(),
        defectQty: badQty.toString(),
        defectNotes: item.defectNotes || null,
      });
    }

    revalidatePath("/supervisor/production/tracking");
    revalidatePath("/supervisor/production/cutting-target");
    return {
      success: true,
      message:
        "Finishing SKU berhasil divalidasi & produk siap jual berhasil dicatat!",
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
 * 8. Fetch Karyawan Berdasarkan Tipe
 */
export async function getEmployeesByTypeAction(
  type?: "cutting" | "sewing" | "overdeck" | "finishing" | "packing",
) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
 * 9. Fetch Target Aktif (Status STARTED)
 */
export async function getActiveCuttingTargetsAction() {
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
          eq(cuttingTargets.status, "started"),
        ),
      )
      .orderBy(desc(cuttingTargets.createdAt));

    const results = [];
    for (const t of targets) {
      const items = await db
        .select()
        .from(cuttingTargetItems)
        .where(eq(cuttingTargetItems.cuttingTargetId, t.id));

      const itemsWithParts = [];
      for (const item of items) {
        const parts = await db
          .select()
          .from(cuttingTargetItemParts)
          .where(eq(cuttingTargetItemParts.cuttingTargetItemId, item.id));

        itemsWithParts.push({ ...item, parts: parts || [] });
      }

      results.push({ ...t, items: itemsWithParts });
    }

    return results;
  } catch (error) {
    console.error("Get Active Targets Error:", error);
    return [];
  }
}
