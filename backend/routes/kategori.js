const express = require('express');
const router = express.Router();
const kategoriController = require('../controllers/kategoriController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, kategoriController.getAll);

module.exports = router;
