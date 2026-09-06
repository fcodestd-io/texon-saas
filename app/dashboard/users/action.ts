"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, ilike, desc, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

// ==========================================
// INTERNAL ZOD VALIDATION (Tidak di-export agar tidak memicu error "use server")
// ==========================================
const assignableUserRoleEnum = z.enum([
  "admin",
  "spv_production",
  "spv_warehouse",
  "spv_global",
]);

const userFormSchema = z.object({
  id: z.string().optional(),
  username: z
    .string()
    .min(1, "Username wajib diisi")
    .min(3, "Username minimal 3 karakter")
    .regex(
      /^[a-zA-Z0-9_.-]+$/,
      "Username hanya boleh huruf, angka, titik, strip, dan underscore",
    ),
  password: z
    .string()
    .optional()
    .refine((val) => !val || val.length >= 6, {
      message: "Password minimal 6 karakter jika diisi",
    }),
  role: assignableUserRoleEnum,
});

// ==========================================
// SERVER ACTIONS (Hanya Export Async Functions)
// ==========================================

export async function getUsers(searchQuery?: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return [];

  try {
    const conditions = [
      eq(users.vendorId, vendorId),
      ne(users.role, "superadmin"), // Sembunyikan superadmin dari daftar vendor
    ];

    if (searchQuery) {
      conditions.push(ilike(users.username, `%${searchQuery}%`));
    }

    const usersList = await db
      .select({
        id: users.id,
        vendorId: users.vendorId,
        username: users.username,
        role: users.role,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    return usersList;
  } catch (error) {
    console.error("Error getUsers:", error);
    return [];
  }
}

export async function upsertUser(prevState: any, formData: FormData) {
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
    username: formData.get("username")?.toString() || "",
    password: formData.get("password")?.toString() || "",
    role: formData.get("role")?.toString() || "admin",
  };

  const parsed = userFormSchema.safeParse(rawData);

  if (!parsed.success) {
    return {
      success: false,
      message: "Validasi gagal. Periksa inputan Anda.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { id, username, password, role } = parsed.data;

  try {
    if (id) {
      // UPDATE USER
      const existingUser = await db
        .select()
        .from(users)
        .where(and(eq(users.id, id), eq(users.vendorId, vendorId)))
        .then((res) => res[0]);

      if (!existingUser) {
        return { success: false, message: "User tidak ditemukan." };
      }

      // ATURAN PROTEKSI OWNER: Role owner tidak boleh diubah via CRUD
      if (existingUser.role === "owner") {
        return {
          success: false,
          message: "User Owner bersifat Read-Only dan tidak dapat diubah.",
        };
      }

      // Cek keunikan username jika diubah
      if (existingUser.username !== username) {
        const usernameCheck = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .then((res) => res[0]);

        if (usernameCheck) {
          return {
            success: false,
            errors: { username: ["Username sudah digunakan."] },
          };
        }
      }

      const updatePayload: any = {
        username,
        role,
        updatedAt: new Date(),
      };

      if (password && password.trim() !== "") {
        updatePayload.passwordHash = await bcrypt.hash(password, 10);
      }

      await db
        .update(users)
        .set(updatePayload)
        .where(and(eq(users.id, id), eq(users.vendorId, vendorId)));

      revalidatePath("/users");
      return {
        success: true,
        message: `User "${username}" berhasil diperbarui.`,
      };
    } else {
      // CREATE USER
      if (!password || password.trim() === "") {
        return {
          success: false,
          errors: { password: ["Password wajib diisi untuk user baru."] },
        };
      }

      const usernameCheck = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .then((res) => res[0]);

      if (usernameCheck) {
        return {
          success: false,
          errors: { username: ["Username sudah digunakan."] },
        };
      }

      const passwordHash = await bcrypt.hash(password, 10);

      await db.insert(users).values({
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        vendorId,
        username,
        passwordHash,
        role,
      });

      revalidatePath("/users");
      return { success: true, message: `User "${username}" berhasil dibuat.` };
    }
  } catch (error: any) {
    console.error("UPSERT USER ERROR:", error);
    return {
      success: false,
      message: error?.message || "Gagal menyimpan data user.",
    };
  }
}

export async function deleteUser(id: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!session?.user || !vendorId) {
    return { success: false, message: "Akses ditolak." };
  }

  try {
    const targetUser = await db
      .select()
      .from(users)
      .where(and(eq(users.id, id), eq(users.vendorId, vendorId)))
      .then((res) => res[0]);

    if (!targetUser) {
      return { success: false, message: "User tidak ditemukan." };
    }

    // ATURAN PROTEKSI OWNER: User owner tidak bisa dihapus
    if (targetUser.role === "owner" || targetUser.role === "superadmin") {
      return {
        success: false,
        message: "User dengan role Owner / Superadmin tidak dapat dihapus.",
      };
    }

    await db
      .delete(users)
      .where(and(eq(users.id, id), eq(users.vendorId, vendorId)));

    revalidatePath("/users");
    return { success: true, message: "User berhasil dihapus." };
  } catch (error) {
    console.error("DELETE USER ERROR:", error);
    return { success: false, message: "Gagal menghapus user." };
  }
}
