const express = require('express');
const router = express.Router();
const guruController = require('../controllers/guruController');
const { authenticate } = require('../middlewares/auth');

router.get('/', authenticate, guruController.getAll);

module.exports = router;
