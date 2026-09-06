"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getDashboardPathByRole } from "@/auth";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export type State = {
  errors?: {
    username?: string[];
    password?: string[];
  };
  message?: string;
};

export async function authenticate(
  prevState: State | undefined,
  formData: FormData,
): Promise<State> {
  const validatedFields = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: "Validasi gagal. Silakan periksa kredensial Anda.",
    };
  }

  const { username, password } = validatedFields.data;

  // Cek role user di database untuk menentukan tujuan alur redirect
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  // Jika user ditemukan, alihkan sesuai fungsi helper role dashboard
  const redirectTo = user ? getDashboardPathByRole(user.role) : "/dashboard";

  try {
    await signIn("credentials", {
      username,
      password,
      redirectTo,
    });

    return { message: "Login berhasil" };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { message: "Username atau password salah." };
        default:
          return { message: "Terjadi kesalahan sistem autentikasi." };
      }
    }

    // PENTING: NextAuth / Next.js melempar error bertipe 'NEXT_REDIRECT' saat berhasil login.
    // Error ini harus dilempar kembali (re-throw) agar proses pengalihan halaman berjalan.
    throw error;
  }
}
