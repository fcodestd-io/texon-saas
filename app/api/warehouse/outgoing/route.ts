import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  productVariants,
  warehouseOutgoings,
  warehouseOutgoingItems,
  productStockMovements,
} from "@/db/schema";
import { auth } from "@/auth";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  let body: {
    marketplaceId?: string | null;
    notes?: string;
    items: Array<{ productVariantId: string; quantity: number }>;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Payload request tidak valid." },
      { status: 400 },
    );
  }

  // 1. Tangkap error Auth agar tidak memicu HTTP 500 Unhandled
  let session = null;
  try {
    session = await auth();
  } catch (e) {
    console.error("Auth exception:", e);
  }

  const userId = session?.user?.id;
  const vendorId = (session?.user as any)?.vendorId;

  if (!userId || !vendorId) {
    return NextResponse.json({
      success: false,
      message:
        "Sesi telah berakhir, silakan refresh halaman dan login kembali.",
    });
  }

  if (!body.items || body.items.length === 0) {
    return NextResponse.json({
      success: false,
      message: "Pilih minimal 1 item barang keluar.",
    });
  }

  // 2. Jalankan Mutasi dalam Transaksi Terisolasi
  try {
    await db.transaction(async (tx) => {
      const outId = `wout_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const refNum = `OUT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(
        100 + Math.random() * 900,
      )}`;

      await tx.insert(warehouseOutgoings).values({
        id: outId,
        vendorId,
        userId,
        marketplaceId: body.marketplaceId || null,
        referenceNumber: refNum,
        notes: body.notes || null,
      });

      for (const item of body.items) {
        if (item.quantity <= 0) continue;

        const [v] = await tx
          .select({ stock: productVariants.stock })
          .from(productVariants)
          .where(eq(productVariants.id, item.productVariantId))
          .limit(1);

        const currentStock = parseFloat(v?.stock || "0");
        const newStock = Math.max(0, currentStock - item.quantity);

        await tx.insert(warehouseOutgoingItems).values({
          id: `wouti_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          warehouseOutgoingId: outId,
          productVariantId: item.productVariantId,
          quantity: item.quantity.toString(),
          stockBefore: currentStock.toString(),
          stockAfter: newStock.toString(),
        });

        await tx
          .update(productVariants)
          .set({
            stock: newStock.toString(),
            updatedAt: new Date(),
          })
          .where(eq(productVariants.id, item.productVariantId));

        await tx.insert(productStockMovements).values({
          id: `psm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          vendorId,
          productVariantId: item.productVariantId,
          type: "out",
          quantity: (-item.quantity).toString(),
          stockBefore: currentStock.toString(),
          stockAfter: newStock.toString(),
          referenceType: "WAREHOUSE_OUTGOING",
          referenceId: outId,
          notes: `Pengeluaran Barang (${refNum})`,
        });
      }
    });

    return NextResponse.json({
      success: true,
      message: "Pengeluaran barang berhasil disimpan!",
    });
  } catch (dbError: any) {
    console.error("Database Execution Error:", dbError);
    return NextResponse.json({
      success: false,
      message: dbError?.message || "Terjadi kesalahan pada database.",
    });
  }
}
