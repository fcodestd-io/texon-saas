"use server";

import { db } from "@/db";
import {
  productVariants,
  warehouseIncomingItems,
  warehouseIncomings,
  warehouseOutgoingItems,
  warehouseOutgoings,
  warehouseReturnItems,
  warehouseReturns,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, gte, sql } from "drizzle-orm";

export async function getWarehouseMetricsAction() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) {
    return {
      totalStock: 0,
      todayIn: 0,
      todayOut: 0,
    };
  }

  try {
    // 1. Total Stok Ready saat ini (Sum stock di productVariants)
    const [stockResult] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${productVariants.stock} AS DECIMAL)), 0)`,
      })
      .from(productVariants)
      .where(eq(productVariants.vendorId, vendorId));

    // Waktu mulai hari ini (00:00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // 2. Total In Hari Ini (Barang Masuk + Barang Retur Ke Etalase)
    const [incomingToday] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${warehouseIncomingItems.quantity} AS DECIMAL)), 0)`,
      })
      .from(warehouseIncomingItems)
      .leftJoin(
        warehouseIncomings,
        eq(warehouseIncomingItems.warehouseIncomingId, warehouseIncomings.id),
      )
      .where(
        and(
          eq(warehouseIncomings.vendorId, vendorId),
          gte(warehouseIncomings.createdAt, startOfToday),
        ),
      );

    const [returnGoodToday] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${warehouseReturnItems.quantity} AS DECIMAL)), 0)`,
      })
      .from(warehouseReturnItems)
      .leftJoin(
        warehouseReturns,
        eq(warehouseReturnItems.warehouseReturnId, warehouseReturns.id),
      )
      .where(
        and(
          eq(warehouseReturns.vendorId, vendorId),
          eq(warehouseReturnItems.returnType, "RESTOCK"),
          gte(warehouseReturns.createdAt, startOfToday),
        ),
      );

    // 3. Total Out Hari Ini (Barang Keluar)
    const [outgoingToday] = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${warehouseOutgoingItems.quantity} AS DECIMAL)), 0)`,
      })
      .from(warehouseOutgoingItems)
      .leftJoin(
        warehouseOutgoings,
        eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
      )
      .where(
        and(
          eq(warehouseOutgoings.vendorId, vendorId),
          gte(warehouseOutgoings.createdAt, startOfToday),
        ),
      );

    const inQty =
      parseFloat(incomingToday?.total || "0") +
      parseFloat(returnGoodToday?.total || "0");
    const outQty = parseFloat(outgoingToday?.total || "0");

    return {
      totalStock: Math.round(parseFloat(stockResult?.total || "0")),
      todayIn: Math.round(inQty),
      todayOut: Math.round(outQty),
    };
  } catch (error) {
    console.error("Get Warehouse Metrics Error:", error);
    return {
      totalStock: 0,
      todayIn: 0,
      todayOut: 0,
    };
  }
}
