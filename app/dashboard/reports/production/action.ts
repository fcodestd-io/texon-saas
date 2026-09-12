"use server";

import { db } from "@/db";
import {
  cuttingTargets,
  cuttingTargetItems,
  cuttingTargetItemParts,
  productionLogs,
  productionLogParts,
  productionLogFinishingItems,
  warehouseIncomings,
  warehouseIncomingItems,
  employees,
  users,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

// ==========================================
// TYPES
// ==========================================
export interface ProductionLogPartDetail {
  partName: string;
  qty: number;
}

export interface ProductionLogDetail {
  id: string;
  category: "cutting" | "sewing" | "overdeck" | "finishing";
  employeeName: string;
  nextEmployeeName: string | null;
  recordedBy: string;
  createdAt: string;
  totalCompletedQty: number;
  totalDefectQty: number;
  partDetails: ProductionLogPartDetail[];
}

export interface PartWorkflowProgress {
  partName: string;
  targetQty: number;
  cuttingQty: number;
  sewingQty: number;
  overdeckQty: number;
}

export interface TargetItemWorkflow {
  id: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  targetQty: number;
  finishingQty: number;
  warehouseIncomingQty: number;
  warehouseReceiverName: string | null; // <-- TAMBAHAN NAMA PENERIMA GUDANG
  parts: PartWorkflowProgress[];
}

export interface TargetWorkflowReportItem {
  id: string;
  targetDate: string;
  title: string;
  status: "started" | "finished" | "canceled";
  createdByName: string;
  notes: string | null;
  finishedAt: string | null;
  createdAt: string;
  items: TargetItemWorkflow[];
  logs: ProductionLogDetail[];
}

function parseDbNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
}

