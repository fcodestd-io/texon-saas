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

// Live Search Material
export async function searchMaterialsAction(
  category: "fabric" | "thread" | "accessory",
  query: string,
) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
  const session = await auth();
  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;

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

// 2. Penerimaan Barang (DELIVERED) - Stok BERTAMBAH + Insert Material Stock Movement
export async function deliverPOAction(
  poId: string,
  actualItems: Array<{ itemId: string; actualQty: number }>,
) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    const [poHeader] = await db
      .select()
      .from(purchaseOrders)
      .where(
        and(eq(purchaseOrders.id, poId), eq(purchaseOrders.vendorId, vendorId)),
      )
      .limit(1);

    if (!poHeader || poHeader.status !== "pending") {
      return {
        success: false,
        message: "PO tidak ditemukan atau sudah diproses.",
      };
    }

    let totalActualAmount = 0;

    for (const itemInput of actualItems) {
      const [poi] = await db
        .select()
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.id, itemInput.itemId))
        .limit(1);

      if (!poi) continue;

      const unitPrice = parseFloat(poi.unitPrice);
      const actualSubtotal = itemInput.actualQty * unitPrice;
      totalActualAmount += actualSubtotal;

      // Update PO Item Detail
      await db
        .update(purchaseOrderItems)
        .set({
          actualQty: itemInput.actualQty.toString(),
          actualSubtotal: actualSubtotal.toString(),
        })
        .where(eq(purchaseOrderItems.id, itemInput.itemId));

      // Tambah Stok Realtime
      await db
        .update(materials)
        .set({
          stock: sql`${materials.stock} + ${itemInput.actualQty}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(materials.id, poi.materialId),
            eq(materials.vendorId, vendorId),
          ),
        );

      if (poi.materialColorId) {
        await db
          .update(materialColors)
          .set({
            stock: sql`${materialColors.stock} + ${itemInput.actualQty}`,
            updatedAt: new Date(),
          })
          .where(eq(materialColors.id, poi.materialColorId));
      }

      // INSERT MATERIAL STOCK MOVEMENT
      await db.insert(materialStockMovements).values({
        id: `msm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        vendorId,
        materialId: poi.materialId,
        materialColorId: poi.materialColorId || null,
        type: "in",
        quantity: itemInput.actualQty.toString(),
        referenceType: "PURCHASE_ORDER",
        referenceId: poId,
        notes: `Penerimaan Pembelian (${poHeader.poNumber})`,
      });
    }

    const estimatedTotal = parseFloat(poHeader.totalEstimatedAmount || "0");
    const variance = totalActualAmount - estimatedTotal;

    // Update Header
    await db
      .update(purchaseOrders)
      .set({
        status: "delivered",
        totalActualAmount: totalActualAmount.toString(),
        amountVariance: variance.toString(),
        deliveredAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId));

    revalidatePath("/supervisor/production/purchase");
    return {
      success: true,
      message: "Penerimaan barang berhasil & stok ditambahkan!",
    };
  } catch (error: any) {
    console.error("Deliver PO Error:", error);
    return {
      success: false,
      message: error?.message || "Gagal memproses penerimaan barang.",
    };
  }
}

// 3. Batalkan PO (CANCEL) - HANYA BISA KETIKA MASIH PENDING
export async function cancelPOAction(poId: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
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
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return [];

  try {
    // 1. Fetch Bahan Varian Kain/Benang dengan Join Warna
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

    // 2. Fetch Aksesoris (Tanpa Warna)
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
