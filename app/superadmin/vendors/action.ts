"use server";

import { db } from "@/db";
import { vendors, users } from "@/db/schema";
import { auth } from "@/auth";
import { eq, ilike, or, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Fetcher untuk Infinite Scroll & Live Search
export async function getPaginatedVendors({
  search = "",
  page = 1,
  limit = 10,
}: {
  search?: string;
  page?: number;
  limit?: number;
}) {
  const offset = (page - 1) * limit;

  const whereClause = search
    ? or(
        ilike(vendors.brandName, `%${search}%`),
        ilike(vendors.phone, `%${search}%`),
        ilike(vendors.address, `%${search}%`),
      )
    : undefined;

  const data = await db
    .select()
    .from(vendors)
    .where(whereClause)
    .orderBy(desc(vendors.createdAt))
    .limit(limit)
    .offset(offset);

  return data;
}

const createVendorSchema = z.object({
  brandName: z.string().min(2, "Nama brand minimal 2 karakter"),
  phone: z.string().optional(),
  address: z.string().optional(),
  ownerUsername: z.string().min(3, "Username owner minimal 3 karakter"),
  ownerPassword: z.string().min(6, "Password minimal 6 karakter"),
});

const updateVendorSchema = z.object({
  id: z.string().min(1, "ID Vendor tidak valid"),
  brandName: z.string().min(2, "Nama brand minimal 2 karakter"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

export type VendorState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

export async function createVendorWithOwner(
  prevState: VendorState | undefined,
  formData: FormData,
): Promise<VendorState> {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "superadmin") {
    return { message: "Akses ditolak." };
  }

  const validatedFields = createVendorSchema.safeParse({
    brandName: formData.get("brandName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
    ownerUsername: formData.get("ownerUsername"),
    ownerPassword: formData.get("ownerPassword"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi gagal. Periksa kembali inputan Anda.",
    };
  }

  const { brandName, phone, address, ownerUsername, ownerPassword } =
    validatedFields.data;

  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, ownerUsername))
    .limit(1);

  if (existingUser.length > 0) {
    return {
      errors: { ownerUsername: ["Username ini sudah digunakan"] },
      message: "Username owner sudah ada di sistem.",
    };
  }

  const vendorId = `vnd_${Date.now()}`;
  const userId = `usr_${Date.now()}`;
  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  try {
    await db.insert(vendors).values({
      id: vendorId,
      brandName,
      phone: phone || null,
      address: address || null,
    });

    await db.insert(users).values({
      id: userId,
      vendorId: vendorId,
      username: ownerUsername,
      passwordHash: passwordHash,
      role: "owner",
    });

    revalidatePath("/superadmin/vendors");
    return {
      success: true,
      message: `Vendor "${brandName}" & Akun Owner berhasil dibuat.`,
    };
  } catch (error) {
    console.error(error);
    return { message: "Gagal menyimpan data ke database." };
  }
}

export async function updateVendor(
  prevState: VendorState | undefined,
  formData: FormData,
): Promise<VendorState> {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "superadmin") {
    return { message: "Akses ditolak." };
  }

  const validatedFields = updateVendorSchema.safeParse({
    id: formData.get("id"),
    brandName: formData.get("brandName"),
    phone: formData.get("phone"),
    address: formData.get("address"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi edit gagal.",
    };
  }

  const { id, brandName, phone, address } = validatedFields.data;

  try {
    await db
      .update(vendors)
      .set({
        brandName,
        phone: phone || null,
        address: address || null,
        updatedAt: new Date(),
      })
      .where(eq(vendors.id, id));

    revalidatePath("/superadmin/vendors");
    return {
      success: true,
      message: `Vendor "${brandName}" berhasil diperbarui.`,
    };
  } catch (error) {
    console.error(error);
    return { message: "Gagal memperbarui data vendor." };
  }
}

export async function deleteVendor(
  vendorId: string,
): Promise<{ success: boolean; message: string }> {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "superadmin") {
    return { success: false, message: "Akses ditolak." };
  }

  try {
    await db.delete(vendors).where(eq(vendors.id, vendorId));
    revalidatePath("/superadmin/vendors");
    return { success: true, message: "Vendor berhasil dihapus." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Gagal menghapus vendor." };
  }
}
