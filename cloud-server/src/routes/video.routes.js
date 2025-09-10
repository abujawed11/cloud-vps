import { Router } from 'express';
import path from 'node:path';
import { auth } from '../middlewares/auth.js';
import { safe } from '../utils/safePath.js';
import { HLS } from '../config/index.js';
import { transcodeQueue } from '../queue/bull.js';

const r = Router();

r.post('/transcode', auth, async (req,res) => {
  const rel = req.body.path;
  const src = safe(rel);
  const name = path.basename(rel, path.extname(rel));
  const outDir = path.join(HLS, name);
  const job = await transcodeQueue.add('hls', { src, outDir, name });
  res.json({ jobId: job.id, hls: `/video/hls/${encodeURIComponent(name)}/master.m3u8` });
});

r.get('/job/:id', auth, async (req,res) => {
  const job = await transcodeQueue.getJob(req.params.id);
  res.json({ id: job?.id, state: job ? await job.getState() : 'not_found', progress: job?.progress || 0 });
});

r.get('/hls/:folder/:file', auth, (req,res) => {
  const p = path.join(HLS, req.params.folder, req.params.file);
  const base = path.resolve(HLS);
  if (!p.startsWith(base + path.sep)) return res.status(400).json({ error: 'Unsafe path' });

  if (p.endsWith('.m3u8')) res.type('application/vnd.apple.mpegurl');
  else if (p.endsWith('.ts')) res.type('video/mp2t');
  res.sendFile(p);
});

export default r;
