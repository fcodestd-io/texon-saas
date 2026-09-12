"use server";

import { db } from "@/db";
import { marketplaces } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Validation Schema
const marketplaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama marketplace wajib diisi"),
  adminFeePercentage: z.coerce
    .number()
    .min(0, "Biaya admin minimal 0%")
    .max(100, "Biaya admin maksimal 100%"),
});

// Fetch Data
export async function getMarketplacesData() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return { marketplacesList: [] };

  try {
    const marketplacesList = await db
      .select({
        id: marketplaces.id,
        name: marketplaces.name,
        adminFeePercentage: marketplaces.adminFeePercentage,
      })
      .from(marketplaces)
      .where(eq(marketplaces.vendorId, vendorId))
      .orderBy(desc(marketplaces.createdAt));

    return { marketplacesList };
  } catch (error) {
    console.error("Error getMarketplacesData:", error);
    return { marketplacesList: [] };
  }
}

// Actions Marketplace
export async function upsertMarketplace(prevState: any, formData: FormData) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  const rawData = {
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name")?.toString() || "",
    adminFeePercentage: formData.get("adminFeePercentage") || 0,
  };

  const parsed = marketplaceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, adminFeePercentage } = parsed.data;

  try {
    if (id) {
      await db
        .update(marketplaces)
        .set({
          name,
          adminFeePercentage: adminFeePercentage.toString(),
          updatedAt: new Date(),
        })
        .where(
          and(eq(marketplaces.id, id), eq(marketplaces.vendorId, vendorId)),
        );
    } else {
      await db.insert(marketplaces).values({
        id: `mp_${Date.now()}`,
        vendorId,
        name,
        adminFeePercentage: adminFeePercentage.toString(),
      });
    }

    revalidatePath("/integrations");
    return {
      success: true,
      message: `Marketplace "${name}" berhasil disimpan.`,
    };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Gagal menyimpan marketplace.",
    };
  }
}

export async function deleteMarketplace(id: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    await db
      .delete(marketplaces)
      .where(and(eq(marketplaces.id, id), eq(marketplaces.vendorId, vendorId)));
    revalidatePath("/integrations");
    return { success: true, message: "Marketplace berhasil dihapus." };
  } catch (error) {
    return { success: false, message: "Gagal menghapus marketplace." };
  }
}
