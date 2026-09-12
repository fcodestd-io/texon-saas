"use server";

import { db } from "@/db";
import {
  employees,
  productionLogs,
  productionLogParts,
  productionLogFinishingItems,
  cuttingTargetItems,
  cuttingTargetItemParts,
  productParts,
  productVariants,
  vendors,
  employeePayrolls,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, gte, lte } from "drizzle-orm";

async function getVendorInfo() {
  const session = await auth();
  const user = session?.user as any;
  if (!user?.vendorId) return null;

  const [vendor] = await db
    .select({ id: vendors.id, brandName: vendors.brandName })
    .from(vendors)
    .where(eq(vendors.id, user.vendorId));

  return {
    vendorId: user.vendorId,
    userId: user.id,
    brandName: vendor?.brandName || "",
  };
}

export async function getWeeklyPayrollDataAction(startDateStr: string) {
  const vendorInfo = await getVendorInfo();
  if (!vendorInfo) return { brandName: "", payrollData: [] };

  const { vendorId } = vendorInfo;

  const startDate = new Date(`${startDateStr}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const endDateStr = endDate.toISOString().split("T")[0];

  try {
    const allMasterParts = await db
      .select({
        id: productParts.id,
        productVariantId: productParts.productVariantId,
        name: productParts.name,
        cuttingPrice: productParts.cuttingPrice,
        sewingPrice: productParts.sewingPrice,
        overdeckPrice: productParts.overdeckPrice,
        listPrice: productParts.listPrice,
      })
      .from(productParts)
      .where(eq(productParts.vendorId, vendorId));

    const allEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        type: employees.type,
      })
      .from(employees)
      .where(eq(employees.vendorId, vendorId))
      .orderBy(employees.type, employees.name);

    // Fetch Status Payroll yang Sudah Dibayar pada Periode Ini
    const existingPayrolls = await db
      .select({
        employeeId: employeePayrolls.employeeId,
        totalSalary: employeePayrolls.totalSalary,
        createdAt: employeePayrolls.createdAt,
      })
      .from(employeePayrolls)
      .where(
        and(
          eq(employeePayrolls.vendorId, vendorId),
          eq(employeePayrolls.periodStartDate, startDateStr),
        ),
      );

    const paidMap = new Map<string, { totalSalary: number; paidAt: Date }>();
    existingPayrolls.forEach((p) => {
      paidMap.set(p.employeeId, {
        totalSalary: parseFloat(p.totalSalary || "0"),
        paidAt: p.createdAt,
      });
    });

    const partLogs = await db
      .select({
        employeeId: productionLogs.employeeId,
        createdAt: productionLogs.createdAt,
        qty: productionLogParts.qty,
        productPartIdInLog: productionLogParts.productPartId,
        productVariantId: cuttingTargetItems.productVariantId,
        productName: cuttingTargetItems.productNameSnapshot,
        partName: cuttingTargetItemParts.partName,
        category: productionLogs.category,
        cuttingPrice: productParts.cuttingPrice,
        sewingPrice: productParts.sewingPrice,
        overdeckPrice: productParts.overdeckPrice,
      })
      .from(productionLogParts)
      .innerJoin(
        productionLogs,
        eq(productionLogParts.productionLogId, productionLogs.id),
      )
      .innerJoin(
        cuttingTargetItemParts,
        eq(
          productionLogParts.cuttingTargetItemPartId,
          cuttingTargetItemParts.id,
        ),
      )
      .innerJoin(
        cuttingTargetItems,
        eq(cuttingTargetItemParts.cuttingTargetItemId, cuttingTargetItems.id),
      )
      .leftJoin(
        productParts,
        eq(productionLogParts.productPartId, productParts.id),
      )
      .where(
        and(
          eq(productionLogs.vendorId, vendorId),
          gte(productionLogs.createdAt, startDate),
          lte(productionLogs.createdAt, endDate),
        ),
      );

    const finishingLogs = await db
      .select({
        employeeId: productionLogs.employeeId,
        createdAt: productionLogs.createdAt,
        completedQty: productionLogFinishingItems.completedQty,
        productName: cuttingTargetItems.productNameSnapshot,
        finishingPrice: productVariants.finishingPrice,
      })
      .from(productionLogFinishingItems)
      .innerJoin(
        productionLogs,
        eq(productionLogFinishingItems.productionLogId, productionLogs.id),
      )
      .innerJoin(
        cuttingTargetItems,
        eq(
          productionLogFinishingItems.cuttingTargetItemId,
          cuttingTargetItems.id,
        ),
      )
      .leftJoin(
        productVariants,
        eq(productionLogFinishingItems.productVariantId, productVariants.id),
      )
      .where(
        and(
          eq(productionLogs.vendorId, vendorId),
          gte(productionLogs.createdAt, startDate),
          lte(productionLogs.createdAt, endDate),
        ),
      );

    const payrollData = allEmployees.map((emp) => {
      const dailyDetails: Record<number, any[]> = {
        0: [],
        1: [],
        2: [],
        3: [],
        4: [],
        5: [],
        6: [],
      };

      let totalWeeklySalary = 0;

      partLogs
        .filter((l) => l.employeeId === emp.id)
        .forEach((log) => {
          const logDate = new Date(log.createdAt);
          let dayIdx = logDate.getDay() - 1;
          if (dayIdx === -1) dayIdx = 6;

          const qty = parseFloat(log.qty || "0");
          let cuttingPrice = log.cuttingPrice;
          let sewingPrice = log.sewingPrice;
          let overdeckPrice = log.overdeckPrice;

          if (!log.productPartIdInLog) {
            const matchedPart = allMasterParts.find(
              (p) =>
                p.productVariantId === log.productVariantId &&
                p.name.trim().toLowerCase() ===
                  log.partName.trim().toLowerCase(),
            );
            if (matchedPart) {
              cuttingPrice = matchedPart.cuttingPrice;
              sewingPrice = matchedPart.sewingPrice;
              overdeckPrice = matchedPart.overdeckPrice;
            }
          }

          let unitPrice = 0;
          if (log.category === "cutting")
            unitPrice = parseFloat(cuttingPrice || "0");
          else if (log.category === "sewing")
            unitPrice = parseFloat(sewingPrice || "0");
          else if (log.category === "overdeck")
            unitPrice = parseFloat(overdeckPrice || "0");

          const subtotal = qty * unitPrice;
          totalWeeklySalary += subtotal;

          if (qty > 0) {
            let productGroup = dailyDetails[dayIdx].find(
              (g) => g.productName === log.productName,
            );

            if (!productGroup) {
              productGroup = {
                productName: log.productName,
                isNested: true,
                parts: [],
              };
              dailyDetails[dayIdx].push(productGroup);
            }

            const existingPart = productGroup.parts.find(
              (p: any) =>
                p.partName.trim().toLowerCase() ===
                log.partName.trim().toLowerCase(),
            );

            if (existingPart) {
              existingPart.qty += qty;
              existingPart.subtotal += subtotal;
            } else {
              productGroup.parts.push({
                partName: log.partName || "Part",
                qty,
                price: unitPrice,
                subtotal,
              });
            }
          }
        });

      finishingLogs
        .filter((l) => l.employeeId === emp.id)
        .forEach((log) => {
          const logDate = new Date(log.createdAt);
          let dayIdx = logDate.getDay() - 1;
          if (dayIdx === -1) dayIdx = 6;

          const qty = parseFloat(log.completedQty || "0");
          const unitPrice = parseFloat(log.finishingPrice || "0");
          const subtotal = qty * unitPrice;
          totalWeeklySalary += subtotal;

          if (qty > 0) {
            const productName = `${log.productName} (Finishing)`;
            const existingFinishing = dailyDetails[dayIdx].find(
              (item) => item.productName === productName,
            );

            if (existingFinishing) {
              existingFinishing.qty += qty;
              existingFinishing.subtotal += subtotal;
            } else {
              dailyDetails[dayIdx].push({
                productName,
                isNested: false,
                qty,
                price: unitPrice,
                subtotal,
              });
            }
          }
        });

      const isPaid = paidMap.has(emp.id);

      return {
        ...emp,
        totalWeeklySalary,
        dailyDetails,
        isPaid,
        paidAt: isPaid ? paidMap.get(emp.id)?.paidAt : null,
      };
    });

    return {
      brandName: vendorInfo.brandName,
      payrollData,
      periodEndDate: endDateStr,
    };
  } catch (error) {
    console.error("Error fetching payroll data:", error);
    return {
      brandName: vendorInfo.brandName,
      payrollData: [],
      periodEndDate: "",
    };
  }
}

/**
 * Action Insert Payroll Record ketika Owner Cetak Slip
 */
export async function recordEmployeePayrollAction(
  employeeId: string,
  periodStartDate: string,
  periodEndDate: string,
  totalSalary: number,
) {
  const vendorInfo = await getVendorInfo();
  if (!vendorInfo) return { success: false, message: "Unauthorized" };

  try {
    const payrollId = `PRL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    await db
      .insert(employeePayrolls)
      .values({
        id: payrollId,
        vendorId: vendorInfo.vendorId,
        employeeId,
        userId: vendorInfo.userId,
        periodStartDate,
        periodEndDate,
        totalSalary: totalSalary.toString(),
      })
      .onConflictDoNothing();

    return { success: true };
  } catch (error) {
    console.error("Error recording payroll:", error);
    return { success: false, message: "Gagal menyimpan record payroll" };
  }
}
