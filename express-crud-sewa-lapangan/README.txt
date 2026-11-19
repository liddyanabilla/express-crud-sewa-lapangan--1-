APLIKASI CRUD PENYEWAAN LAPANGAN

Persyaratan:
- Node.js 22 LTS atau lebih baru
- Tidak membutuhkan Visual Studio C++ Build Tools

Cara menjalankan:
1. Ekstrak ZIP.
2. Buka folder project di VS Code.
3. Buka terminal pada folder project.
4. Jalankan: npm.cmd install
5. Jalankan data awal (opsional): npm.cmd run seed
6. Jalankan aplikasi: npm.cmd start
7. Buka browser: http://localhost:3000

Fitur:
- Menampilkan daftar penyewaan
- Menambah penyewaan
- Mengubah penyewaan
- Menghapus penyewaan
- Mencari berdasarkan nama, nomor HP, atau lapangan
- Menghitung total harga otomatis
- Validasi jadwal bentrok
- Status Menunggu, Lunas, dan Dibatalkan
- REST API JSON di /api/penyewaan

Database tersimpan otomatis pada file data.db.
