"use server";

import { db } from "@/db";
import {
  warehouseOutgoings,
  warehouseOutgoingItems,
  warehouseReturns,
  warehouseReturnItems,
  marketplaces,
  productVariants,
  products,
  sizes,
  colors,
  users,
} from "@/db/schema";
import { eq, and, sql, gte, lte } from "drizzle-orm";

export interface DailyChartData {
  day: number;
  netOmset: number;
  returnAmount: number; // Nominal return bersih (setelah dipotong admin fee)
}

export interface ReturnLogItem {
  id: string;
  referenceNumber: string;
  marketplaceName: string;
  adminFeePercentage: number;
  returnType: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  quantity: number;
  price: number;
  grossSubtotal: number;
  netSubtotal: number; // Setelah dipotong admin fee
  reason: string | null;
  createdAt: string;
  recordedBy: string; // <-- Tambahan field Operator
}

export interface SalesReportData {
  summary: {
    grossSales: number;
    totalNetOmset: number;
    totalReturnAmount: number; // Net return
    totalItemsSold: number;
    totalReturnsQty: number;
  };
  dailyChart: DailyChartData[];
  marketplaceShare: {
    id: string | null;
    name: string;
    totalQty: number;
    netOmset: number;
  }[];
  invoices: {
    id: string;
    marketplaceId: string | null;
    referenceNumber: string;
    marketplaceName: string;
    adminFeePercentage: number;
    createdAt: string;
    notes: string | null;
    recordedBy: string; // <-- Tambahan field Operator
    grossTotal: number;
    netTotal: number;
    items: {
      id: string;
      productName: string;
      sku: string;
      size: string;
      color: string;
      quantity: number;
      price: number;
      subtotal: number;
    }[];
  }[];
  returnLogs: ReturnLogItem[];
}

