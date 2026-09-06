"use server";

import { db } from "@/db";
import { materials, materialColors, colors, units } from "@/db/schema";
import { auth } from "@/auth";
import { eq, ilike, and, desc, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const materialSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama bahan wajib diisi"),
  category: z.enum(["fabric", "thread", "accessory"]),
  baseUnitId: z.string().min(1, "Satuan pakai wajib dipilih"),
  purchaseUnitId: z.string().min(1, "Satuan beli wajib dipilih"),
  conversionValue: z.coerce.number().gt(0, "Nilai konversi harus lebih dari 0"),
  purchasePrice: z.coerce.number().min(0, "Harga beli harus positif"),
  selectedColors: z.array(z.string()).optional(),
});

export type MaterialState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

// 1. Fetcher Materials beserta Variants-nya
export async function getPaginatedMaterials({
  search = "",
  page = 1,
  limit = 20,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return [];

  const offset = (page - 1) * limit;
  const conditions = [eq(materials.vendorId, vendorId)];

  if (search) {
    conditions.push(
      or(
        ilike(materials.name, `%${search}%`),
        ilike(materials.category, `%${search}%`),
      )!,
    );
  }

  // Ambil Data Induk Bahan
  const materialsData = await db
    .select()
    .from(materials)
    .where(and(...conditions))
    .orderBy(desc(materials.createdAt))
    .limit(limit)
    .offset(offset);

  if (materialsData.length === 0) return [];

  const materialIds = materialsData.map((m) => m.id);

  // Ambil Data Varian Warna terkait
  const variantsData = await db
    .select({
      id: materialColors.id,
      materialId: materialColors.materialId,
      colorId: materialColors.colorId,
      stock: materialColors.stock,
      colorName: colors.name,
    })
    .from(materialColors)
    .leftJoin(colors, eq(materialColors.colorId, colors.id))
    .where(inArray(materialColors.materialId, materialIds));

  // Mapping & Nesting data variants ke dalam masing-masing material
  return materialsData.map((m) => ({
    ...m,
    variants: variantsData.filter((v) => v.materialId === m.id),
  }));
}

// 2. Fetcher Dropdown Options (Color & Unit)
export async function getMaterialOptions() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return { colorOptions: [], unitOptions: [] };

  const [colorOptions, unitOptions] = await Promise.all([
    db
      .select({ id: colors.id, name: colors.name })
      .from(colors)
      .where(eq(colors.vendorId, vendorId))
      .orderBy(colors.name),
    db
      .select({ id: units.id, name: units.name })
      .from(units)
      .where(eq(units.vendorId, vendorId))
      .orderBy(units.name),
  ]);

  return { colorOptions, unitOptions };
}

// 3. Upsert Material & Sync Colors (Menangani Relasi ke material_colors)
export async function syncMaterialGroup(
  prevState: MaterialState | undefined,
  formData: FormData,
): Promise<MaterialState> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { message: "Akses ditolak. Vendor ID tidak ditemukan." };
  }

  const idRaw = formData.get("id") as string;
  const name = formData.get("name") as string;
  const category = formData.get("category") as
    | "fabric"
    | "thread"
    | "accessory";
  const baseUnitId = formData.get("baseUnitId") as string;
  const purchaseUnitId = formData.get("purchaseUnitId") as string;
  const conversionValue = formData.get("conversionValue") as string;
  const purchasePrice = formData.get("purchasePrice") as string;
  const selectedColors = formData.getAll("selectedColors") as string[];

  const validatedFields = materialSchema.safeParse({
    id: idRaw || undefined,
    name,
    category,
    baseUnitId,
    purchaseUnitId,
    conversionValue,
    purchasePrice,
    selectedColors,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi gagal. Silakan periksa inputan Anda.",
    };
  }

  const {
    id,
    name: validName,
    category: validCat,
    baseUnitId: vBase,
    purchaseUnitId: vPurch,
    conversionValue: vConv,
    purchasePrice: vPrice,
  } = validatedFields.data;

  try {
    const matId =
      id || `mat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (id) {
      // Edit Induk
      await db
        .update(materials)
        .set({
          name: validName,
          category: validCat,
          baseUnitId: vBase,
          purchaseUnitId: vPurch,
          conversionValue: vConv.toString(),
          purchasePrice: vPrice.toString(),
          updatedAt: new Date(),
        })
        .where(and(eq(materials.id, id), eq(materials.vendorId, vendorId)));
    } else {
      // Create Induk
      await db.insert(materials).values({
        id: matId,
        vendorId,
        name: validName,
        category: validCat,
        baseUnitId: vBase,
        purchaseUnitId: vPurch,
        conversionValue: vConv.toString(),
        purchasePrice: vPrice.toString(),
        stock: "0",
      });
    }

    // Kelola Varian Warna di tabel material_colors
    if (validCat !== "accessory") {
      const existingVariants = await db
        .select({ colorId: materialColors.colorId })
        .from(materialColors)
        .where(eq(materialColors.materialId, matId));

      const existingColorIds = existingVariants.map((v) => v.colorId);

      const colorsToAdd = selectedColors.filter(
        (cId) => !existingColorIds.includes(cId),
      );
      const colorsToRemove = existingColorIds.filter(
        (cId) => !selectedColors.includes(cId),
      );

      // Hapus varian yang uncheck
      if (colorsToRemove.length > 0) {
        await db
          .delete(materialColors)
          .where(
            and(
              eq(materialColors.materialId, matId),
              inArray(materialColors.colorId, colorsToRemove),
            ),
          );
      }

      // Insert varian baru
      if (colorsToAdd.length > 0) {
        const batchInserts = colorsToAdd.map((cId) => ({
          id: `mc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          vendorId,
          materialId: matId,
          colorId: cId,
          stock: "0",
        }));
        await db.insert(materialColors).values(batchInserts);
      }
    } else {
      // Jika diubah jadi accessory, hapus semua warna terkait (jika ada)
      await db
        .delete(materialColors)
        .where(eq(materialColors.materialId, matId));
    }

    revalidatePath("/dashboard/materials");
    return {
      success: true,
      message: `Berhasil menyinkronkan data bahan "${validName}".`,
    };
  } catch (error) {
    console.error(error);
    return { message: "Gagal menyimpan data bahan ke database." };
  }
}

// 4. Delete Entire Material (Cascade deletes colors based on Schema)
export async function deleteMaterial(
  id: string,
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  try {
    await db
      .delete(materials)
      .where(and(eq(materials.id, id), eq(materials.vendorId, vendorId)));
    revalidatePath("/dashboard/materials");
    return {
      success: true,
      message: "Data bahan beserta seluruh variannya berhasil dihapus.",
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: "Gagal menghapus bahan. Data mungkin terikat dengan BOM Produk.",
    };
  }
}

// 5. Delete Specific Variant Only
export async function deleteMaterialVariant(
  variantId: string,
): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    await db
      .delete(materialColors)
      .where(
        and(
          eq(materialColors.id, variantId),
          eq(materialColors.vendorId, vendorId),
        ),
      );
    revalidatePath("/dashboard/materials");
    return { success: true, message: "Varian warna berhasil dihapus." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Gagal menghapus varian." };
  }
}
