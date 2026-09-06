import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users, vendors } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1, "Username wajib diisi"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const validatedFields = loginSchema.safeParse(credentials);

        if (!validatedFields.success) return null;

        const { username, password } = validatedFields.data;

        // Fetch user sekaligus nama vendor (brandName) dari database
        const [result] = await db
          .select({
            id: users.id,
            username: users.username,
            passwordHash: users.passwordHash,
            role: users.role,
            vendorId: users.vendorId,
            vendorName: vendors.brandName,
          })
          .from(users)
          .leftJoin(vendors, eq(users.vendorId, vendors.id))
          .where(eq(users.username, username))
          .limit(1);

        if (!result || !result.passwordHash) return null;

        const passwordsMatch = await bcrypt.compare(
          password,
          result.passwordHash,
        );
        if (!passwordsMatch) return null;

        return {
          id: result.id,
          name: result.username,
          role: result.role,
          vendorId: result.vendorId,
          vendorName: result.vendorName,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.vendorId = (user as any).vendorId;
        token.vendorName = (user as any).vendorName;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        const userRole = token.role as string;

        (session.user as any).id = token.sub;
        (session.user as any).role = userRole;

        // Pasang vendorId dan vendorName ke session untuk role non-superadmin
        if (
          userRole === "owner" ||
          userRole === "admin" ||
          userRole.startsWith("spv_")
        ) {
          (session.user as any).vendorId = token.vendorId ?? null;
          (session.user as any).vendorName = token.vendorName ?? null;
        } else {
          (session.user as any).vendorId = null;
          (session.user as any).vendorName = null;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});

/**
 * Helper Server-Side untuk mengarahkan path dashboard berdasarkan role
 */
export function getDashboardPathByRole(role?: string): string {
  switch (role) {
    case "superadmin":
      return "/superadmin/dashboard";
    case "owner":
    case "admin":
      return "/dashboard";
    case "spv_production":
      return "/supervisor/production/dashboard";
      case "spv_warehouse":
      return "/supervisor/warehouse/dashboard";
      case "spv_global":
      return "/supervisor/dashboard";
    default:
      return "/login";
  }
}
