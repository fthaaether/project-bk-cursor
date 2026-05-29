# Sistem Bimbingan Konseling (BK)

Aplikasi web untuk manajemen konseling sekolah — pengajuan pertemuan siswa, persetujuan guru BK, catatan konseling, dan administrasi user.

## Tech Stack

- **Frontend:** HTML, CSS, Vanilla JS
- **Backend:** Node.js + Express.js
- **Storage:** JSON files (`backend/data/`)
- **Auth:** JWT

## Quick Start

```powershell
cd project-bk\backend
npm install
npm start
```

Buka **http://localhost:3000** — tidak perlu setup database.

## Akun Demo

| Role    | Username | Password   |
|---------|----------|------------|
| Admin   | admin    | admin123   |
| Guru BK | guru1    | guru123    |
| Guru BK | guru2    | guru123    |
| Siswa   | siswa1   | siswa123   |
| Siswa   | siswa2   | siswa123   |

## Data Storage

Data disimpan di `backend/data/`:

- `users.json` — akun pengguna
- `siswa.json` — data siswa
- `guru_bk.json` — data guru BK
- `kategori.json` — kategori konseling
- `pertemuan.json` — jadwal pertemuan
- `catatan.json` — catatan konseling

## Fitur

- **Login JWT** — redirect otomatis berdasarkan role
- **Siswa** — lihat pertemuan, ajukan konseling ke guru BK
- **Guru BK** — setujui/tolak, panggil siswa, catatan konseling, export PDF
- **Admin** — CRUD user siswa & guru BK
- **Transaksi** — saat menyelesaikan pertemuan (catatan + status atomik)

## API Endpoints

| Method | Endpoint | Role |
|--------|----------|------|
| POST | `/api/auth/login` | Public |
| GET | `/api/pertemuan` | All |
| POST | `/api/pertemuan` | Siswa |
| PATCH | `/api/pertemuan/:id/status` | Guru BK |
| PATCH | `/api/pertemuan/:id/panggil` | Guru BK |
| POST | `/api/pertemuan/:id/selesai` | Guru BK |
| GET | `/api/laporan/pdf` | Guru BK |
| GET/POST/PUT/DELETE | `/api/users` | Admin |
