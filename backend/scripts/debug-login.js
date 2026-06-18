/**
 * Debug script: tes bcrypt.compare dengan data nyata dari Neon
 * Jalankan: node scripts/debug-login.js <username> <password>
 * Contoh: node scripts/debug-login.js rudi rudi
 */
const fs = require("fs"), path = require("path");
const envContent = fs.readFileSync(path.resolve(__dirname, "../.env"), "utf-8");
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("="); if (i === -1) continue;
  const k = t.slice(0, i).trim(); let v = t.slice(i + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  if (!process.env[k]) process.env[k] = v;
}

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const username = process.argv[2];
const password = process.argv[3];

async function main() {
  if (!username || !password) {
    console.log("Usage: node scripts/debug-login.js <username> <password>");
    process.exit(1);
  }

  const prisma = new PrismaClient();
  const user = await prisma.pegawai.findUnique({
    where: { username },
    select: { id: true, username: true, nip: true, password: true, failedLoginAttempts: true },
  });

  if (!user) {
    console.log("❌ User tidak ditemukan di DB:", username);
    await prisma.$disconnect();
    return;
  }

  console.log("✓ User ditemukan:", user.username, "| NIP:", user.nip);
  console.log("  DB hash prefix:", user.password.substring(0, 30));
  console.log("  isBcrypt:", user.password.startsWith("$2"));
  console.log("  failedLoginAttempts:", user.failedLoginAttempts);

  const match = await bcrypt.compare(password, user.password);
  console.log(`  bcrypt.compare("${password}", hash) =`, match);

  if (!match) {
    console.log("\n💡 Password tidak cocok dengan hash di DB.");
    console.log("   Kemungkinan: password asli sebelum migrasi bukan '" + password + "'");
    console.log("   Hash di DB (lengkap):", user.password);
  } else {
    console.log("\n✅ Password COCOK — seharusnya bisa login.");
  }

  await prisma.$disconnect();
}

main().catch(console.error);
