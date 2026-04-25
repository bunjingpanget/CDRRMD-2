const express = require('express');
const { getWeather } = require('../controllers/weatherController');

const router = express.Router();

// Public weather endpoint consumed by both admin and mobile apps.
router.get('/', getWeather);

module.exports = router;
