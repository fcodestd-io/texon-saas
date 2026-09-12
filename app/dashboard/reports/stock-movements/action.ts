"use server";

import { db } from "@/db";
import {
  materials,
  materialColors,
  materialStockMovements,
  products,
  productVariants,
  productStockMovements,
  colors,
  sizes,
  units,
} from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

// ==========================================
// TYPES
// ==========================================
export interface MovementLogItem {
  id: string;
  type: string;
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType: string | null;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
}

export interface MaterialColorStockItem {
  id: string;
  colorName: string;
  stock: number;
  purchaseStock: number;
}

export interface MaterialStockReportItem {
  id: string;
  name: string;
  category: "fabric" | "thread" | "accessory";
  baseUnitName: string;
  purchaseUnitName: string;
  conversionValue: number;
  totalStock: number;
  totalPurchaseStock: number;
  hasColors: boolean;
  colors: MaterialColorStockItem[];
}

export interface ProductVariantItem {
  id: string;
  sku: string;
  barcode: string | null;
  sizeName: string;
  colorName: string;
  price: number;
  stock: number;
}

export interface ProductStockGroupItem {
  id: string;
  name: string;
  totalStock: number;
  variants: ProductVariantItem[];
}

export interface StockMovementsReportData {
  materials: MaterialStockReportItem[];
  products: ProductStockGroupItem[];
}

// Helper parsing angka dari string decimal DB
function parseDbNumber(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const num = typeof val === "number" ? val : parseFloat(val);
  return isNaN(num) ? 0 : num;
}

// ==========================================
// 1. GET SUMMARY REPORT
// ==========================================
export async function getStockMovementsReportAction(
  vendorId: string,
): Promise<StockMovementsReportData> {
  const baseUnits = alias(units, "base_units");
  const purchaseUnits = alias(units, "purchase_units");

  const [rawMaterials, rawMaterialColors, rawProducts, rawProductVariants] =
    await Promise.all([
      db
        .select({
          id: materials.id,
          name: materials.name,
          category: materials.category,
          stock: materials.stock,
          conversionValue: materials.conversionValue,
          baseUnitName: baseUnits.name,
          purchaseUnitName: purchaseUnits.name,
        })
        .from(materials)
        .innerJoin(baseUnits, eq(materials.baseUnitId, baseUnits.id))
        .innerJoin(
          purchaseUnits,
          eq(materials.purchaseUnitId, purchaseUnits.id),
        )
        .where(eq(materials.vendorId, vendorId)),

      db
        .select({
          id: materialColors.id,
          materialId: materialColors.materialId,
          stock: materialColors.stock,
          colorName: colors.name,
        })
        .from(materialColors)
        .innerJoin(colors, eq(materialColors.colorId, colors.id))
        .where(eq(materialColors.vendorId, vendorId)),

      db
        .select({
          id: products.id,
          name: products.name,
        })
        .from(products)
        .where(eq(products.vendorId, vendorId)),

      db
        .select({
          id: productVariants.id,
          productId: productVariants.productId,
          sku: productVariants.sku,
          barcode: productVariants.barcode,
          price: productVariants.price,
          stock: productVariants.stock,
          sizeName: sizes.name,
          colorName: colors.name,
        })
        .from(productVariants)
        .innerJoin(sizes, eq(productVariants.sizeId, sizes.id))
        .innerJoin(colors, eq(productVariants.colorId, colors.id))
        .where(eq(productVariants.vendorId, vendorId)),
    ]);

  // Grouping Warna Bahan
  const materialColorMap = new Map<
    string,
    { id: string; colorName: string; stock: number }[]
  >();
  rawMaterialColors.forEach((mc) => {
    const list = materialColorMap.get(mc.materialId) || [];
    list.push({
      id: mc.id,
      colorName: mc.colorName,
      stock: parseDbNumber(mc.stock),
    });
    materialColorMap.set(mc.materialId, list);
  });

  const materialReportList: MaterialStockReportItem[] = rawMaterials.map(
    (mat) => {
      const isAccordionType =
        mat.category === "fabric" || mat.category === "thread";
      const colorsList = materialColorMap.get(mat.id) || [];
      const conversionVal = parseDbNumber(mat.conversionValue) || 1;
      const hasColors = isAccordionType && colorsList.length > 0;

      // AKUMULASI STOK: Jika ada varian warna, hitung SUM dari semua warna.
      // Jika tidak ada warna (Aksesoris), gunakan stok dari tabel material.
      const totalStock = hasColors
        ? colorsList.reduce((sum, c) => sum + c.stock, 0)
        : parseDbNumber(mat.stock);

      const totalPurchaseStock =
        conversionVal > 0 ? totalStock / conversionVal : 0;

      const formattedColors: MaterialColorStockItem[] = colorsList.map((c) => ({
        id: c.id,
        colorName: c.colorName,
        stock: c.stock,
        purchaseStock: conversionVal > 0 ? c.stock / conversionVal : 0,
      }));

      return {
        id: mat.id,
        name: mat.name,
        category: mat.category,
        baseUnitName: mat.baseUnitName,
        purchaseUnitName: mat.purchaseUnitName,
        conversionValue: conversionVal,
        totalStock: totalStock,
        totalPurchaseStock: totalPurchaseStock,
        hasColors: hasColors,
        colors: formattedColors,
      };
    },
  );

  // Grouping Varian Produk
  const variantMap = new Map<string, ProductVariantItem[]>();
  rawProductVariants.forEach((pv) => {
    const list = variantMap.get(pv.productId) || [];
    list.push({
      id: pv.id,
      sku: pv.sku,
      barcode: pv.barcode,
      sizeName: pv.sizeName,
      colorName: pv.colorName,
      price: parseDbNumber(pv.price),
      stock: parseDbNumber(pv.stock),
    });
    variantMap.set(pv.productId, list);
  });

  const productReportList: ProductStockGroupItem[] = rawProducts.map((p) => {
    const variants = variantMap.get(p.id) || [];
    const totalStock = variants.reduce((acc, v) => acc + v.stock, 0);

    return {
      id: p.id,
      name: p.name,
      totalStock,
      variants,
    };
  });

  return {
    materials: materialReportList,
    products: productReportList,
  };
}

