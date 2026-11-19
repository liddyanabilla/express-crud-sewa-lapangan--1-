const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const TARIF = {
  'Futsal A': 150000,
  'Futsal B': 150000,
  'Badminton 1': 60000,
  'Badminton 2': 60000,
  'Basket': 100000,
  'Mini Soccer': 300000
};
const STATUS = ['Menunggu', 'Lunas', 'Dibatalkan'];
const JAM_BUKA = 6;
const JAM_TUTUP = 23;
const viewData = { TARIF, STATUS, JAM_BUKA, JAM_TUTUP };

function validate(body, id = 0) {
  const errors = [];
  const data = {
    nama_penyewa: (body.nama_penyewa || '').trim(),
    no_hp: (body.no_hp || '').trim(),
    lapangan: (body.lapangan || '').trim(),
    tanggal: (body.tanggal || '').trim(),
    jam_mulai: Number(body.jam_mulai),
    durasi: Number(body.durasi),
    status: (body.status || 'Menunggu').trim()
  };

  if (!data.nama_penyewa) errors.push('Nama penyewa wajib diisi.');
  if (!/^[0-9+\-\s]{8,16}$/.test(data.no_hp)) errors.push('Nomor HP harus terdiri dari 8-16 karakter angka.');
  if (!Object.prototype.hasOwnProperty.call(TARIF, data.lapangan)) errors.push('Lapangan tidak valid.');

const tanggalValid = /^\d{4}-\d{2}-\d{2}$/.test(data.tanggal) &&
  !Number.isNaN(Date.parse(data.tanggal)) &&
  new Date(data.tanggal).toISOString().slice(0, 10) === data.tanggal;

if (!tanggalValid) {
  errors.push('Tanggal tidak valid.');
}

  if (!Number.isInteger(data.jam_mulai) || data.jam_mulai < JAM_BUKA || data.jam_mulai >= JAM_TUTUP) {
    errors.push('Jam mulai harus antara 06:00 sampai 22:00.');
  }
  if (!Number.isInteger(data.durasi) || data.durasi < 1 || data.durasi > 4) {
    errors.push('Durasi harus 1-4 jam.');
  }
  if (Number.isInteger(data.jam_mulai) && Number.isInteger(data.durasi) &&
      data.jam_mulai + data.durasi > JAM_TUTUP) {
    errors.push(`Booking melewati jam tutup (${JAM_TUTUP}:00).`);
  }
  if (!STATUS.includes(data.status)) errors.push('Status tidak valid.');

  data.total_harga = (TARIF[data.lapangan] || 0) * (data.durasi || 0);

  if (errors.length === 0 && data.status !== 'Dibatalkan') {
    const bentrok = db.get(
      `SELECT * FROM penyewaan
       WHERE lapangan = ? AND tanggal = ? AND status != 'Dibatalkan' AND id != ?
       AND jam_mulai < ? AND (jam_mulai + durasi) > ?
       LIMIT 1`,
      [data.lapangan, data.tanggal, Number(id), data.jam_mulai + data.durasi, data.jam_mulai]
    );

    if (bentrok) {
      const formatJam = jam => String(jam).padStart(2, '0') + ':00';
      errors.push(
        `Jadwal bentrok dengan ${bentrok.nama_penyewa} (${formatJam(bentrok.jam_mulai)} - ${formatJam(bentrok.jam_mulai + bentrok.durasi)}).`
      );
    }
  }

  return { data, errors };
}

function renderForm(res, statusCode, title, action, data, errors) {
  return res.status(statusCode).render('form', {
    title, action, p: data, errors, ...viewData
  });
}

// READ: menampilkan semua penyewaan dan pencarian
app.get('/', (req, res) => {
  const q = (req.query.q || '').trim();
  let list;

  if (q) {
    const like = `%${q}%`;
    list = db.all(
      `SELECT * FROM penyewaan
       WHERE nama_penyewa LIKE ? OR lapangan LIKE ? OR no_hp LIKE ?
       ORDER BY tanggal DESC, jam_mulai DESC`,
      [like, like, like]
    );
  } else {
    list = db.all('SELECT * FROM penyewaan ORDER BY tanggal DESC, jam_mulai DESC');
  }

  const stat = db.get(`
    SELECT COUNT(*) AS total,
      COALESCE(SUM(CASE WHEN status = 'Lunas' THEN total_harga ELSE 0 END), 0) AS pendapatan,
      COALESCE(SUM(CASE WHEN status = 'Menunggu' THEN 1 ELSE 0 END), 0) AS menunggu
    FROM penyewaan
  `);

  res.render('index', { list, q, stat, flash: req.query.msg || null });
});

// CREATE: form tambah
app.get('/penyewaan/new', (req, res) => {
  renderForm(res, 200, 'Booking Lapangan Baru', '/penyewaan',
    { status: 'Menunggu', jam_mulai: 8, durasi: 1 }, []);
});

