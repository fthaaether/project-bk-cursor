const db = require('../db');
const { enrichGuru } = require('../utils/helpers');

function getAll(_req, res) {
  try {
    const guru = db
      .read('guru_bk')
      .map(enrichGuru)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    res.json(guru);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

module.exports = { getAll };
