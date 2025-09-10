import { Router } from 'express';
import path from 'node:path';
import fs from 'node:fs/promises';
import { auth } from '../middlewares/auth.js';
import { safe, norm } from '../utils/safePath.js';
import { deriveFilenameFromHeadersOrUrl, downloadToTemp } from '../services/downloadService.js';
import { transcodeQueue } from '../queue/bull.js';
import { HLS } from '../config/index.js';
import got from 'got';

const r = Router();
const remoteDownloads = new Map(); // { id, url, filename, destRel, progress, state, error, hls, transcodeJobId }

r.post('/download', auth, async (req,res) => {
  const rawUrl = (req.body?.url || '').trim();
  const destRel = norm(req.body?.dest || '/');
  const transcode = !!req.body?.transcode;

  // HEAD or lightweight GET
  let head;
  try { head = await got.head(rawUrl, { timeout:{ request:15000 } }); }
  catch { head = await got(rawUrl, { method:'GET', throwHttpErrors:false, timeout:{ request:15000 } }); }

  const filename = await deriveFilenameFromHeadersOrUrl(rawUrl, head.headers);
  const destDir = safe(destRel);
  await fs.mkdir(destDir, { recursive:true });

  const tmpPath = await downloadToTemp(rawUrl);
  const finalPath = path.join(destDir, filename);
  await fs.rename(tmpPath, finalPath);

  let jobId=null, hls=null;
  if (transcode && /\.(mp4|mkv|mov|webm|avi|m4v|wmv|flv)$/i.test(filename)) {
    const name = path.parse(filename).name;
    const outDir = path.join(HLS, name);
    await fs.mkdir(outDir, { recursive:true });
    const job = await transcodeQueue.add('hls', { src: finalPath, outDir, name });
    jobId = job.id; hls = `/video/hls/${encodeURIComponent(name)}/master.m3u8`;
  }

  res.json({ ok:true, filename, path: path.join(destRel, filename), jobId, hls });
});

// Async start + polling (optional to keep)
r.post('/start', auth, async (req,res) => {
  const rawUrl = (req.body?.url || '').trim();
  const destRel = norm(req.body?.dest || '/');
  const transcode = !!req.body?.transcode;
  const id = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;

  remoteDownloads.set(id, { id, url:rawUrl, filename:'', destRel, progress:0, state:'queued' });

  (async () => {
    const job = remoteDownloads.get(id);
    try {
      let head;
      try { head = await got.head(rawUrl, { timeout:{ request:15000 } }); }
      catch { head = await got(rawUrl, { method:'GET', throwHttpErrors:false, timeout:{ request:15000 } }); }

      const filename = await deriveFilenameFromHeadersOrUrl(rawUrl, head.headers);
      job.filename = filename;

      const destDir = safe(destRel);
      await fs.mkdir(destDir, { recursive:true });

      const tmpPath = await downloadToTemp(rawUrl);
      const finalPath = path.join(destDir, filename);
      await fs.rename(tmpPath, finalPath);

      if (transcode && /\.(mp4|mkv|mov|webm|avi|m4v|wmv|flv)$/i.test(filename)) {
        const name = path.parse(filename).name;
        const outDir = path.join(HLS, name);
        await fs.mkdir(outDir, { recursive:true });
        const jobQ = await transcodeQueue.add('hls', { src: finalPath, outDir, name });
        job.transcodeJobId = jobQ.id;
        job.hls = `/video/hls/${encodeURIComponent(name)}/master.m3u8`;
      }

      job.progress = 100; job.state = 'done';
      remoteDownloads.set(id, job);
    } catch (e) {
      job.state='error'; job.error = e?.message || 'Download failed';
      remoteDownloads.set(id, job);
    }
  })();

  res.json({ id });
});

r.get('/status/:id', auth, (req,res) => {
  const job = remoteDownloads.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(job);
});

export default r;
