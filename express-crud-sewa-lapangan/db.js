const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DB_FILE = path.join(__dirname, 'data.db');
let database;

async function initDB() {
  if (database) return database;

  const SQL = await initSqlJs();
  if (fs.existsSync(DB_FILE)) {
    const fileBuffer = fs.readFileSync(DB_FILE);
    database = new SQL.Database(fileBuffer);
  } else {
    database = new SQL.Database();
  }

  database.run(`
    CREATE TABLE IF NOT EXISTS penyewaan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nama_penyewa TEXT NOT NULL,
      no_hp TEXT NOT NULL,
      lapangan TEXT NOT NULL,
      tanggal TEXT NOT NULL,
      jam_mulai INTEGER NOT NULL CHECK (jam_mulai BETWEEN 6 AND 22),
      durasi INTEGER NOT NULL CHECK (durasi BETWEEN 1 AND 4),
      total_harga INTEGER NOT NULL CHECK (total_harga >= 0),
      status TEXT NOT NULL DEFAULT 'Menunggu'
        CHECK (status IN ('Menunggu', 'Lunas', 'Dibatalkan')),
      created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    )
  `);

  saveDB();
  return database;
}

function saveDB() {
  if (!database) return;
  const data = database.export();
  fs.writeFileSync(DB_FILE, Buffer.from(data));
}

function all(sql, params = []) {
  const statement = database.prepare(sql);
  if (params.length) statement.bind(params);
  const rows = [];
  while (statement.step()) rows.push(statement.getAsObject());
  statement.free();
  return rows;
}

function get(sql, params = []) {
  return all(sql, params)[0];
}

function run(sql, params = []) {
  database.run(sql, params);
  const changes = database.getRowsModified();
  const lastInsertRowid = get('SELECT last_insert_rowid() AS id').id;
  saveDB();
  return { changes, lastInsertRowid };
}

module.exports = { initDB, all, get, run };
