"use server";

import { db } from "@/db";
import { employees } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, ilike, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const employeeTypeEnum = z.enum([
  "sewing",
  "cutting",
  "overdeck",
  "finishing",
  "packing",
]);

const employeeFormSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Nama karyawan wajib diisi")
    .min(2, "Nama minimal 2 karakter"),
  type: employeeTypeEnum,
});

export async function getEmployees(searchQuery?: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return [];

  try {
    const conditions = [eq(employees.vendorId, vendorId)];

    if (searchQuery) {
      conditions.push(ilike(employees.name, `%${searchQuery}%`));
    }

    const data = await db
      .select({
        id: employees.id,
        vendorId: employees.vendorId,
        name: employees.name,
        type: employees.type,
        createdAt: employees.createdAt,
        updatedAt: employees.updatedAt,
      })
      .from(employees)
      .where(and(...conditions))
      .orderBy(desc(employees.createdAt));

    return data;
  } catch (error) {
    console.error("Error getEmployees:", error);
    return [];
  }
}

export async function upsertEmployee(prevState: any, formData: FormData) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return {
      success: false,
      message: "Akses ditolak. Vendor ID tidak ditemukan.",
    };
  }

  const rawData = {
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name")?.toString() || "",
    type: formData.get("type")?.toString() || "sewing",
  };

  const parsed = employeeFormSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      message: "Validasi gagal. Periksa data inputan.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, name, type } = parsed.data;

  try {
    if (id) {
      await db
        .update(employees)
        .set({ name, type, updatedAt: new Date() })
        .where(and(eq(employees.id, id), eq(employees.vendorId, vendorId)));

      revalidatePath("/dashboard/employees");
      return {
        success: true,
        message: `Karyawan "${name}" berhasil diperbarui.`,
      };
    } else {
      await db.insert(employees).values({
        id: `emp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        vendorId,
        name,
        type,
      });

      revalidatePath("/dashboard/employees");
      return {
        success: true,
        message: `Karyawan "${name}" berhasil ditambahkan.`,
      };
    }
  } catch (error: any) {
    console.error("UPSERT EMPLOYEE ERROR:", error);
    return {
      success: false,
      message: error?.message || "Gagal menyimpan data karyawan.",
    };
  }
}

export async function deleteEmployee(id: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  try {
    await db
      .delete(employees)
      .where(and(eq(employees.id, id), eq(employees.vendorId, vendorId)));

    revalidatePath("/dashboard/employees");
    return { success: true, message: "Karyawan borongan berhasil dihapus." };
  } catch (error) {
    console.error("DELETE EMPLOYEE ERROR:", error);
    return { success: false, message: "Gagal menghapus karyawan." };
  }
}
