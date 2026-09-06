"use server";

import { db } from "@/db";
import { units, sizes, colors } from "@/db/schema";
import { auth } from "@/auth";
import { eq, ilike, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Schema validation dengan transformasi string kosong "" menjadi undefined
const attributeSchema = z.object({
  id: z
    .string()
    .transform((val) => (val === "" ? undefined : val))
    .optional(),
  name: z.string().min(1, "Nama atribut wajib diisi"),
  type: z.enum(["unit", "size", "color"]),
});

export type AttributeState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

// 1. Fetcher Paginated dengan Live Search
export async function getPaginatedAttributes({
  type,
  search = "",
  page = 1,
  limit = 10,
}: {
  type: "unit" | "size" | "color";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return [];

  const offset = (page - 1) * limit;

  const getTable = () => {
    switch (type) {
      case "unit":
        return units;
      case "size":
        return sizes;
      case "color":
        return colors;
    }
  };

  const table = getTable();
  const conditions = [eq(table.vendorId, vendorId)];

  if (search) {
    conditions.push(ilike(table.name, `%${search}%`));
  }

  return await db
    .select()
    .from(table)
    .where(and(...conditions))
    .orderBy(desc(table.createdAt))
    .limit(limit)
    .offset(offset);
}

// 2. Upsert (Create / Update) Attribute
export async function upsertAttribute(
  prevState: AttributeState | undefined,
  formData: FormData,
): Promise<AttributeState> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { message: "Akses ditolak. Vendor ID tidak ditemukan." };
  }

  const idRaw = formData.get("id") as string;
  const name = formData.get("name") as string;
  const type = formData.get("type") as "unit" | "size" | "color";

  const validatedFields = attributeSchema.safeParse({
    id: idRaw || undefined,
    name,
    type,
  });

  if (!validatedFields.success) {
    console.log(
      "Validation errors:",
      validatedFields.error.flatten().fieldErrors,
    );
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi gagal. Periksa inputan Anda.",
    };
  }

  const { id, name: validatedName, type: validatedType } = validatedFields.data;

  try {
    const getTargetTable = () => {
      switch (validatedType) {
        case "unit":
          return units;
        case "size":
          return sizes;
        case "color":
          return colors;
      }
    };

    const table = getTargetTable();

    if (id) {
      // Update Data
      await db
        .update(table)
        .set({ name: validatedName, updatedAt: new Date() })
        .where(and(eq(table.id, id), eq(table.vendorId, vendorId)));
    } else {
      // Create Data Baru
      const newId = `${validatedType}_${Date.now()}`;
      await db.insert(table).values({
        id: newId,
        vendorId,
        name: validatedName,
      });
    }

    revalidatePath("/dashboard/attributes");
    return {
      success: true,
      message: `Data ${validatedType.toUpperCase()} "${validatedName}" berhasil disimpan.`,
    };
  } catch (error: any) {
    console.error(error);
    if (error.code === "23505") {
      return {
        message: `Nama ${validatedType.toUpperCase()} "${validatedName}" sudah ada.`,
      };
    }
    return { message: "Gagal menyimpan data ke database." };
  }
}

// 3. Delete Attribute
export async function deleteAttribute({
  id,
  type,
}: {
  id: string;
  type: "unit" | "size" | "color";
}): Promise<{ success: boolean; message: string }> {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  try {
    const getTargetTable = () => {
      switch (type) {
        case "unit":
          return units;
        case "size":
          return sizes;
        case "color":
          return colors;
      }
    };

    const table = getTargetTable();
    await db
      .delete(table)
      .where(and(eq(table.id, id), eq(table.vendorId, vendorId)));

    revalidatePath("/dashboard/attributes");
    return {
      success: true,
      message: `Data ${type.toUpperCase()} berhasil dihapus.`,
    };
  } catch (error) {
    console.error(error);
    return {
      success: false,
      message: `Gagal menghapus ${type}. Data mungkin masih terikat di modul lain.`,
    };
  }
}
