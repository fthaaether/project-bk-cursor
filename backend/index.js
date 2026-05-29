require('dotenv').config();

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'sistem-bk-jwt-secret-key-2024';
}

const express = require('express');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const kategoriRoutes = require('./routes/kategori');
const guruRoutes = require('./routes/guru');
const pertemuanRoutes = require('./routes/pertemuan');
const laporanRoutes = require('./routes/laporan');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/kategori', kategoriRoutes);
app.use('/api/guru', guruRoutes);
app.use('/api/pertemuan', pertemuanRoutes);
app.use('/api/laporan', laporanRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', storage: 'json' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
