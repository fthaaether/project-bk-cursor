const express = require('express');
const router = express.Router();
const laporanController = require('../controllers/laporanController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/pdf', authenticate, authorize('guru_bk'), laporanController.exportPdf);

module.exports = router;