// CREATE: simpan data
app.post('/penyewaan', (req, res) => {
  const { data, errors } = validate(req.body);
  if (errors.length) {
    return renderForm(res, 400, 'Booking Lapangan Baru', '/penyewaan', data, errors);
  }

  db.run(
    `INSERT INTO penyewaan
     (nama_penyewa, no_hp, lapangan, tanggal, jam_mulai, durasi, total_harga, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.nama_penyewa, data.no_hp, data.lapangan, data.tanggal,
      data.jam_mulai, data.durasi, data.total_harga, data.status]
  );

  res.redirect('/?msg=' + encodeURIComponent('Booking berhasil ditambahkan.'));
});

// UPDATE: form edit
app.get('/penyewaan/:id/edit', (req, res) => {
  const p = db.get('SELECT * FROM penyewaan WHERE id = ?', [Number(req.params.id)]);
  if (!p) return res.status(404).send('Data tidak ditemukan.');

  renderForm(res, 200, 'Ubah Booking', `/penyewaan/${p.id}/update`, p, []);
});

// UPDATE: simpan perubahan
app.post('/penyewaan/:id/update', (req, res) => {
  const id = Number(req.params.id);
  const { data, errors } = validate(req.body, id);
  if (errors.length) {
    return renderForm(res, 400, 'Ubah Booking', `/penyewaan/${id}/update`, data, errors);
  }

  const result = db.run(
    `UPDATE penyewaan SET nama_penyewa = ?, no_hp = ?, lapangan = ?, tanggal = ?,
     jam_mulai = ?, durasi = ?, total_harga = ?, status = ? WHERE id = ?`,
    [data.nama_penyewa, data.no_hp, data.lapangan, data.tanggal,
      data.jam_mulai, data.durasi, data.total_harga, data.status, id]
  );

  if (!result.changes) return res.status(404).send('Data tidak ditemukan.');
  res.redirect('/?msg=' + encodeURIComponent('Booking berhasil diperbarui.'));
});

// DELETE: hapus data
app.post('/penyewaan/:id/delete', (req, res) => {
  const result = db.run('DELETE FROM penyewaan WHERE id = ?', [Number(req.params.id)]);
  if (!result.changes) return res.status(404).send('Data tidak ditemukan.');
  res.redirect('/?msg=' + encodeURIComponent('Booking berhasil dihapus.'));
});

// REST API JSON
app.get('/api/penyewaan', (req, res) => {
  res.json(db.all('SELECT * FROM penyewaan ORDER BY tanggal DESC, jam_mulai DESC'));
});

app.get('/api/penyewaan/:id', (req, res) => {
  const data = db.get('SELECT * FROM penyewaan WHERE id = ?', [Number(req.params.id)]);
  return data ? res.json(data) : res.status(404).json({ error: 'Data tidak ditemukan.' });
});

app.post('/api/penyewaan', (req, res) => {
  const { data, errors } = validate(req.body);
  if (errors.length) return res.status(400).json({ errors });

  const result = db.run(
    `INSERT INTO penyewaan
     (nama_penyewa, no_hp, lapangan, tanggal, jam_mulai, durasi, total_harga, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.nama_penyewa, data.no_hp, data.lapangan, data.tanggal,
      data.jam_mulai, data.durasi, data.total_harga, data.status]
  );

  res.status(201).json(db.get('SELECT * FROM penyewaan WHERE id = ?', [result.lastInsertRowid]));
});

app.put('/api/penyewaan/:id', (req, res) => {
  const id = Number(req.params.id);
  const { data, errors } = validate(req.body, id);
  if (errors.length) return res.status(400).json({ errors });

  const result = db.run(
    `UPDATE penyewaan SET nama_penyewa = ?, no_hp = ?, lapangan = ?, tanggal = ?,
     jam_mulai = ?, durasi = ?, total_harga = ?, status = ? WHERE id = ?`,
    [data.nama_penyewa, data.no_hp, data.lapangan, data.tanggal,
      data.jam_mulai, data.durasi, data.total_harga, data.status, id]
  );

  if (!result.changes) return res.status(404).json({ error: 'Data tidak ditemukan.' });
  res.json(db.get('SELECT * FROM penyewaan WHERE id = ?', [id]));
});

app.delete('/api/penyewaan/:id', (req, res) => {
  const result = db.run('DELETE FROM penyewaan WHERE id = ?', [Number(req.params.id)]);
  return result.changes
    ? res.status(204).end()
    : res.status(404).json({ error: 'Data tidak ditemukan.' });
});

const PORT = process.env.PORT || 3000;

async function startServer() {
  await db.initDB();
  app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
  });
}

if (require.main === module) {
  startServer().catch(error => {
    console.error('Gagal menjalankan aplikasi:', error);
    process.exit(1);
  });
}

module.exports = app;
