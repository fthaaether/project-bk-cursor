const db = require('../db');

function getAll(_req, res) {
  try {
    const kategori = db.read('kategori').sort((a, b) => a.id - b.id);
    res.json(kategori);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

module.exports = { getAll };
