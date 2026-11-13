import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import hospitalRoutes from './routes/hospitals.js';
import doctorRoutes from './routes/doctors.js';
import appointmentRoutes from './routes/appointments.js';
import notificationRoutes from './routes/notifications.js';
import profileRoutes from './routes/profile.js';

const app = express();
const allowedOrigins = new Set([
  'http://localhost:5173',
  'https://careconnect-tawny-one.vercel.app',
  'https://careconnect-git-main-pd568138-designs-projects.vercel.app',
  ...(process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean)
]);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.has(origin)) return callback(null, true);
    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: false,
  optionsSuccessStatus: 204
}));
app.options('*', cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: true, legacyHeaders: false }));

app.get('/', (_req, res) => res.json({ ok: true, service: 'CareConnect API', version: '2.0.0' }));
app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'CareConnect API', database: 'connected' }));
app.use('/api/auth', authRoutes);
app.use('/api/hospitals', hospitalRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/profile', profileRoutes);

app.use((err, _req, res, _next) => {
  console.error(err.message);
  res.status(500).json({ message: err.message || 'Internal server error.' });
});

const port = process.env.PORT || 5000;
connectDB().then(() => app.listen(port, () => console.log(`CareConnect API listening on ${port}`)))
  .catch(err => { console.error('Startup failed:', err.message); process.exit(1); });
