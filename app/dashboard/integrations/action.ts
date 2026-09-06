"use server";

import { db } from "@/db";
import { couriers, marketplaces } from "@/db/schema";
import { auth } from "@/auth";
import { eq, and, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// Zod Validation Schemas
const courierSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama ekspedisi wajib diisi"),
  prefixCode: z.string().min(1, "Kode awalan resi wajib diisi").toUpperCase(),
});

const marketplaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "Nama marketplace wajib diisi"),
  adminFeePercentage: z.coerce
    .number()
    .min(0, "Biaya admin minimal 0%")
    .max(100, "Biaya admin maksimal 100%"),
  courierId: z.string().nullable().optional(),
});

// Fetch Data
export async function getIntegrationsData() {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;

  if (!vendorId) return { couriersList: [], marketplacesList: [] };

  try {
    const couriersList = await db
      .select()
      .from(couriers)
      .where(eq(couriers.vendorId, vendorId))
      .orderBy(desc(couriers.createdAt));

    const marketplacesList = await db
      .select({
        id: marketplaces.id,
        name: marketplaces.name,
        adminFeePercentage: marketplaces.adminFeePercentage,
        courierId: marketplaces.courierId,
        courierName: couriers.name,
      })
      .from(marketplaces)
      .leftJoin(couriers, eq(marketplaces.courierId, couriers.id))
      .where(eq(marketplaces.vendorId, vendorId))
      .orderBy(desc(marketplaces.createdAt));

    return { couriersList, marketplacesList };
  } catch (error) {
    console.error("Error getIntegrationsData:", error);
    return { couriersList: [], marketplacesList: [] };
  }
}

// Actions Ekspedisi (Courier)
export async function upsertCourier(prevState: any, formData: FormData) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  const rawData = {
    id: formData.get("id")?.toString() || undefined,
    name: formData.get("name")?.toString() || "",
    prefixCode: formData.get("prefixCode")?.toString() || "",
  };

  const parsed = courierSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, prefixCode } = parsed.data;

  try {
    if (id) {
      await db
        .update(couriers)
        .set({ name, prefixCode, updatedAt: new Date() })
        .where(and(eq(couriers.id, id), eq(couriers.vendorId, vendorId)));
    } else {
      await db.insert(couriers).values({
        id: `courier_${Date.now()}`,
        vendorId,
        name,
        prefixCode,
      });
    }

    revalidatePath("/integrations");
    return { success: true, message: `Ekspedisi "${name}" berhasil disimpan.` };
  } catch (error: any) {
    return {
      success: false,
      message: error?.message || "Gagal menyimpan ekspedisi.",
    };
  }
}

export async function deleteCourier(id: string) {
  const session = await auth();
  const vendorId = (session?.user as any)?.vendorId;
  if (!vendorId) return { success: false, message: "Akses ditolak." };

  try {
    await db
      .delete(couriers)
      .where(and(eq(couriers.id, id), eq(couriers.vendorId, vendorId)));
    revalidatePath("/integrations");
    return { success: true, message: "Ekspedisi berhasil dihapus." };
  } catch (error) {
    return { success: false, message: "Gagal menghapus ekspedisi." };
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
    courierId: formData.get("courierId")?.toString() || null,
  };

  const parsed = marketplaceSchema.safeParse(rawData);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const { id, name, adminFeePercentage, courierId } = parsed.data;

  try {
    if (id) {
      await db
        .update(marketplaces)
        .set({
          name,
          adminFeePercentage: adminFeePercentage.toString(),
          courierId: courierId || null,
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
        courierId: courierId || null,
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
