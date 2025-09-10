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
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

app.get('/health', (_req, res) => res.json({ ok: true }));

app.use('/auth', authRoutes);
app.use('/fs', fsRoutes);
app.use('/video', videoRoutes);
app.use('/remote', remoteRoutes);

app.use(errorHandler);
export default app;
