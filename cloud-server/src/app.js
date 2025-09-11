// import express from 'express';
// import helmet from 'helmet';
// import cors from 'cors';
// import rateLimit from 'express-rate-limit';
// import authRoutes from './routes/auth.routes.js';
// import fsRoutes from './routes/fs.routes.js';
// import videoRoutes from './routes/video.routes.js';
// import remoteRoutes from './routes/remote.routes.js';
// import { errorHandler } from './middlewares/error.js';

// const app = express();
// app.use(helmet());
// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json({ limit: '2mb' }));
// app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// app.get('/health', (_req, res) => res.json({ ok: true }));

// app.use('/auth', authRoutes);
// app.use('/fs', fsRoutes);
// app.use('/video', videoRoutes);
// app.use('/remote', remoteRoutes);

// app.use(errorHandler);
// export default app;




import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.routes.js';
import fsRoutes from './routes/fs.routes.js';
import videoRoutes from './routes/video.routes.js';
import remoteRoutes from './routes/remote.routes.js';
import { errorHandler } from './middlewares/error.js';

const app = express();

/* ----------------- CORS (global) ----------------- */
// Allow dev and prod origins. Adjust as needed.
const ALLOW_ORIGINS = [
  'http://localhost:5173',
  'https://cloud.noteshandling.in',
];

// mount CORS BEFORE any other middleware/routes
const corsMiddleware = cors({
  origin: (origin, cb) => {
    // allow non-browser clients (no Origin header) and whitelisted origins
    if (!origin || ALLOW_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('Not allowed by CORS'));
  },
  credentials: true, // safe even if you don't use cookies
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'Content-Length', 'Content-Type'],
});

app.use(corsMiddleware);
// answer ALL preflight requests with proper headers
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    corsMiddleware(req, res, next);
  } else {
    next();
  }
});

/* ----------------- Security & parsing ----------------- */
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({ 
  windowMs: 60_000, 
  max: 1000,  // Much higher limit for file uploads
  skip: (req) => req.path.includes('/fs/upload') // Skip rate limiting for uploads
}));

/* ----------------- Health ----------------- */
app.get('/health', (_req, res) => res.json({ ok: true }));

/* ----------------- Routes ----------------- */
// NOTE: You’re mounting at /fs, /remote, etc. If your frontend calls /api/fs/*,
// your proxy should map /api -> Node root. Otherwise, change these to /api/fs, /api/remote, etc.
app.use('/auth', authRoutes);
app.use('/fs', fsRoutes);
app.use('/video', videoRoutes);
app.use('/remote', remoteRoutes);

/* ----------------- Error handler ----------------- */
app.use(errorHandler);

export default app;
