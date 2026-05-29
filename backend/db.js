const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

const FILES = {
  users: 'users.json',
  siswa: 'siswa.json',
  guru_bk: 'guru_bk.json',
  kategori: 'kategori.json',
  pertemuan: 'pertemuan.json',
  catatan: 'catatan.json',
};

function read(key) {
  const filePath = path.join(DATA_DIR, FILES[key]);
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function write(key, data) {
  const filePath = path.join(DATA_DIR, FILES[key]);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

function nextId(items) {
  if (!items.length) return 1;
  return Math.max(...items.map((i) => i.id)) + 1;
}

function transaction(callback) {
  const state = {};
  for (const key of Object.keys(FILES)) {
    state[key] = read(key);
  }
  const api = {
    get: (key) => state[key],
    set: (key, data) => {
      state[key] = data;
    },
  };
  callback(api);
  for (const key of Object.keys(FILES)) {
    write(key, state[key]);
  }
}

module.exports = { read, write, nextId, transaction, FILES };
