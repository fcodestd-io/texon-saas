"use server";

import { db } from "@/db";
import {
  warehouseOutgoings,
  warehouseOutgoingItems,
  warehouseReturns,
  warehouseReturnItems,
  purchaseOrders,
  employeePayrolls,
  employees,
  users,
  marketplaces,
  productVariants,
  products,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, sql, gte, lte } from "drizzle-orm";

async function getVendorId() {
  const session = await auth();
  return (session?.user as any)?.vendorId || null;
}

/**
 * 1. Action Metrik Card Uang Masuk, Uang Keluar, Net Cashflow
 */
export async function getCashflowMetricsAction(
  monthStr: string,
  yearStr: string,
) {
  const vendorId = await getVendorId();
  if (!vendorId) return null;

  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  try {
    // A. UANG MASUK: Penjualan Real (Pasca Potong Fee Marketplace)
    const [salesRes] = await db
      .select({
        total: sql<string>`
          COALESCE(
            SUM(
              ${warehouseOutgoingItems.quantity} * ${productVariants.price} * 
              (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
            ), 
            0
          )
        `,
      })
      .from(warehouseOutgoingItems)
      .innerJoin(
        warehouseOutgoings,
        eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseOutgoingItems.productVariantId, productVariants.id),
      )
      .leftJoin(
        marketplaces,
        eq(warehouseOutgoings.marketplaceId, marketplaces.id),
      )
      .where(
        and(
          eq(warehouseOutgoings.vendorId, vendorId),
          gte(warehouseOutgoings.createdAt, startDate),
          lte(warehouseOutgoings.createdAt, endDate),
        ),
      );

    // B. UANG TDK JADI KELUAR / PENGERANG UANG MASUK (RETUR): Pasca Fee Marketplace
    const [returnsRes] = await db
      .select({
        total: sql<string>`
          COALESCE(
            SUM(
              ${warehouseReturnItems.quantity} * ${productVariants.price} * 
              (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
            ), 
            0
          )
        `,
      })
      .from(warehouseReturnItems)
      .innerJoin(
        warehouseReturns,
        eq(warehouseReturnItems.warehouseReturnId, warehouseReturns.id),
      )
      .innerJoin(
        productVariants,
        eq(warehouseReturnItems.productVariantId, productVariants.id),
      )
      .leftJoin(
        marketplaces,
        eq(warehouseReturns.marketplaceId, marketplaces.id),
      )
      .where(
        and(
          eq(warehouseReturns.vendorId, vendorId),
          gte(warehouseReturns.createdAt, startDate),
          lte(warehouseReturns.createdAt, endDate),
        ),
      );

    // C. UANG KELUAR 1: Purchase Order Completed (Actual Amount)
    const [poRes] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${purchaseOrders.totalActualAmount}), 0)`,
      })
      .from(purchaseOrders)
      .where(
        and(
          eq(purchaseOrders.vendorId, vendorId),
          eq(purchaseOrders.status, "delivered"),
          gte(purchaseOrders.createdAt, startDate),
          lte(purchaseOrders.createdAt, endDate),
        ),
      );

    // D. UANG KELUAR 2: Payroll Karyawan Terbayar
    const [payrollRes] = await db
      .select({
        total: sql<string>`COALESCE(SUM(${employeePayrolls.totalSalary}), 0)`,
      })
      .from(employeePayrolls)
      .where(
        and(
          eq(employeePayrolls.vendorId, vendorId),
          gte(employeePayrolls.createdAt, startDate),
          lte(employeePayrolls.createdAt, endDate),
        ),
      );

    const grossCashIn = parseFloat(salesRes?.total || "0");
    const returnAmount = parseFloat(returnsRes?.total || "0");
    const netCashIn = Math.max(0, grossCashIn - returnAmount);

    const poAmount = parseFloat(poRes?.total || "0");
    const payrollAmount = parseFloat(payrollRes?.total || "0");
    const totalCashOut = poAmount + payrollAmount;

    return {
      totalCashIn: netCashIn,
      totalCashOut,
      netCashflow: netCashIn - totalCashOut,
    };
  } catch (error) {
    console.error("Error Cashflow Metrics:", error);
    return null;
  }
}

export type CashflowLogItem = {
  id: string;
  date: string;
  type: "IN" | "OUT";
  category: "SALES" | "RETURN" | "PO" | "PAYROLL";
  title: string;
  amount: number;
  operatorName: string;
  notes: string;
};

/**
 * 2. Action Paginated Logs (Infinite Scroll + Filter IN/OUT/ALL)
 */
export async function getCashflowLogsPaginatedAction(
  monthStr: string,
  yearStr: string,
  page: number = 1,
  limit: number = 10,
  filterType: "ALL" | "IN" | "OUT" = "ALL",
) {
  const vendorId = await getVendorId();
  if (!vendorId) return { items: [], hasMore: false };

  const month = parseInt(monthStr, 10);
  const year = parseInt(yearStr, 10);

  const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  try {
    const logs: CashflowLogItem[] = [];

    // 1. Fetch Transaksi Penjualan (IN)
    if (filterType === "ALL" || filterType === "IN") {
      const salesLogs = await db
        .select({
          id: warehouseOutgoings.id,
          date: warehouseOutgoings.createdAt,
          refNo: warehouseOutgoings.referenceNumber,
          marketplaceName: marketplaces.name,
          username: users.username,
          totalAmount: sql<string>`
            COALESCE(
              SUM(
                ${warehouseOutgoingItems.quantity} * ${productVariants.price} * 
                (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
              ), 
              0
            )
          `,
        })
        .from(warehouseOutgoings)
        .innerJoin(
          warehouseOutgoingItems,
          eq(warehouseOutgoingItems.warehouseOutgoingId, warehouseOutgoings.id),
        )
        .innerJoin(
          productVariants,
          eq(warehouseOutgoingItems.productVariantId, productVariants.id),
        )
        .leftJoin(users, eq(warehouseOutgoings.userId, users.id))
        .leftJoin(
          marketplaces,
          eq(warehouseOutgoings.marketplaceId, marketplaces.id),
        )
        .where(
          and(
            eq(warehouseOutgoings.vendorId, vendorId),
            gte(warehouseOutgoings.createdAt, startDate),
            lte(warehouseOutgoings.createdAt, endDate),
          ),
        )
        .groupBy(
          warehouseOutgoings.id,
          warehouseOutgoings.createdAt,
          warehouseOutgoings.referenceNumber,
          marketplaces.name,
          users.username,
        );

      salesLogs.forEach((s) => {
        logs.push({
          id: `SALES-${s.id}`,
          date: s.date.toISOString(),
          type: "IN",
          category: "SALES",
          title: `Penjualan [${s.refNo}] - Marketplace: ${s.marketplaceName || "Direct"}`,
          amount: parseFloat(s.totalAmount || "0"),
          operatorName: s.username || "System",
          notes: "Uang Masuk Penjualan (Pasca Potong Fee Marketplace)",
        });
      });

      // Transaksi Retur (Pengurang Uang Masuk)
      const returnLogs = await db
        .select({
          id: warehouseReturns.id,
          date: warehouseReturns.createdAt,
          refNo: warehouseReturns.referenceNumber,
          username: users.username,
          totalAmount: sql<string>`
            COALESCE(
              SUM(
                ${warehouseReturnItems.quantity} * ${productVariants.price} * 
                (1 - COALESCE(${marketplaces.adminFeePercentage}, 0) / 100)
              ), 
              0
            )
          `,
        })
        .from(warehouseReturns)
        .innerJoin(
          warehouseReturnItems,
          eq(warehouseReturnItems.warehouseReturnId, warehouseReturns.id),
        )
        .innerJoin(
          productVariants,
          eq(warehouseReturnItems.productVariantId, productVariants.id),
        )
        .leftJoin(users, eq(warehouseReturns.userId, users.id))
        .leftJoin(
          marketplaces,
          eq(warehouseReturns.marketplaceId, marketplaces.id),
        )
        .where(
          and(
            eq(warehouseReturns.vendorId, vendorId),
            gte(warehouseReturns.createdAt, startDate),
            lte(warehouseReturns.createdAt, endDate),
          ),
        )
        .groupBy(
          warehouseReturns.id,
          warehouseReturns.createdAt,
          warehouseReturns.referenceNumber,
          users.username,
        );

      returnLogs.forEach((r) => {
        logs.push({
          id: `RET-${r.id}`,
          date: r.date.toISOString(),
          type: "IN",
          category: "RETURN",
          title: `Retur Penjualan [${r.refNo}]`,
          amount: -Math.abs(parseFloat(r.totalAmount || "0")),
          operatorName: r.username || "System",
          notes: "Pengurangan Uang Masuk akibat Retur Barang",
        });
      });
    }

    // 2. Fetch Transaksi Uang Keluar (OUT: PO & Payroll)
    if (filterType === "ALL" || filterType === "OUT") {
      const poLogs = await db
        .select({
          id: purchaseOrders.id,
          date: purchaseOrders.createdAt,
          poNumber: purchaseOrders.poNumber,
          category: purchaseOrders.category,
          amount: purchaseOrders.totalActualAmount,
          username: users.username,
        })
        .from(purchaseOrders)
        .leftJoin(users, eq(purchaseOrders.userId, users.id))
        .where(
          and(
            eq(purchaseOrders.vendorId, vendorId),
            eq(purchaseOrders.status, "delivered"),
            gte(purchaseOrders.createdAt, startDate),
            lte(purchaseOrders.createdAt, endDate),
          ),
        );

      poLogs.forEach((p) => {
        logs.push({
          id: `PO-${p.id}`,
          date: p.date.toISOString(),
          type: "OUT",
          category: "PO",
          title: `Pembelian Bahan Baku PO #${p.poNumber} (${p.category.toUpperCase()})`,
          amount: parseFloat(p.amount || "0"),
          operatorName: p.username || "System",
          notes: "Uang Keluar Pembelian PO Selesai/Delivered",
        });
      });

      const payrollLogs = await db
        .select({
          id: employeePayrolls.id,
          date: employeePayrolls.createdAt,
          empName: employees.name,
          empType: employees.type,
          amount: employeePayrolls.totalSalary,
          username: users.username,
          startDate: employeePayrolls.periodStartDate,
          endDate: employeePayrolls.periodEndDate,
        })
        .from(employeePayrolls)
        .innerJoin(employees, eq(employeePayrolls.employeeId, employees.id))
        .leftJoin(users, eq(employeePayrolls.userId, users.id))
        .where(
          and(
            eq(employeePayrolls.vendorId, vendorId),
            gte(employeePayrolls.createdAt, startDate),
            lte(employeePayrolls.createdAt, endDate),
          ),
        );

      payrollLogs.forEach((pay) => {
        logs.push({
          id: `PAY-${pay.id}`,
          date: pay.date.toISOString(),
          type: "OUT",
          category: "PAYROLL",
          title: `Gaji Karyawan: ${pay.empName} (Borongan ${pay.empType.toUpperCase()})`,
          amount: parseFloat(pay.amount || "0"),
          operatorName: pay.username || "Owner",
          notes: `Periode Kerja: ${pay.startDate} s/d ${pay.endDate}`,
        });
      });
    }

    // Urutkan Tanggal Terbaru
    logs.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );

    // Paginasi Memori
    const offset = (page - 1) * limit;
    const paginatedItems = logs.slice(offset, offset + limit);
    const hasMore = offset + limit < logs.length;

    return {
      items: paginatedItems,
      hasMore,
    };
  } catch (error) {
    console.error("Error Cashflow Logs:", error);
    return { items: [], hasMore: false };
  }
}
