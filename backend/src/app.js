const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const pool = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const floodRiskRoutes = require('./routes/floodRiskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

// Global middleware stack for security, CORS, logging, and JSON body parsing.
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));

app.get('/api/health', async (req, res) => {
  await pool.query('SELECT 1');
  return res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/weather', weatherRoutes);
app.use('/api/flood-risk', floodRiskRoutes);
app.use('/api/admins', adminRoutes);
app.use('/api/reports', reportRoutes);

app.use((err, req, res, next) => {
  // Known business errors are surfaced with their own status/code.
  if (err?.status) {
    return res.status(err.status).json({
      ...(err.code ? { code: err.code } : {}),
      message: err.message,
    });
  }

  // Unknown errors are treated as internal server failures.
  console.error(err);
  return res.status(500).json({ message: 'Internal server error.' });
});

module.exports = app;
