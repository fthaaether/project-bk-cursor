const bcrypt = require('bcryptjs');
const db = require('../db');
const { enrichUser } = require('../utils/helpers');

function getAll(req, res) {
  const { role } = req.query;
  try {
    let users = db.read('users').filter((u) => u.role !== 'admin');

    if (role && ['siswa', 'guru_bk'].includes(role)) {
      users = users.filter((u) => u.role === role);
    }

    users.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(users.map(enrichUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

async function create(req, res) {
  const { name, username, password, role, nis, kelas, jurusan, nip } = req.body;

  if (!name || !username || !password || !role) {
    return res.status(400).json({ message: 'Data tidak lengkap' });
  }

  if (!['siswa', 'guru_bk'].includes(role)) {
    return res.status(400).json({ message: 'Role tidak valid' });
  }

  try {
    const users = db.read('users');
    if (users.some((u) => u.username === username)) {
      return res.status(409).json({ message: 'Username sudah digunakan' });
    }

    if (role === 'siswa' && (!nis || !kelas || !jurusan)) {
      return res.status(400).json({ message: 'Data siswa tidak lengkap' });
    }
    if (role === 'guru_bk' && !nip) {
      return res.status(400).json({ message: 'NIP wajib diisi' });
    }

    let created;
    db.transaction((store) => {
      const usersList = store.get('users');
      const hashed = bcrypt.hashSync(password, 10);
      const now = new Date().toISOString();

      const user = {
        id: db.nextId(usersList),
        name,
        username,
        password: hashed,
        role,
        created_at: now,
      };
      usersList.push(user);

      if (role === 'siswa') {
        const siswaList = store.get('siswa');
        siswaList.push({
          id: db.nextId(siswaList),
          user_id: user.id,
          nis,
          kelas,
          jurusan,
        });
        store.set('siswa', siswaList);
      } else {
        const guruList = store.get('guru_bk');
        guruList.push({
          id: db.nextId(guruList),
          user_id: user.id,
          nip,
        });
        store.set('guru_bk', guruList);
      }

      store.set('users', usersList);
      created = enrichUser(user);
    });

    res.status(201).json(created);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

async function update(req, res) {
  const id = parseInt(req.params.id, 10);
  const { name, username, password, nis, kelas, jurusan, nip } = req.body;

  try {
    const users = db.read('users');
    const existing = users.find((u) => u.id === id && u.role !== 'admin');

    if (!existing) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    if (username && users.some((u) => u.username === username && u.id !== id)) {
      return res.status(409).json({ message: 'Username sudah digunakan' });
    }

    let updated;
    db.transaction((store) => {
      const usersList = store.get('users');
      const user = usersList.find((u) => u.id === id);

      user.name = name || user.name;
      user.username = username || user.username;
      if (password) {
        user.password = bcrypt.hashSync(password, 10);
      }

      if (user.role === 'siswa' && (nis || kelas || jurusan)) {
        const siswaList = store.get('siswa');
        const siswa = siswaList.find((s) => s.user_id === id);
        if (siswa) {
          if (nis) siswa.nis = nis;
          if (kelas) siswa.kelas = kelas;
          if (jurusan) siswa.jurusan = jurusan;
        }
        store.set('siswa', siswaList);
      }

      if (user.role === 'guru_bk' && nip) {
        const guruList = store.get('guru_bk');
        const guru = guruList.find((g) => g.user_id === id);
        if (guru) guru.nip = nip;
        store.set('guru_bk', guruList);
      }

      store.set('users', usersList);
      updated = enrichUser(user);
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

function remove(req, res) {
  const id = parseInt(req.params.id, 10);

  try {
    const users = db.read('users');
    const user = users.find((u) => u.id === id && u.role !== 'admin');

    if (!user) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    db.transaction((store) => {
      store.set(
        'users',
        store.get('users').filter((u) => u.id !== id)
      );

      const siswa = store.get('siswa');
      const siswaRecord = siswa.find((s) => s.user_id === id);
      store.set('siswa', siswa.filter((s) => s.user_id !== id));

      const guru = store.get('guru_bk');
      const guruRecord = guru.find((g) => g.user_id === id);
      store.set('guru_bk', guru.filter((g) => g.user_id !== id));

      let pertemuan = store.get('pertemuan');
      let catatan = store.get('catatan');

      if (siswaRecord) {
        const pertemuanIds = pertemuan
          .filter((p) => p.siswa_id === siswaRecord.id)
          .map((p) => p.id);
        pertemuan = pertemuan.filter((p) => p.siswa_id !== siswaRecord.id);
        catatan = catatan.filter((c) => !pertemuanIds.includes(c.pertemuan_id));
      }

      if (guruRecord) {
        pertemuan = pertemuan.filter((p) => p.guru_bk_id !== guruRecord.id);
      }

      store.set('pertemuan', pertemuan);
      store.set('catatan', catatan);
    });

    res.json({ message: 'User berhasil dihapus' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

module.exports = { getAll, create, update, remove };
