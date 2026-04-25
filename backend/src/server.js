require('dotenv').config();

console.log('DB NAME:', process.env.DB_NAME);

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const pool = require('./config/db');
const initDb = require('./config/initDb');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const weatherRoutes = require('./routes/weatherRoutes');
const floodRiskRoutes = require('./routes/floodRiskRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reportRoutes = require('./routes/reportRoutes');

const app = express();

const corsOptions = {
  origin: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan('dev'));
app.use(express.json({ limit: '35mb' }));
app.use(express.urlencoded({ extended: true, limit: '35mb' }));

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
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({
      message: 'Uploaded proof image is too large. Please upload a smaller image and try again.',
    });
  }

  if (err?.status) {
    return res.status(err.status).json({
      ...(err.code ? { code: err.code } : {}),
      message: err.message,
    });
  }

  console.error(err);
  res.status(500).json({ message: 'Internal server error.' });
});

const port = Number(process.env.PORT || 4000);

initDb()
  .then(() => {
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
      console.log('Seeded admin account => username: admin | password: Admin@123');
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error.message);
    process.exit(1);
  });
