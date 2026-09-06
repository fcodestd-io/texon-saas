"use server";

import { db } from "@/db";
import { users, vendors } from "@/db/schema";
import { auth } from "@/auth";
import { eq, ilike, or, desc, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Fetcher Paginated dengan Search & Filter Role
export async function getPaginatedUsers({
  search = "",
  roleFilter = "all",
  page = 1,
  limit = 10,
}: {
  search?: string;
  roleFilter?: string;
  page?: number;
  limit?: number;
}) {
  const offset = (page - 1) * limit;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(users.username, `%${search}%`),
        ilike(vendors.brandName, `%${search}%`),
      ),
    );
  }

  if (roleFilter !== "all") {
    conditions.push(eq(users.role, roleFilter as any));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const data = await db
    .select({
      id: users.id,
      username: users.username,
      role: users.role,
      vendorId: users.vendorId,
      vendorName: vendors.brandName,
      createdAt: users.createdAt,
    })
    .from(users)
    .leftJoin(vendors, eq(users.vendorId, vendors.id))
    .where(whereClause)
    .orderBy(desc(users.createdAt))
    .limit(limit)
    .offset(offset);

  return data;
}

// Fetcher list vendor untuk dropdown modal
export async function getVendorOptions() {
  return await db
    .select({ id: vendors.id, brandName: vendors.brandName })
    .from(vendors)
    .orderBy(vendors.brandName);
}

const createUserSchema = z.object({
  username: z.string().min(3, "Username minimal 3 karakter"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum([
    "superadmin",
    "owner",
    "admin",
    "spv_production",
    "spv_warehouse",
    "spv_global",
  ]),
  vendorId: z.string().optional().nullable(),
});

const updateUserSchema = z.object({
  id: z.string().min(1, "ID User tidak valid"),
  role: z.enum([
    "superadmin",
    "owner",
    "admin",
    "spv_production",
    "spv_warehouse",
    "spv_global",
  ]),
  vendorId: z.string().optional().nullable(),
  password: z.string().optional(),
});

export type UserState = {
  errors?: Record<string, string[]>;
  message?: string;
  success?: boolean;
};

// 1. Create User
export async function createUser(
  prevState: UserState | undefined,
  formData: FormData,
): Promise<UserState> {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "superadmin") {
    return { message: "Akses ditolak." };
  }

  const role = formData.get("role") as string;
  const vendorIdRaw = formData.get("vendorId") as string;
  const vendorId = role === "superadmin" ? null : vendorIdRaw || null;

  const validatedFields = createUserSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
    role,
    vendorId,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi gagal. Periksa isian form.",
    };
  }

  const { username, password } = validatedFields.data;

  const existing = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existing.length > 0) {
    return {
      errors: { username: ["Username sudah digunakan"] },
      message: "Username sudah terdaftar.",
    };
  }

  const userId = `usr_${Date.now()}`;
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    await db.insert(users).values({
      id: userId,
      username,
      passwordHash,
      role: role as any,
      vendorId,
    });

    revalidatePath("/superadmin/users");
    return { success: true, message: `User "${username}" berhasil dibuat.` };
  } catch (error) {
    console.error(error);
    return { message: "Gagal membuat user ke database." };
  }
}

// 2. Update User (Role, Vendor & Optional Password Reset)
export async function updateUser(
  prevState: UserState | undefined,
  formData: FormData,
): Promise<UserState> {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "superadmin") {
    return { message: "Akses ditolak." };
  }

  const role = formData.get("role") as string;
  const vendorIdRaw = formData.get("vendorId") as string;
  const vendorId = role === "superadmin" ? null : vendorIdRaw || null;
  const password = formData.get("password") as string;

  const validatedFields = updateUserSchema.safeParse({
    id: formData.get("id"),
    role,
    vendorId,
    password: password || undefined,
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi update gagal.",
    };
  }

  const { id } = validatedFields.data;

  try {
    const updateData: any = {
      role: role as any,
      vendorId,
      updatedAt: new Date(),
    };

    if (password && password.trim().length >= 6) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    await db.update(users).set(updateData).where(eq(users.id, id));

    revalidatePath("/superadmin/users");
    return { success: true, message: "Data user berhasil diperbarui." };
  } catch (error) {
    console.error(error);
    return { message: "Gagal memperbarui data user." };
  }
}

// 3. Delete User
export async function deleteUser(
  userId: string,
): Promise<{ success: boolean; message: string }> {
  const session = await auth();

  if (!session?.user || (session.user as any).role !== "superadmin") {
    return { success: false, message: "Akses ditolak." };
  }

  if ((session.user as any).id === userId) {
    return { success: false, message: "Tidak dapat menghapus akun sendiri." };
  }

  try {
    await db.delete(users).where(eq(users.id, userId));
    revalidatePath("/superadmin/users");
    return { success: true, message: "User berhasil dihapus." };
  } catch (error) {
    console.error(error);
    return { success: false, message: "Gagal menghapus user." };
  }
}
