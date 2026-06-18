/**
 * Script update jenis_kelamin pegawai dari data Excel
 * Jalankan: node scripts/update-jenis-kelamin.js
 */
const { Client } = require("pg");

const DB_URL = "postgresql://postgres:rsgm123@localhost:5432/sim_cuti_rsgm";

// Data dari file Excel "Nama dan Jenis Kelamin Pegawai.xlsx"
const excelData = [
  { nama: "drg. Andi Supriatna, M.M.,Sp.Perio., FIHFAA .,CHMP", jk: "L" },
  { nama: "Dr. Eka Septiarini, S.P., M.M.,CMA.,CSMA.,CHMP", jk: "P" },
  { nama: "drg. Irham Muhammad Adinugraha, Sp.Pros", jk: "L" },
  { nama: "drg. Ramadhita Paramananda Prayudha, Sp.Perio", jk: "L" },
  { nama: "Dendy Ari Kurniawan,S.H., M.H", jk: "L" },
  { nama: "Anak Agung Gde Bagus Ari Dalem, SE.,M.M", jk: "L" },
  { nama: "drg. Refliza Yanti, M.MRS.,CSMA", jk: "P" },
  { nama: "Putri Agustiani Pertiwi, SKM", jk: "P" },
  { nama: "Camelia Herlina, S.Kep", jk: "P" },
  { nama: "Ira Rahmawati, S.Ak", jk: "P" },
  { nama: "Joko Suwarso, A.Md", jk: "L" },
  { nama: "Nimas Tri Styaning Cahyani, S.Psi", jk: "P" },
  { nama: "Dika Rochmat Gumilar, S.T", jk: "L" },
];

async function main() {
  const client = new Client({ connectionString: DB_URL });
  await client.connect();

  // Ambil semua pegawai
  const { rows: allPegawai } = await client.query(
    "SELECT id, nama, nip, jenis_kelamin FROM pegawai ORDER BY id"
  );

  console.log(`\nTotal pegawai di DB: ${allPegawai.length}`);
  console.log("\nDaftar pegawai di DB:");
  allPegawai.forEach((p) => console.log(`  [${p.id}] ${p.nama} | JK: ${p.jenis_kelamin || "belum diisi"}`));

  console.log("\n--- Mulai update ---");
  let updated = 0;
  let notFound = [];

  for (const entry of excelData) {
    const namaTrimmed = entry.nama.trim().toLowerCase();

    // Cari match: exact, atau similarity
    let match = allPegawai.find(
      (p) => p.nama && p.nama.trim().toLowerCase() === namaTrimmed
    );

    // Fallback: cari berdasarkan kata-kata pertama nama (substring)
    if (!match) {
      const firstWords = namaTrimmed.split(",")[0].trim();
      match = allPegawai.find(
        (p) => p.nama && p.nama.trim().toLowerCase().includes(firstWords)
      );
    }

    if (match) {
      await client.query(
        "UPDATE pegawai SET jenis_kelamin = $1 WHERE id = $2",
        [entry.jk, match.id]
      );
      console.log(`  ✓ Updated: [${match.id}] ${match.nama} → ${entry.jk}`);
      updated++;
    } else {
      console.log(`  ✗ Tidak ditemukan: "${entry.nama}"`);
      notFound.push(entry.nama);
    }
  }

  // Verifikasi hasil
  const { rows: result } = await client.query(
    "SELECT id, nama, jenis_kelamin FROM pegawai ORDER BY id"
  );

  console.log("\n--- Hasil akhir ---");
  result.forEach((p) =>
    console.log(`  [${p.id}] ${p.nama} | JK: ${p.jenis_kelamin || "(kosong)"}`)
  );

  console.log(`\nSelesai. Updated: ${updated}, Tidak ditemukan: ${notFound.length}`);
  if (notFound.length > 0) {
    console.log("Nama tidak ditemukan:");
    notFound.forEach((n) => console.log(`  - ${n}`));
  }

  await client.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
