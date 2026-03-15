const express = require('express');
const auth = require('../middleware/auth');
const { createReport, getReports } = require('../controllers/reportController');

const router = express.Router();

router.post('/', auth, createReport);
router.get('/', auth, getReports);

module.exports = router;
