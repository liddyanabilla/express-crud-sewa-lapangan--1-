const db = require('./db');

async function seed() {
  await db.initDB();

  const existing = db.get('SELECT COUNT(*) AS total FROM penyewaan').total;
  if (existing > 0) {
    console.log('Tabel sudah berisi data, seed dilewati.');
    return;
  }

  const rows = [
    ['Budi Santoso', '081234567801', 'Futsal A', '2026-11-20', 19, 2, 300000, 'Lunas'],
    ['Siti Rahma', '081234567802', 'Badminton 1', '2026-11-20', 16, 1, 60000, 'Lunas'],
    ['Komunitas Hoops', '081234567803', 'Basket', '2026-11-21', 18, 2, 200000, 'Menunggu'],
    ['Andi Pratama', '081234567804', 'Mini Soccer', '2026-11-22', 8, 2, 600000, 'Lunas'],
    ['Dewi Lestari', '081234567805', 'Futsal B', '2026-11-22', 20, 1, 150000, 'Dibatalkan']
  ];

  const sql = `INSERT INTO penyewaan
    (nama_penyewa, no_hp, lapangan, tanggal, jam_mulai, durasi, total_harga, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;

  rows.forEach(row => db.run(sql, row));
  console.log(`Seed selesai: ${rows.length} data berhasil ditambahkan.`);
}

seed().catch(error => {
  console.error('Seed gagal:', error);
  process.exit(1);
});
