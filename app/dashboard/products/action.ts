"use server";

import { db } from "@/db";
import {
  products,
  productVariants,
  productParts,
  productPartMaterials,
  materials,
  colors,
  sizes,
  units,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq, ilike, and, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export type ProductState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

function slugify(text: string) {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "-")
    .replace(/^-|-$/g, "");
}

function generateNumericBarcode(
  vendorId: string,
  sizeId: string,
  colorId: string,
): string {
  const vendorDigits = vendorId.replace(/\D/g, "").slice(-4) || "8888";
  const strCombo = `${sizeId}_${colorId}`;
  let hashNum = 0;
  for (let i = 0; i < strCombo.length; i++) {
    hashNum = (hashNum << 5) - hashNum + strCombo.charCodeAt(i);
    hashNum |= 0;
  }
  const positiveHash = Math.abs(hashNum).toString().padStart(4, "0").slice(-4);
  const timeDigits = Date.now().toString().slice(-6);

  return `${vendorDigits}${positiveHash}${timeDigits}`;
}

export async function getPaginatedProducts({
  search = "",
  page = 1,
  limit = 50,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return [];

  const offset = (page - 1) * limit;
  const conditions = [eq(products.vendorId, vendorId)];

  if (search) {
    conditions.push(ilike(products.name, `%${search}%`));
  }

  try {
    const productsList = await db
      .select({
        id: products.id,
        vendorId: products.vendorId,
        name: products.name,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(products)
      .where(and(...conditions))
      .orderBy(desc(products.createdAt))
      .limit(limit)
      .offset(offset);

    if (!productsList || productsList.length === 0) return [];

    const productIds = productsList.map((p) => p.id);

    const rawVariants = await db
      .select({
        id: productVariants.id,
        productId: productVariants.productId,
        sku: productVariants.sku,
        sizeId: productVariants.sizeId,
        colorId: productVariants.colorId,
        barcode: productVariants.barcode,
        price: productVariants.price,
        finishingPrice: productVariants.finishingPrice,
        stock: productVariants.stock,
      })
      .from(productVariants)
      .where(inArray(productVariants.productId, productIds));

    if (rawVariants.length === 0) {
      return productsList.map((p) => ({ ...p, variants: [] }));
    }

    const sizeIds = Array.from(
      new Set(rawVariants.map((v) => v.sizeId).filter(Boolean)),
    );
    const colorIds = Array.from(
      new Set(rawVariants.map((v) => v.colorId).filter(Boolean)),
    );

    const [sizesData, colorsData] = await Promise.all([
      sizeIds.length > 0
        ? db
            .select({ id: sizes.id, name: sizes.name })
            .from(sizes)
            .where(inArray(sizes.id, sizeIds))
        : [],
      colorIds.length > 0
        ? db
            .select({ id: colors.id, name: colors.name })
            .from(colors)
            .where(inArray(colors.id, colorIds))
        : [],
    ]);

    const sizeMap = new Map((sizesData || []).map((s) => [s.id, s.name]));
    const colorMap = new Map((colorsData || []).map((c) => [c.id, c.name]));

    const variantsList = rawVariants.map((v) => ({
      ...v,
      stock: String(v.stock ?? "0"),
      sizeName: sizeMap.get(v.sizeId) || "-",
      colorName: colorMap.get(v.colorId) || "-",
    }));

    const variantIds = variantsList.map((v) => v.id);

    let rawParts: any[] = [];
    let rawMaterials: any[] = [];

    if (variantIds.length > 0) {
      rawParts = await db
        .select({
          id: productParts.id,
          vendorId: productParts.vendorId,
          productVariantId: productParts.productVariantId,
          name: productParts.name,
          sequence: productParts.sequence,
          cuttingPrice: productParts.cuttingPrice,
          sewingPrice: productParts.sewingPrice,
          overdeckPrice: productParts.overdeckPrice,
          listPrice: productParts.listPrice,
          colorMode: productParts.colorMode,
          fixedColorId: productParts.fixedColorId,
        })
        .from(productParts)
        .where(inArray(productParts.productVariantId, variantIds))
        .orderBy(productParts.sequence);

      const partIds = rawParts.map((pt) => pt.id);

      if (partIds.length > 0) {
        rawMaterials = await db
          .select({
            id: productPartMaterials.id,
            productPartId: productPartMaterials.productPartId,
            materialId: productPartMaterials.materialId,
            materialColorId: productPartMaterials.materialColorId,
            quantity: productPartMaterials.quantity,
            consumptionUnitId: productPartMaterials.consumptionUnitId,
            wastePercentage: productPartMaterials.wastePercentage,
          })
          .from(productPartMaterials)
          .where(inArray(productPartMaterials.productPartId, partIds));
      }
    }

    return productsList.map((prod) => {
      const prodVariants = variantsList
        .filter((v) => v.productId === prod.id)
        .map((v) => {
          const vParts = rawParts
            .filter((pt) => pt.productVariantId === v.id)
            .map((pt) => {
              const ptMaterials = rawMaterials.filter(
                (pm) => pm.productPartId === pt.id,
              );
              return { ...pt, materials: ptMaterials };
            });
          return { ...v, parts: vParts };
        });

      return { ...prod, variants: prodVariants };
    });
  } catch (error) {
    console.error("Error getPaginatedProducts:", error);
    return [];
  }
}

export async function getProductOptions() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId)
    return {
      colorOptions: [],
      sizeOptions: [],
      materialOptions: [],
      unitOptions: [],
    };

  const [colorOptions, sizeOptions, materialsData, unitOptions] =
    await Promise.all([
      db
        .select({ id: colors.id, name: colors.name })
        .from(colors)
        .where(eq(colors.vendorId, vendorId))
        .orderBy(colors.name),
      db
        .select({ id: sizes.id, name: sizes.name })
        .from(sizes)
        .where(eq(sizes.vendorId, vendorId))
        .orderBy(sizes.name),
      db
        .select({
          id: materials.id,
          name: materials.name,
          category: materials.category,
          baseUnitId: materials.baseUnitId,
          purchasePrice: materials.purchasePrice,
          conversionValue: materials.conversionValue,
        })
        .from(materials)
        .where(eq(materials.vendorId, vendorId))
        .orderBy(materials.name),
      db
        .select({ id: units.id, name: units.name })
        .from(units)
        .where(eq(units.vendorId, vendorId))
        .orderBy(units.name),
    ]);

  return {
    colorOptions,
    sizeOptions,
    materialOptions: materialsData,
    unitOptions,
  };
}

export async function upsertFullProduct(
  prevState: ProductState | undefined,
  formData: FormData,
): Promise<ProductState> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { message: "Akses ditolak. Vendor ID tidak ditemukan." };
  }

  const productId = formData.get("id") as string;
  const productName = formData.get("name") as string;
  const payloadJSON = formData.get("payload") as string;

  if (!productName) {
    return { message: "Nama produk wajib diisi." };
  }

  let payload: any;
  try {
    payload = JSON.parse(payloadJSON || "{}");
  } catch (e) {
    return { message: "Format payload data tidak valid." };
  }

  if (!payload.selectedSizes?.length || !payload.selectedColors?.length) {
    return { message: "Minimal pilih 1 Ukuran dan 1 Warna pada Matrix." };
  }

  try {
    const targetProductId = productId || `prod_${Date.now()}`;

    // 1. Upsert Parent Product
    if (productId) {
      await db
        .update(products)
        .set({ name: productName, updatedAt: new Date() })
        .where(
          and(eq(products.id, productId), eq(products.vendorId, vendorId)),
        );
    } else {
      await db.insert(products).values({
        id: targetProductId,
        vendorId,
        name: productName,
      });
    }

    const existingVariants = await db
      .select({
        id: productVariants.id,
        sizeId: productVariants.sizeId,
        colorId: productVariants.colorId,
        barcode: productVariants.barcode,
      })
      .from(productVariants)
      .where(eq(productVariants.productId, targetProductId));

    const allSizes = await db
      .select({ id: sizes.id, name: sizes.name })
      .from(sizes);
    const allColors = await db
      .select({ id: colors.id, name: colors.name })
      .from(colors);

    const sizeMap = new Map((allSizes || []).map((s) => [s.id, s.name]));
    const colorMap = new Map((allColors || []).map((c) => [c.id, c.name]));

    // 2. Loop & Upsert Variants SKU beserta Parts & Materials
    for (const sId of payload.selectedSizes) {
      const sizeName = sizeMap.get(sId) || "";

      for (const cId of payload.selectedColors) {
        const colorName = colorMap.get(cId) || "";
        const comboKey = `${sId}_${cId}`;
        const varConfig = payload.variants[comboKey] || {
          price: 0,
          finishingPrice: 0,
        };

        const generatedSKU = `${slugify(productName)}-${slugify(colorName)}-${slugify(sizeName)}`;

        const existingVar = existingVariants.find(
          (ev) => ev.sizeId === sId && ev.colorId === cId,
        );

        const numericBarcode =
          varConfig.barcode && varConfig.barcode.trim() !== ""
            ? varConfig.barcode
            : existingVar?.barcode ||
              generateNumericBarcode(vendorId, sId, cId);

        const targetVariantId = existingVar
          ? existingVar.id
          : `pv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

        const sizeParts = payload.partsPerSize?.[sId] || [];

        if (existingVar) {
          // UPDATE DATA VARIAN / SKU
          await db
            .update(productVariants)
            .set({
              sku: generatedSKU,
              barcode: numericBarcode,
              price: (varConfig.price || 0).toString(),
              finishingPrice: (varConfig.finishingPrice || 0).toString(),
              updatedAt: new Date(),
            })
            .where(eq(productVariants.id, existingVar.id));

          // UPDATE/SINKRONISASI DAFTAR PART DENGAN DATABASE
          const currentDbParts = await db
            .select()
            .from(productParts)
            .where(eq(productParts.productVariantId, existingVar.id))
            .orderBy(productParts.sequence);

          for (let idx = 0; idx < sizeParts.length; idx++) {
            const pt = sizeParts[idx];
            const existingDbPart = currentDbParts[idx];

            if (existingDbPart) {
              // Update Part yang Sudah Ada
              await db
                .update(productParts)
                .set({
                  name: pt.name,
                  cuttingPrice: (pt.cuttingPrice || 0).toString(),
                  sewingPrice: (pt.sewingPrice || 0).toString(),
                  overdeckPrice: (pt.overdeckPrice || 0).toString(),
                  listPrice: (pt.listPrice || 0).toString(),
                  colorMode: pt.colorMode || "matching_sku",
                  fixedColorId:
                    pt.colorMode === "fixed_color"
                      ? pt.fixedColorId || null
                      : null,
                  updatedAt: new Date(),
                })
                .where(eq(productParts.id, existingDbPart.id));

              // Re-insert Material Bahan Baku
              await db
                .delete(productPartMaterials)
                .where(
                  eq(productPartMaterials.productPartId, existingDbPart.id),
                );

              if (pt.materials && pt.materials.length > 0) {
                const materialInserts = pt.materials.map((m: any) => ({
                  id: `ppm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  vendorId,
                  productPartId: existingDbPart.id,
                  materialId: m.materialId,
                  materialColorId: m.materialColorId || null,
                  quantity: (m.quantity || 0).toString(),
                  consumptionUnitId: m.consumptionUnitId,
                  wastePercentage: (m.wastePercentage || 0).toString(),
                }));

                await db.insert(productPartMaterials).values(materialInserts);
              }
            } else {
              // Insert Part Baru jika User Menambah Part saat Edit
              const newPartId = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
              await db.insert(productParts).values({
                id: newPartId,
                vendorId,
                productVariantId: existingVar.id,
                name: pt.name,
                sequence: idx + 1,
                cuttingPrice: (pt.cuttingPrice || 0).toString(),
                sewingPrice: (pt.sewingPrice || 0).toString(),
                overdeckPrice: (pt.overdeckPrice || 0).toString(),
                listPrice: (pt.listPrice || 0).toString(),
                colorMode: pt.colorMode || "matching_sku",
                fixedColorId:
                  pt.colorMode === "fixed_color"
                    ? pt.fixedColorId || null
                    : null,
              });

              if (pt.materials && pt.materials.length > 0) {
                const materialInserts = pt.materials.map((m: any) => ({
                  id: `ppm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                  vendorId,
                  productPartId: newPartId,
                  materialId: m.materialId,
                  materialColorId: m.materialColorId || null,
                  quantity: (m.quantity || 0).toString(),
                  consumptionUnitId: m.consumptionUnitId,
                  wastePercentage: (m.wastePercentage || 0).toString(),
                }));

                await db.insert(productPartMaterials).values(materialInserts);
              }
            }
          }
        } else {
          // INSERT KHUSUS VARIAN BARU
          await db.insert(productVariants).values({
            id: targetVariantId,
            vendorId,
            productId: targetProductId,
            sku: generatedSKU,
            sizeId: sId,
            colorId: cId,
            barcode: numericBarcode,
            price: (varConfig.price || 0).toString(),
            finishingPrice: (varConfig.finishingPrice || 0).toString(),
            stock: "0",
          });

          for (let idx = 0; idx < sizeParts.length; idx++) {
            const pt = sizeParts[idx];
            const partId = `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

            await db.insert(productParts).values({
              id: partId,
              vendorId,
              productVariantId: targetVariantId,
              name: pt.name,
              sequence: idx + 1,
              cuttingPrice: (pt.cuttingPrice || 0).toString(),
              sewingPrice: (pt.sewingPrice || 0).toString(),
              overdeckPrice: (pt.overdeckPrice || 0).toString(),
              listPrice: (pt.listPrice || 0).toString(),
              colorMode: pt.colorMode || "matching_sku",
              fixedColorId:
                pt.colorMode === "fixed_color" ? pt.fixedColorId || null : null,
            });

            if (pt.materials && pt.materials.length > 0) {
              const materialInserts = pt.materials.map((m: any) => ({
                id: `ppm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                vendorId,
                productPartId: partId,
                materialId: m.materialId,
                materialColorId: m.materialColorId || null,
                quantity: (m.quantity || 0).toString(),
                consumptionUnitId: m.consumptionUnitId,
                wastePercentage: (m.wastePercentage || 0).toString(),
              }));

              await db.insert(productPartMaterials).values(materialInserts);
            }
          }
        }
      }
    }

    revalidatePath("/dashboard/products");
    return {
      success: true,
      message: `Master Produk "${productName}" berhasil disimpan.`,
    };
  } catch (error: any) {
    console.error("UPSERT ERROR DETAIL:", error);
    return {
      message: `Gagal menyimpan: ${error?.message || "Terjadi kesalahan database."}`,
    };
  }
}

export async function deleteProduct(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  try {
    await db
      .delete(products)
      .where(and(eq(products.id, id), eq(products.vendorId, vendorId)));

    revalidatePath("/dashboard/products");
    return { success: true, message: "Produk berhasil dihapus." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Gagal menghapus produk." };
  }
}
