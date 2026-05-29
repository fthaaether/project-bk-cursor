const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { enrichUser } = require('../utils/helpers');

async function login(req, res) {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username dan password wajib diisi' });
  }

  try {
    const users = db.read('users');
    const user = users.find((u) => u.username === username);

    if (!user) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const enriched = enrichUser(user);
    const token = jwt.sign(enriched, process.env.JWT_SECRET, { expiresIn: '8h' });

    res.json({ token, user: enriched });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Terjadi kesalahan server' });
  }
}

function me(req, res) {
  res.json({ user: req.user });
}

module.exports = { login, me };
