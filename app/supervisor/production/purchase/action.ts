"use server";

import { db } from "@/db";
import {
  purchaseOrders,
  purchaseOrderItems,
  materials,
  materialColors,
  materialStockMovements,
  colors,
  units,
  users,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, ilike, desc, gte, lte, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

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

// Live Search Material
export async function searchMaterialsAction(
  category: "fabric" | "thread" | "accessory",
  query: string,
) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    if (category === "accessory") {
      const results = await db
        .select({
          materialId: materials.id,
          materialColorId: sql<string | null>`NULL`,
          displayName: materials.name,
          unitId: materials.purchaseUnitId,
          unitName: units.name,
          defaultPrice: materials.purchasePrice,
        })
        .from(materials)
        .innerJoin(units, eq(materials.purchaseUnitId, units.id))
        .where(
          and(
            eq(materials.vendorId, vendorId),
            eq(materials.category, "accessory"),
            ilike(materials.name, `%${query}%`),
          ),
        )
        .limit(10);

      return results;
    } else {
      const results = await db
        .select({
          materialId: materials.id,
          materialColorId: materialColors.id,
          displayName: sql<string>`CONCAT(${materials.name}, ' - ', ${colors.name})`,
          unitId: materials.purchaseUnitId,
          unitName: units.name,
          defaultPrice: materials.purchasePrice,
        })
        .from(materialColors)
        .innerJoin(materials, eq(materialColors.materialId, materials.id))
        .innerJoin(colors, eq(materialColors.colorId, colors.id))
        .innerJoin(units, eq(materials.purchaseUnitId, units.id))
        .where(
          and(
            eq(materials.vendorId, vendorId),
            eq(materials.category, category),
            sql`(${materials.name} ILIKE ${`%${query}%`} OR ${colors.name} ILIKE ${`%${query}%`})`,
          ),
        )
        .limit(15);

      return results;
    }
  } catch (error) {
    console.error("Search Material Error:", error);
    return [];
  }
}

// 1. Buat Catatan PO Baru (PENDING) - Stok BELUM bertambah
export async function createPendingPOAction(data: {
  category: "fabric" | "thread" | "accessory";
  notes?: string;
  items: Array<{
    materialId: string;
    materialColorId?: string | null;
    unitId: string;
    itemNameSnapshot: string;
    estimatedQty: number;
    unitPrice: number;
    estimatedSubtotal: number;
  }>;
}) {
  const { vendorId, userId } = await getVendorAndUser();

  if (!userId || !vendorId)
    return { success: false, message: "Akses ditolak." };
  if (!data.items || data.items.length === 0)
    return { success: false, message: "Pilih minimal 1 item." };

  try {
    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const totalEstimated = data.items.reduce(
      (sum, item) => sum + item.estimatedSubtotal,
      0,
    );
    const poId = `po_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    await db.insert(purchaseOrders).values({
      id: poId,
      vendorId,
      userId,
      poNumber,
      category: data.category,
      status: "pending",
      totalEstimatedAmount: totalEstimated.toString(),
      notes: data.notes || "",
    });

    for (const item of data.items) {
      await db.insert(purchaseOrderItems).values({
        id: `poi_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        purchaseOrderId: poId,
        materialId: item.materialId,
        materialColorId: item.materialColorId || null,
        unitId: item.unitId,
        itemNameSnapshot: item.itemNameSnapshot,
        estimatedQty: item.estimatedQty.toString(),
        unitPrice: item.unitPrice.toString(),
        estimatedSubtotal: item.estimatedSubtotal.toString(),
      });
    }

    revalidatePath("/supervisor/production/purchase");
    return {
      success: true,
      message: `PO Pending (${poNumber}) berhasil dibuat.`,
    };
  } catch (error: any) {
    console.error("Create PO Error:", error);
    return { success: false, message: error?.message || "Gagal membuat PO." };
  }
}

