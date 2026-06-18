/**
 * Script migrasi: hash semua password plain text di database menjadi bcrypt hash
 * Jalankan sekali saja: node scripts/hash-passwords.js
 *
 * Password yang sudah berupa bcrypt hash (dimulai dengan $2b$) akan dilewati.
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

// Load DATABASE_URL dari .env secara manual
const fs = require("fs");
const path = require("path");

const envPath = path.resolve(__dirname, "../.env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let value = trimmed.slice(eqIdx + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}

const SALT_ROUNDS = 12;

async function main() {
  const prisma = new PrismaClient();

  try {
    const pegawai = await prisma.pegawai.findMany({
      select: { id: true, username: true, nip: true, password: true },
    });

    console.log(`Total pegawai ditemukan: ${pegawai.length}`);

    let updated = 0;
    let skipped = 0;

    for (const p of pegawai) {
      const isBcrypt = typeof p.password === "string" && p.password.startsWith("$2");

      if (isBcrypt) {
        skipped++;
        continue;
      }

      const hashed = await bcrypt.hash(p.password, SALT_ROUNDS);
      await prisma.pegawai.update({
        where: { id: p.id },
        data: { password: hashed },
      });

      console.log(`  [OK] ${p.username || p.nip || p.id} — password di-hash`);
      updated++;
    }

    console.log(`\nSelesai.`);
    console.log(`  Di-hash  : ${updated}`);
    console.log(`  Dilewati (sudah hash): ${skipped}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
