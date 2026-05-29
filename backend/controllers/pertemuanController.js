const db = require('../db');
const { enrichPertemuan } = require('../utils/helpers');

function getAll(req, res) {
  try {
    let pertemuan = db.read('pertemuan');

    if (req.user.role === 'siswa') {
      pertemuan = pertemuan.filter((p) => p.siswa_id === req.user.siswa_id);
    } else if (req.user.role === 'guru_bk') {
      pertemuan = pertemuan.filter((p) => p.guru_bk_id === req.user.guru_bk_id);
    }

    pertemuan.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(pertemuan.map(enrichPertemuan));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

function create(req, res) {
  const { guru_bk_id, kategori_id, jenis, tanggal, keperluan } = req.body;

  if (!guru_bk_id || !kategori_id || !tanggal || !keperluan) {
    return res.status(400).json({ message: 'Semua field wajib diisi' });
  }

  try {
    const pertemuan = db.read('pertemuan');
    const baru = {
      id: db.nextId(pertemuan),
      siswa_id: req.user.siswa_id,
      guru_bk_id: parseInt(guru_bk_id, 10),
      kategori_id: parseInt(kategori_id, 10),
      jenis: jenis || 'individu',
      status: 'menunggu',
      tanggal,
      keperluan,
      created_at: new Date().toISOString(),
    };
    pertemuan.push(baru);
    db.write('pertemuan', pertemuan);
    res.status(201).json(baru);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

function updateStatus(req, res) {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!['disetujui', 'ditolak'].includes(status)) {
    return res.status(400).json({ message: 'Status tidak valid' });
  }

  try {
    const pertemuan = db.read('pertemuan');
    const idx = pertemuan.findIndex(
      (p) => p.id === id && p.guru_bk_id === req.user.guru_bk_id
    );

    if (idx === -1) {
      return res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
    }
    if (pertemuan[idx].status !== 'menunggu') {
      return res.status(400).json({ message: 'Pertemuan sudah diproses' });
    }

    pertemuan[idx].status = status;
    db.write('pertemuan', pertemuan);
    res.json(pertemuan[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

function panggilSiswa(req, res) {
  const id = parseInt(req.params.id, 10);

  try {
    const pertemuan = db.read('pertemuan');
    const idx = pertemuan.findIndex(
      (p) => p.id === id && p.guru_bk_id === req.user.guru_bk_id && p.status === 'disetujui'
    );

    if (idx === -1) {
      return res.status(404).json({ message: 'Pertemuan tidak ditemukan atau belum disetujui' });
    }

    pertemuan[idx].status = 'dipanggil';
    db.write('pertemuan', pertemuan);
    res.json(pertemuan[idx]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

function selesaikan(req, res) {
  const id = parseInt(req.params.id, 10);
  const { isi_catatan, tindak_lanjut } = req.body;

  if (!isi_catatan) {
    return res.status(400).json({ message: 'Isi catatan wajib diisi' });
  }

  try {
    const pertemuan = db.read('pertemuan');
    const idx = pertemuan.findIndex(
      (p) =>
        p.id === id &&
        p.guru_bk_id === req.user.guru_bk_id &&
        ['disetujui', 'dipanggil'].includes(p.status)
    );

    if (idx === -1) {
      return res.status(404).json({ message: 'Pertemuan tidak ditemukan' });
    }

    let result;
    db.transaction((store) => {
      const pertemuanList = store.get('pertemuan');
      const pertemuanIdx = pertemuanList.findIndex((p) => p.id === id);

      const catatan = store.get('catatan');
      const existing = catatan.findIndex((c) => c.pertemuan_id === id);
      const now = new Date().toISOString();
      const catatanData = {
        id: existing >= 0 ? catatan[existing].id : db.nextId(catatan),
        pertemuan_id: id,
        isi_catatan,
        tindak_lanjut: tindak_lanjut || '',
        created_at: existing >= 0 ? catatan[existing].created_at : now,
      };

      if (existing >= 0) {
        catatan[existing] = catatanData;
      } else {
        catatan.push(catatanData);
      }

      pertemuanList[pertemuanIdx].status = 'selesai';
      store.set('catatan', catatan);
      store.set('pertemuan', pertemuanList);
      result = pertemuanList[pertemuanIdx];
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

module.exports = { getAll, create, updateStatus, panggilSiswa, selesaikan };
