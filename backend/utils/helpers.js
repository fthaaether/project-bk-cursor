const db = require('../db');

function findUser(id) {
  return db.read('users').find((u) => u.id === id);
}

function findSiswaByUserId(userId) {
  return db.read('siswa').find((s) => s.user_id === userId);
}

function findSiswa(id) {
  return db.read('siswa').find((s) => s.id === id);
}

function findGuru(id) {
  return db.read('guru_bk').find((g) => g.id === id);
}

function findGuruByUserId(userId) {
  return db.read('guru_bk').find((g) => g.user_id === userId);
}

function findKategori(id) {
  return db.read('kategori').find((k) => k.id === id);
}

function findCatatanByPertemuan(pertemuanId) {
  return db.read('catatan').find((c) => c.pertemuan_id === pertemuanId);
}

function enrichUser(user) {
  const siswa = findSiswaByUserId(user.id);
  const guru = findGuruByUserId(user.id);
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    role: user.role,
    created_at: user.created_at,
    siswa_id: siswa?.id ?? null,
    nis: siswa?.nis ?? null,
    kelas: siswa?.kelas ?? null,
    jurusan: siswa?.jurusan ?? null,
    guru_bk_id: guru?.id ?? null,
    nip: guru?.nip ?? null,
  };
}

function enrichPertemuan(p) {
  const siswa = findSiswa(p.siswa_id);
  const userSiswa = siswa ? findUser(siswa.user_id) : null;
  const guru = p.guru_bk_id ? findGuru(p.guru_bk_id) : null;
  const userGuru = guru ? findUser(guru.user_id) : null;
  const kategori = p.kategori_id ? findKategori(p.kategori_id) : null;
  const catatan = findCatatanByPertemuan(p.id);

  return {
    ...p,
    nama_siswa: userSiswa?.name ?? null,
    nis: siswa?.nis ?? null,
    kelas: siswa?.kelas ?? null,
    jurusan: siswa?.jurusan ?? null,
    nama_guru: userGuru?.name ?? null,
    nip: guru?.nip ?? null,
    kategori_nama: kategori?.nama ?? null,
    isi_catatan: catatan?.isi_catatan ?? null,
    tindak_lanjut: catatan?.tindak_lanjut ?? null,
    catatan_created_at: catatan?.created_at ?? null,
  };
}

function enrichGuru(g) {
  const user = findUser(g.user_id);
  return {
    id: g.id,
    nip: g.nip,
    name: user?.name,
    username: user?.username,
  };
}

module.exports = {
  findUser,
  findSiswa,
  findGuru,
  findKategori,
  enrichUser,
  enrichPertemuan,
  enrichGuru,
};