export async function getSalesReportAction(
  vendorId: string,
  year: number,
  month: number,
): Promise<SalesReportData> {
  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getDate();
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const dailyChartMap = new Map<
    number,
    { netOmset: number; returnAmount: number }
  >();
  for (let d = 1; d <= lastDayOfMonth; d++) {
    dailyChartMap.set(d, { netOmset: 0, returnAmount: 0 });
  }

  // 1. Ambil Data Outgoings (Sales) + Left Join Users
  const rawOutgoings = await db
    .select({
      outgoingId: warehouseOutgoings.id,
      marketplaceId: warehouseOutgoings.marketplaceId,
      referenceNumber: warehouseOutgoings.referenceNumber,
      notes: warehouseOutgoings.notes,
      createdAt: warehouseOutgoings.createdAt,
      recordedBy: sql<string>`COALESCE(${users.username}, 'System')`,
      marketplaceName: sql<string>`COALESCE(${marketplaces.name}, 'Direct / Offline')`,
      adminFeePercentage: sql<number>`COALESCE(${marketplaces.adminFeePercentage}, 0)`,
      itemId: warehouseOutgoingItems.id,
      quantity: warehouseOutgoingItems.quantity,
      price: productVariants.price,
      productName: products.name,
      sku: productVariants.sku,
      size: sizes.name,
      color: colors.name,
    })
    .from(warehouseOutgoings)
    .leftJoin(
      marketplaces,
      eq(warehouseOutgoings.marketplaceId, marketplaces.id),
    )
    .leftJoin(users, eq(warehouseOutgoings.userId, users.id))
    .innerJoin(
      warehouseOutgoingItems,
      eq(warehouseOutgoings.id, warehouseOutgoingItems.warehouseOutgoingId),
    )
    .innerJoin(
      productVariants,
      eq(warehouseOutgoingItems.productVariantId, productVariants.id),
    )
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .innerJoin(colors, eq(productVariants.colorId, colors.id))
    .where(
      and(
        eq(warehouseOutgoings.vendorId, vendorId),
        gte(warehouseOutgoings.createdAt, startDate),
        lte(warehouseOutgoings.createdAt, endDate),
      ),
    );

  // 2. Ambil Data Returns (Termasuk Admin Fee Marketplace) + Left Join Users
  const rawReturns = await db
    .select({
      returnId: warehouseReturns.id,
      marketplaceId: warehouseReturns.marketplaceId,
      referenceNumber: warehouseReturns.referenceNumber,
      createdAt: warehouseReturns.createdAt,
      recordedBy: sql<string>`COALESCE(${users.username}, 'System')`,
      marketplaceName: sql<string>`COALESCE(${marketplaces.name}, 'Direct / Offline')`,
      adminFeePercentage: sql<number>`COALESCE(${marketplaces.adminFeePercentage}, 0)`,
      itemId: warehouseReturnItems.id,
      returnType: warehouseReturnItems.returnType,
      quantity: warehouseReturnItems.quantity,
      reason: warehouseReturnItems.reason,
      price: productVariants.price,
      productName: products.name,
      sku: productVariants.sku,
      size: sizes.name,
      color: colors.name,
    })
    .from(warehouseReturns)
    .leftJoin(marketplaces, eq(warehouseReturns.marketplaceId, marketplaces.id))
    .leftJoin(users, eq(warehouseReturns.userId, users.id))
    .innerJoin(
      warehouseReturnItems,
      eq(warehouseReturns.id, warehouseReturnItems.warehouseReturnId),
    )
    .innerJoin(
      productVariants,
      eq(warehouseReturnItems.productVariantId, productVariants.id),
    )
    .innerJoin(products, eq(productVariants.productId, products.id))
    .innerJoin(sizes, eq(productVariants.sizeId, sizes.id))
    .innerJoin(colors, eq(productVariants.colorId, colors.id))
    .where(
      and(
        eq(warehouseReturns.vendorId, vendorId),
        gte(warehouseReturns.createdAt, startDate),
        lte(warehouseReturns.createdAt, endDate),
      ),
    );

  // 3. Olah Data Return (Potong Admin Fee)
  let totalReturnAmount = 0;
  let totalReturnsQty = 0;
  const returnLogs: ReturnLogItem[] = [];

  rawReturns.forEach((ret) => {
    const qty = Number(ret.quantity);
    const price = Number(ret.price);
    const grossSubtotal = qty * price;
    const adminFee = Number(ret.adminFeePercentage);

    const netSubtotal = grossSubtotal * (1 - adminFee / 100);
    const day = new Date(ret.createdAt).getDate();

    totalReturnsQty += qty;
    totalReturnAmount += netSubtotal;

    const currentDaily = dailyChartMap.get(day);
    if (currentDaily) {
      currentDaily.returnAmount += netSubtotal;
    }

    returnLogs.push({
      id: ret.itemId,
      referenceNumber: ret.referenceNumber,
      marketplaceName: ret.marketplaceName,
      adminFeePercentage: adminFee,
      returnType: ret.returnType,
      productName: ret.productName,
      sku: ret.sku,
      size: ret.size,
      color: ret.color,
      quantity: qty,
      price: price,
      grossSubtotal: grossSubtotal,
      netSubtotal: netSubtotal,
      reason: ret.reason,
      createdAt: ret.createdAt.toISOString(),
      recordedBy: ret.recordedBy,
    });
  });

  // 4. Olah Data Sales / Invoices
  const invoicesMap = new Map<string, any>();
  const marketplaceMap = new Map<
    string,
    { id: string | null; name: string; totalQty: number; netOmset: number }
  >();

  let grossSales = 0;
  let totalNetOmset = 0;
  let totalItemsSold = 0;

  for (const row of rawOutgoings) {
    const qty = Number(row.quantity);
    const price = Number(row.price);
    const subtotal = qty * price;
    const adminFee = Number(row.adminFeePercentage);
    const netSubtotal = subtotal * (1 - adminFee / 100);
    const day = new Date(row.createdAt).getDate();

    grossSales += subtotal;
    totalNetOmset += netSubtotal;
    totalItemsSold += qty;

    const currentDaily = dailyChartMap.get(day);
    if (currentDaily) {
      currentDaily.netOmset += netSubtotal;
    }

    const mktKey = row.marketplaceName;
    const existingMkt = marketplaceMap.get(mktKey) || {
      id: row.marketplaceId,
      name: mktKey,
      totalQty: 0,
      netOmset: 0,
    };
    existingMkt.totalQty += qty;
    existingMkt.netOmset += netSubtotal;
    marketplaceMap.set(mktKey, existingMkt);

    if (!invoicesMap.has(row.outgoingId)) {
      invoicesMap.set(row.outgoingId, {
        id: row.outgoingId,
        marketplaceId: row.marketplaceId,
        referenceNumber: row.referenceNumber,
        marketplaceName: row.marketplaceName,
        adminFeePercentage: adminFee,
        createdAt: row.createdAt.toISOString(),
        notes: row.notes,
        recordedBy: row.recordedBy,
        grossTotal: 0,
        netTotal: 0,
        items: [],
      });
    }

    const inv = invoicesMap.get(row.outgoingId);
    inv.grossTotal += subtotal;
    inv.netTotal += netSubtotal;
    inv.items.push({
      id: row.itemId,
      productName: row.productName,
      sku: row.sku,
      size: row.size,
      color: row.color,
      quantity: qty,
      price: price,
      subtotal: subtotal,
    });
  }

  const dailyChart: DailyChartData[] = Array.from(dailyChartMap.entries()).map(
    ([day, val]) => ({
      day,
      netOmset: val.netOmset,
      returnAmount: val.returnAmount,
    }),
  );

  return {
    summary: {
      grossSales,
      totalNetOmset,
      totalReturnAmount,
      totalItemsSold,
      totalReturnsQty,
    },
    dailyChart,
    marketplaceShare: Array.from(marketplaceMap.values()),
    invoices: Array.from(invoicesMap.values()),
    returnLogs,
  };
}
