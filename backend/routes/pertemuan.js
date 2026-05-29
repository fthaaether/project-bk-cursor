const express = require('express');
const router = express.Router();
const pertemuanController = require('../controllers/pertemuanController');
const { authenticate, authorize } = require('../middlewares/auth');

router.get('/', authenticate, pertemuanController.getAll);
router.post('/', authenticate, authorize('siswa'), pertemuanController.create);
router.patch('/:id/status', authenticate, authorize('guru_bk'), pertemuanController.updateStatus);
router.patch('/:id/panggil', authenticate, authorize('guru_bk'), pertemuanController.panggilSiswa);
router.post('/:id/selesai', authenticate, authorize('guru_bk'), pertemuanController.selesaikan);

module.exports = router;