export async function getProductionWorkflowReportAction(
  vendorId: string,
  year: number,
  month: number,
): Promise<TargetWorkflowReportItem[]> {
  const startDateStr = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDateStr = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  const targets = await db
    .select({
      id: cuttingTargets.id,
      targetDate: cuttingTargets.targetDate,
      title: cuttingTargets.title,
      status: cuttingTargets.status,
      notes: cuttingTargets.notes,
      finishedAt: cuttingTargets.finishedAt,
      createdAt: cuttingTargets.createdAt,
      createdByName: users.username,
    })
    .from(cuttingTargets)
    .innerJoin(users, eq(cuttingTargets.userId, users.id))
    .where(eq(cuttingTargets.vendorId, vendorId))
    .orderBy(desc(cuttingTargets.createdAt));

  if (targets.length === 0) return [];

  // Fetch Data Pendukung
  const [
    rawTargetItems,
    rawTargetParts,
    rawLogs,
    rawLogParts,
    rawLogFinishItems,
    rawIncomings,
    rawIncomingItems,
    rawEmployees,
  ] = await Promise.all([
    db.select().from(cuttingTargetItems),
    db.select().from(cuttingTargetItemParts),
    db
      .select({
        id: productionLogs.id,
        cuttingTargetId: productionLogs.cuttingTargetId,
        category: productionLogs.category,
        employeeId: productionLogs.employeeId,
        nextEmployeeId: productionLogs.nextEmployeeId,
        userId: productionLogs.userId,
        recordedBy: users.username,
        createdAt: productionLogs.createdAt,
      })
      .from(productionLogs)
      .innerJoin(users, eq(productionLogs.userId, users.id))
      .where(eq(productionLogs.vendorId, vendorId)),
    db.select().from(productionLogParts),
    db.select().from(productionLogFinishingItems),
    db
      .select({
        id: warehouseIncomings.id,
        cuttingTargetId: warehouseIncomings.cuttingTargetId,
        userId: warehouseIncomings.userId,
        receiverName: users.username, // <-- AMBIL NAMA PENERIMA DARI USERS
      })
      .from(warehouseIncomings)
      .leftJoin(users, eq(warehouseIncomings.userId, users.id))
      .where(eq(warehouseIncomings.vendorId, vendorId)),
    db.select().from(warehouseIncomingItems),
    db.select().from(employees).where(eq(employees.vendorId, vendorId)),
  ]);

  const employeeMap = new Map<string, string>();
  rawEmployees.forEach((e) => employeeMap.set(e.id, e.name));

  const targetPartMap = new Map<string, string>();
  rawTargetParts.forEach((p) => targetPartMap.set(p.id, p.partName));

  return targets.map((target) => {
    const targetItems = rawTargetItems.filter(
      (ti) => ti.cuttingTargetId === target.id,
    );
    const targetLogs = rawLogs.filter((l) => l.cuttingTargetId === target.id);
    const targetIncomings = rawIncomings.filter(
      (wi) => wi.cuttingTargetId === target.id,
    );

    const incomingIds = targetIncomings.map((i) => i.id);
    const relevantIncomingItems = rawIncomingItems.filter((ii) =>
      incomingIds.includes(ii.warehouseIncomingId),
    );

    const itemsWorkflow: TargetItemWorkflow[] = targetItems.map((item) => {
      const parts = rawTargetParts.filter(
        (p) => p.cuttingTargetItemId === item.id,
      );

      const partsProgress: PartWorkflowProgress[] = parts.map((part) => {
        const logPartsForThisPart = rawLogParts.filter(
          (lp) => lp.cuttingTargetItemPartId === part.id,
        );

        let cuttingQty = 0;
        let sewingQty = 0;
        let overdeckQty = 0;

        logPartsForThisPart.forEach((lp) => {
          const parentLog = targetLogs.find((l) => l.id === lp.productionLogId);
          if (parentLog) {
            const q = parseDbNumber(lp.qty);
            if (parentLog.category === "cutting") cuttingQty += q;
            if (parentLog.category === "sewing") sewingQty += q;
            if (parentLog.category === "overdeck") overdeckQty += q;
          }
        });

        return {
          partName: part.partName,
          targetQty: parseDbNumber(part.partTargetQty),
          cuttingQty,
          sewingQty,
          overdeckQty,
        };
      });

      const finishLogs = rawLogFinishItems.filter(
        (fi) => fi.cuttingTargetItemId === item.id,
      );
      const finishingQty = finishLogs.reduce(
        (acc, curr) => acc + parseDbNumber(curr.completedQty),
        0,
      );

      const incItems = relevantIncomingItems.filter(
        (ii) => ii.productVariantId === item.productVariantId,
      );
      const warehouseIncomingQty = incItems.reduce(
        (acc, curr) => acc + parseDbNumber(curr.quantity),
        0,
      );

      // Cari nama penerima gudang dari transaksi incoming terkait
      const matchedIncoming = targetIncomings.find((inc) =>
        incItems.some((ii) => ii.warehouseIncomingId === inc.id),
      );
      const warehouseReceiverName = matchedIncoming
        ? matchedIncoming.receiverName || "System"
        : null;

      return {
        id: item.id,
        productName: item.productNameSnapshot,
        sku: item.skuSnapshot,
        size: item.sizeSnapshot,
        color: item.colorSnapshot,
        targetQty: parseDbNumber(item.targetQty),
        finishingQty,
        warehouseIncomingQty,
        warehouseReceiverName, // <-- DIKIRIM KE CLIENT
        parts: partsProgress,
      };
    });

    const formattedLogs: ProductionLogDetail[] = targetLogs.map((log) => {
      let completed = 0;
      let defect = 0;
      const partDetails: ProductionLogPartDetail[] = [];

      if (log.category === "finishing") {
        const items = rawLogFinishItems.filter(
          (f) => f.productionLogId === log.id,
        );
        items.forEach((i) => {
          completed += parseDbNumber(i.completedQty);
          defect += parseDbNumber(i.defectQty);
        });
      } else {
        const parts = rawLogParts.filter((p) => p.productionLogId === log.id);
        parts.forEach((p) => {
          const q = parseDbNumber(p.qty);
          completed += q;
          defect += parseDbNumber(p.defectQty);

          const pName = targetPartMap.get(p.cuttingTargetItemPartId) || "Part";
          partDetails.push({
            partName: pName,
            qty: q,
          });
        });
      }

      return {
        id: log.id,
        category: log.category,
        employeeName: employeeMap.get(log.employeeId) || "Unknown",
        nextEmployeeName: log.nextEmployeeId
          ? employeeMap.get(log.nextEmployeeId) || null
          : null,
        recordedBy: log.recordedBy,
        createdAt: log.createdAt.toISOString(),
        totalCompletedQty: completed,
        totalDefectQty: defect,
        partDetails,
      };
    });

    return {
      id: target.id,
      targetDate: target.targetDate,
      title: target.title,
      status: target.status,
      createdByName: target.createdByName,
      notes: target.notes,
      finishedAt: target.finishedAt ? target.finishedAt.toISOString() : null,
      createdAt: target.createdAt.toISOString(),
      items: itemsWorkflow,
      logs: formattedLogs,
    };
  });
}