// ==========================================
// 2. PAGINATED FETCH UNTUK MODAL KARTU STOK
// ==========================================
export async function getPaginatedMovementsAction(params: {
  vendorId: string;
  itemType: "MATERIAL" | "PRODUCT";
  itemId: string;
  materialColorId?: string | null;
  year: number;
  month: number;
  page: number;
  limit?: number;
}) {
  const {
    vendorId,
    itemType,
    itemId,
    materialColorId,
    year,
    month,
    page = 1,
    limit = 10,
  } = params;

  const startDate = new Date(Date.UTC(year, month - 1, 1));
  const endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  const offset = (page - 1) * limit;

  if (itemType === "MATERIAL") {
    const conditions = [
      eq(materialStockMovements.vendorId, vendorId),
      eq(materialStockMovements.materialId, itemId),
      gte(materialStockMovements.createdAt, startDate),
      lte(materialStockMovements.createdAt, endDate),
    ];

    if (materialColorId) {
      conditions.push(
        eq(materialStockMovements.materialColorId, materialColorId),
      );
    }

    const rows = await db
      .select({
        id: materialStockMovements.id,
        type: materialStockMovements.type,
        quantity: materialStockMovements.quantity,
        stockBefore: materialStockMovements.stockBefore,
        stockAfter: materialStockMovements.stockAfter,
        referenceType: materialStockMovements.referenceType,
        referenceId: materialStockMovements.referenceId,
        notes: materialStockMovements.notes,
        createdAt: materialStockMovements.createdAt,
      })
      .from(materialStockMovements)
      .where(and(...conditions))
      .orderBy(desc(materialStockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      quantity: parseDbNumber(r.quantity),
      stockBefore: parseDbNumber(r.stockBefore),
      stockAfter: parseDbNumber(r.stockAfter),
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));
  } else {
    const rows = await db
      .select({
        id: productStockMovements.id,
        type: productStockMovements.type,
        quantity: productStockMovements.quantity,
        stockBefore: productStockMovements.stockBefore,
        stockAfter: productStockMovements.stockAfter,
        referenceType: productStockMovements.referenceType,
        referenceId: productStockMovements.referenceId,
        notes: productStockMovements.notes,
        createdAt: productStockMovements.createdAt,
      })
      .from(productStockMovements)
      .where(
        and(
          eq(productStockMovements.vendorId, vendorId),
          eq(productStockMovements.productVariantId, itemId),
          gte(productStockMovements.createdAt, startDate),
          lte(productStockMovements.createdAt, endDate),
        ),
      )
      .orderBy(desc(productStockMovements.createdAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      id: r.id,
      type: r.type,
      quantity: parseDbNumber(r.quantity),
      stockBefore: parseDbNumber(r.stockBefore),
      stockAfter: parseDbNumber(r.stockAfter),
      referenceType: r.referenceType,
      referenceId: r.referenceId,
      notes: r.notes,
      createdAt: r.createdAt.toISOString(),
    }));
  }
}