// 2. Penerimaan Barang (DELIVERED) - Mengkonversi Satuan Beli ke Satuan Pakai untuk Stok
export async function deliverPOAction(
  poId: string,
  actualItems: Array<{ itemId: string; actualQty: number }>,
) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    await db.transaction(async (tx) => {
      const [poHeader] = await tx
        .select()
        .from(purchaseOrders)
        .where(
          and(
            eq(purchaseOrders.id, poId),
            eq(purchaseOrders.vendorId, vendorId),
          ),
        )
        .limit(1);

      if (!poHeader || poHeader.status !== "pending") {
        throw new Error("PO tidak ditemukan atau sudah diproses.");
      }

      let totalActualAmount = 0;

      for (const itemInput of actualItems) {
        const [poi] = await tx
          .select()
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.id, itemInput.itemId))
          .limit(1);

        if (!poi) continue;

        const unitPrice = parseFloat(poi.unitPrice);
        const actualQtyNum = itemInput.actualQty; // Jumlah dalam Satuan Beli (misal: 10 Roll)
        const actualSubtotal = actualQtyNum * unitPrice;
        totalActualAmount += actualSubtotal;

        // Ambil data nilai konversi dari tabel master materials
        const [matRecord] = await tx
          .select({
            stock: materials.stock,
            conversionValue: materials.conversionValue,
          })
          .from(materials)
          .where(
            and(
              eq(materials.id, poi.materialId),
              eq(materials.vendorId, vendorId),
            ),
          );

        const convValue = parseFloat(matRecord?.conversionValue || "1");
        // Jumlah yang ditambahkan ke stok fisik (Satuan Pakai, misal: 10 Roll * 100 Meter = 1000 Meter)
        const addedStockConsumption = actualQtyNum * convValue;

        // 1. Update Detail Item PO (Tetap menyimpan jumlah riil PO dalam Satuan Beli)
        await tx
          .update(purchaseOrderItems)
          .set({
            actualQty: actualQtyNum.toString(),
            actualSubtotal: actualSubtotal.toString(),
          })
          .where(eq(purchaseOrderItems.id, itemInput.itemId));

        let currentStockNum = 0;
        let newStockNum = 0;

        // 2. Tambahkan Stok ke Database (Satuan Pakai / Konsumsi)
        if (poi.materialColorId) {
          // Kategori Kain / Benang (Stok tersimpan per varian warna)
          const [colorRecord] = await tx
            .select({ stock: materialColors.stock })
            .from(materialColors)
            .where(eq(materialColors.id, poi.materialColorId));

          currentStockNum = parseFloat(colorRecord?.stock || "0");
          newStockNum = currentStockNum + addedStockConsumption;

          await tx
            .update(materialColors)
            .set({
              stock: String(newStockNum),
              updatedAt: new Date(),
            })
            .where(eq(materialColors.id, poi.materialColorId));

          // Sync stok akumulasi di tabel induk material
          const currentMatStock = parseFloat(matRecord?.stock || "0");
          await tx
            .update(materials)
            .set({
              stock: String(currentMatStock + addedStockConsumption),
              updatedAt: new Date(),
            })
            .where(eq(materials.id, poi.materialId));
        } else {
          // Kategori Aksesoris (Stok tersimpan di material induk)
          currentStockNum = parseFloat(matRecord?.stock || "0");
          newStockNum = currentStockNum + addedStockConsumption;

          await tx
            .update(materials)
            .set({
              stock: String(newStockNum),
              updatedAt: new Date(),
            })
            .where(
              and(
                eq(materials.id, poi.materialId),
                eq(materials.vendorId, vendorId),
              ),
            );
        }

        // 3. Catat Pergerakan Stok (Simpan jumlah konversi dalam Satuan Pakai)
        await tx.insert(materialStockMovements).values({
          id: `msm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          vendorId,
          materialId: poi.materialId,
          materialColorId: poi.materialColorId || null,
          type: "in",
          quantity: String(addedStockConsumption),
          stockBefore: String(currentStockNum),
          stockAfter: String(newStockNum),
          referenceType: "PURCHASE_ORDER",
          referenceId: poId,
          notes: `Penerimaan Pembelian (${poHeader.poNumber}) - ${actualQtyNum} )`,
        });
      }

      const estimatedTotal = parseFloat(poHeader.totalEstimatedAmount || "0");
      const variance = totalActualAmount - estimatedTotal;

      // 4. Update Header PO Status Delivered
      await tx
        .update(purchaseOrders)
        .set({
          status: "delivered",
          totalActualAmount: totalActualAmount.toString(),
          amountVariance: variance.toString(),
          deliveredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrders.id, poId));
    });

    revalidatePath("/supervisor/production/purchase");
    return {
      success: true,
      message: "Penerimaan barang berhasil & stok terkonversi ditambahkan!",
    };
  } catch (error: any) {
    console.error("Deliver PO Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal memproses penerimaan barang.",
    };
  }
}

// 3. Batalkan PO (CANCEL)
export async function cancelPOAction(poId: string) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    const [poHeader] = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.vendorId, vendorId)),
      )
      .limit(1);

    if (!poHeader) {
      return { success: false, message: "PO tidak ditemukan." };
    }

    if (poHeader.status !== "pending") {
      return {
        success: false,
        message: "Hanya PO berstatus PENDING yang dapat di-cancel.",
      };
    }

    await db
      .update(purchaseOrders)
      .set({
        status: "canceled",
        canceledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId));

    revalidatePath("/supervisor/production/purchase");
    return { success: true, message: "PO berhasil dibatalkan (Canceled)." };
  } catch (error: any) {
    console.error("Cancel PO Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal membatalkan PO.",
    };
  }
}

// Fetch PO List
export async function getPurchaseOrdersAction(statusFilter?: string) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const conditions = [eq(purchaseOrders.vendorId, vendorId)];
    if (statusFilter && statusFilter !== "all") {
      conditions.push(eq(purchaseOrders.status, statusFilter as any));
    }

    const poList = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        category: purchaseOrders.category,
        status: purchaseOrders.status,
        totalEstimatedAmount: purchaseOrders.totalEstimatedAmount,
        totalActualAmount: purchaseOrders.totalActualAmount,
        amountVariance: purchaseOrders.amountVariance,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        deliveredAt: purchaseOrders.deliveredAt,
        canceledAt: purchaseOrders.canceledAt,
        userName: users.username,
      })
      .from(purchaseOrders)
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(purchaseOrders.createdAt));

    const results = [];
    for (const po of poList) {
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          materialId: purchaseOrderItems.materialId,
          materialColorId: purchaseOrderItems.materialColorId,
          itemNameSnapshot: purchaseOrderItems.itemNameSnapshot,
          unitName: units.name,
          estimatedQty: purchaseOrderItems.estimatedQty,
          actualQty: purchaseOrderItems.actualQty,
          unitPrice: purchaseOrderItems.unitPrice,
          estimatedSubtotal: purchaseOrderItems.estimatedSubtotal,
          actualSubtotal: purchaseOrderItems.actualSubtotal,
        })
        .from(purchaseOrderItems)
        .innerJoin(units, eq(purchaseOrderItems.unitId, units.id))
        .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

      results.push({ ...po, items });
    }

    return results;
  } catch (error) {
    console.error("Get PO List Error:", error);
    return [];
  }
}

// Fetch Export Data untuk Modal CSV Spreadsheet
export async function getExportDataAction(startDate: string, endDate: string) {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const start = new Date(`${startDate}T00:00:00.000Z`);
    const end = new Date(`${endDate}T23:59:59.999Z`);

    const poList = await db
      .select({
        poNumber: purchaseOrders.poNumber,
        category: purchaseOrders.category,
        status: purchaseOrders.status,
        notes: purchaseOrders.notes,
        createdAt: purchaseOrders.createdAt,
        deliveredAt: purchaseOrders.deliveredAt,
        userName: users.username,
        itemNameSnapshot: purchaseOrderItems.itemNameSnapshot,
        unitName: units.name,
        estimatedQty: purchaseOrderItems.estimatedQty,
        actualQty: purchaseOrderItems.actualQty,
        unitPrice: purchaseOrderItems.unitPrice,
        estimatedSubtotal: purchaseOrderItems.estimatedSubtotal,
        actualSubtotal: purchaseOrderItems.actualSubtotal,
      })
      .from(purchaseOrders)
      .innerJoin(
        purchaseOrderItems,
        eq(purchaseOrderItems.purchaseOrderId, purchaseOrders.id),
      )
      .innerJoin(units, eq(purchaseOrderItems.unitId, units.id))
      .leftJoin(users, eq(purchaseOrders.userId, users.id))
      .where(
        and(
          eq(purchaseOrders.vendorId, vendorId),
          gte(purchaseOrders.createdAt, start),
          lte(purchaseOrders.createdAt, end),
        ),
      )
      .orderBy(desc(purchaseOrders.createdAt));

    return poList;
  } catch (error) {
    console.error("Export Error:", error);
    return [];
  }
}

export async function getAllMaterialsAction() {
  const { vendorId } = await getVendorAndUser();
  if (!vendorId) return [];

  try {
    const fabricAndThreads = await db
      .select({
        id: materialColors.id,
        materialId: materials.id,
        materialColorId: materialColors.id,
        category: materials.category,
        displayName: sql<string>`CONCAT(${materials.name}, ' - ', ${colors.name})`,
        unitId: materials.purchaseUnitId,
        unitName: units.name,
        defaultPrice: materials.purchasePrice,
      })
      .from(materialColors)
      .innerJoin(materials, eq(materialColors.materialId, materials.id))
      .innerJoin(colors, eq(materialColors.colorId, colors.id))
      .innerJoin(units, eq(materials.purchaseUnitId, units.id))
      .where(eq(materials.vendorId, vendorId));

    const accessories = await db
      .select({
        id: materials.id,
        materialId: materials.id,
        materialColorId: sql<string | null>`NULL`,
        category: materials.category,
        displayName: materials.name,
        unitId: materials.purchaseUnitId,
        unitName: units.name,
        defaultPrice: materials.purchasePrice,
      })
      .from(materials)
      .innerJoin(units, eq(materials.purchaseUnitId, units.id))
      .where(
        and(
          eq(materials.vendorId, vendorId),
          eq(materials.category, "accessory"),
        ),
      );

    return [...fabricAndThreads, ...accessories];
  } catch (error) {
    console.error("Get All Materials Error:", error);
    return [];
  }
}
