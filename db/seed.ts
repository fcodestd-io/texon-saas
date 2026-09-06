import { db } from "./index"; // Adjust path to your drizzle db instance
import { users } from "./schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function main() {
  console.log("⏳ Memulai seeding superadmin...");

  const username = "superadmin";
  const passwordRaw = "superadmin2026";
  const passwordHash = await bcrypt.hash(passwordRaw, 12);

  // Cek apakah user superadmin sudah ada
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (existingUser.length > 0) {
    console.log("⚠️ Superadmin sudah terdaftar.");
    process.exit(0);
  }

  await db.insert(users).values({
    id: "user_superadmin_01",
    vendorId: null, // NULL khusus untuk superadmin SaaS
    username,
    passwordHash,
    role: "superadmin",
  });

  console.log("✅ Seeding berhasil!");
  console.log(`Username : ${username}`);
  console.log(`Password : ${passwordRaw}`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Seeding gagal:", err);
  process.exit(1);
});
