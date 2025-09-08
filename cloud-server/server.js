// const express = require('express');
// const fs = require('fs/promises');
// const fss = require('fs');
// const path = require('path');
// const multer = require('multer');
// const jwt = require('jsonwebtoken');
// const helmet = require('helmet');
// const cors = require('cors');
// const rateLimit = require('express-rate-limit');
// const { Queue, Worker, QueueEvents } = require('bullmq');
// const { execFile } = require('child_process');
// const { lookup: mime } = require('mime-types');

// const ROOT = '/srv/storage/library';
// const HLS = '/srv/storage/hls';
// const THUMBS = '/srv/storage/thumbs';
// const TMP = '/srv/storage/tmp';
// const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
// const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// const app = express();
// app.use(helmet());
// app.use(cors({ origin: true, credentials: true }));
// app.use(express.json({ limit: '2mb' }));
// app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// // --------- Auth (demo) ----------
// const user = { email: 'you@example.com', password: 'supersecret' };
// app.post('/auth/login', (req, res) => {
//   const { email, password } = req.body || {};
//   if (email === user.email && password === user.password) {
//     return res.json({ token: jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: '7d' }) });
//   }
//   res.status(401).json({ error: 'Invalid credentials' });
// });
// const auth = (req, res, next) => {
//   try {
//     const t = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
//     jwt.verify(t, JWT_SECRET); next();
//   } catch { res.status(401).json({ error: 'Unauthorized' }); }
// };

// app.get('/health', (_req, res) => res.json({ ok: true }));

// // --------- Helpers ----------
// const safe = (rel) => {
//   const p = path.join(ROOT, rel || '/');
//   if (!p.startsWith(ROOT)) throw new Error('Unsafe path');
//   return p;
// };
// const norm = (p) => (p || '/').replace(/\/+/g, '/');

// const upload = multer({ dest: TMP });

// // --------- List ----------
// app.get('/fs/list', auth, async (req, res) => {
//   try {
//     const rel = norm(req.query.path || '/');
//     const full = safe(rel);
//     const dirents = await fs.readdir(full, { withFileTypes: true });
//     const items = await Promise.all(dirents.map(async d => {
//       const fp = path.join(full, d.name);
//       const st = await fs.stat(fp);
//       return { name: d.name, isDir: d.isDirectory(), size: st.size, mtime: st.mtime };
//     }));
//     items.sort((a,b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
//     res.json({ path: rel, items });
//   } catch (e) { res.status(400).json({ error: e.message }); }
// });

// // --------- Text read/write ----------
// app.get('/fs/text', auth, async (req, res) => {
//   try { res.type('text/plain').send(await fs.readFile(safe(req.query.path), 'utf8')); }
//   catch (e) { res.status(400).json({ error: e.message }); }
// });
// app.put('/fs/text', auth, async (req, res) => {
//   try { await fs.writeFile(safe(req.body.path), req.body.content || '', 'utf8'); res.json({ ok: true }); }
//   catch (e) { res.status(400).json({ error: e.message }); }
// });

// // --------- mkdir / rm / mv ----------
// app.post('/fs/mkdir', auth, async (req, res) => { try { await fs.mkdir(safe(req.body.path), { recursive: true }); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }});
// app.post('/fs/rm',    auth, async (req, res) => { try { await fs.rm   (safe(req.body.path), { recursive: true, force: true }); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }});
// app.post('/fs/mv',    auth, async (req, res) => { try { await fs.rename(safe(req.body.from), safe(req.body.to)); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }});

// // --------- Upload ----------
// app.post('/fs/upload', auth, upload.single('file'), async (req, res) => {
//   try {
//     const dest = safe(path.join(req.body.dest || '/', req.file.originalname));
//     await fs.copyFile(req.file.path, dest);
//     res.json({ ok: true, name: req.file.originalname });

//     // Auto-transcode if video
//     const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
//     const isVideo = ['mp4','mkv','mov','webm','avi','m4v','wmv','flv'].includes(ext);
//     if (isVideo) {
//       const rel = path.join(req.body.dest || '/', req.file.originalname).replace(/\\/g,'/');
//       const name = path.parse(req.file.originalname).name;
//       await q.add('hls', { src: path.join(ROOT, rel), outDir: path.join(HLS, name), name });
//     }
//   } catch (e) { res.status(400).json({ error: e.message }); }
//   finally { if (req.file?.path) fs.rm(req.file.path, { force: true }); }
// });

// // --------- Download (with Range) ----------
// app.get('/fs/download', auth, async (req, res) => {
//   try {
//     const full = safe(req.query.path);
//     const st = await fs.stat(full);
//     const range = req.headers.range;
//     if (!range) {
//       res.writeHead(200, {
//         'Content-Length': st.size,
//         'Content-Type': mime(path.extname(full)) || 'application/octet-stream',
//         'Content-Disposition': `inline; filename="${path.basename(full)}"`
//       });
//       return fss.createReadStream(full).pipe(res);
//     }
//     const [s, e] = range.replace(/bytes=/,'').split('-').map(Number);
//     const start = isNaN(s)?0:s; const end = isNaN(e)?st.size-1:e;
//     res.writeHead(206, {
//       'Content-Range': `bytes ${start}-${end}/${st.size}`,
//       'Accept-Ranges':'bytes',
//       'Content-Length': end-start+1,
//       'Content-Type': mime(path.extname(full)) || 'application/octet-stream'
//     });
//     fss.createReadStream(full, { start, end }).pipe(res);
//   } catch (e) { res.status(400).json({ error: e.message }); }
// });

// // --------- Thumbnails (image/video) ----------
// app.get('/thumb', auth, async (req, res) => {
//   try {
//     const rel = req.query.path; const src = safe(rel);
//     const base = path.basename(rel) + '.jpg';
//     const out = path.join(THUMBS, base);
//     if (!fss.existsSync(out)) {
//       await new Promise((resolve, reject) =>
//         execFile('ffmpeg', ['-y','-ss','00:00:02','-i',src,'-frames:v','1','-vf','scale=320:-1',out], (e)=> e?reject(e):resolve())
//       );
//     }
//     res.sendFile(out);
//   } catch (e) { res.status(400).json({ error: e.message }); }
// });

// // --------- Transcode jobs (BullMQ) ----------
// const q  = new Queue('transcode',  { connection: { url: REDIS_URL }});
// const qe = new QueueEvents('transcode', { connection: { url: REDIS_URL }});

// app.post('/video/transcode', auth, async (req, res) => {
//   const rel = req.body.path;              // e.g. /Movies/video.mp4
//   const src = path.join(ROOT, rel);
//   const name = path.basename(rel, path.extname(rel));
//   const outDir = path.join(HLS, name);
//   await fs.mkdir(outDir, { recursive: true });
//   const job = await q.add('hls', { src, outDir, name });
//   res.json({ jobId: job.id, hls: `/hls/${encodeURIComponent(name)}/master.m3u8` });
// });

// app.get('/video/job/:id', auth, async (req, res) => {
//   const job = await q.getJob(req.params.id);
//   res.json({ id: job?.id, state: job ? await job.getState() : 'not_found', progress: job?.progress || 0 });
// });

// // Temporary serve HLS (Nginx will do this in prod)
// app.get('/hls/:folder/:file', auth, (req, res) => {
//   const p = path.join(HLS, req.params.folder, req.params.file);
//   res.sendFile(p);
// });

// // Worker: ffmpeg HLS (1080p/720p/480p)
// new Worker('transcode', async (job) => {
//   const { src, outDir } = job.data;
//   const cmd = [
//     '-y','-i', src,
//     '-filter_complex',
//       "[0:v]split=3[v1][v2][v3];" +
//       "[v1]scale=w=1920:h=-1:force_original_aspect_ratio=decrease[v1o];" +
//       "[v2]scale=w=1280:h=-1:force_original_aspect_ratio=decrease[v2o];" +
//       "[v3]scale=w=854:h=-1:force_original_aspect_ratio=decrease[v3o]",
//     // 1080p
//     '-map','[v1o]','-map','0:a:0?','-c:v','h264','-b:v','6000k','-maxrate','6500k','-bufsize','12000k','-c:a','aac','-b:a','192k',
//     '-f','hls','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(outDir,'1080p_%03d.ts'),
//     path.join(outDir,'1080p.m3u8'),
//     // 720p
//     '-map','[v2o]','-map','0:a:0?','-c:v','h264','-b:v','3000k','-maxrate','3500k','-bufsize','6000k','-c:a','aac','-b:a','128k',
//     '-f','hls','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(outDir,'720p_%03d.ts'),
//     path.join(outDir,'720p.m3u8'),
//     // 480p
//     '-map','[v3o]','-map','0:a:0?','-c:v','h264','-b:v','1500k','-maxrate','1800k','-bufsize','3000k','-c:a','aac','-b:a','96k',
//     '-f','hls','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(outDir,'480p_%03d.ts'),
//     path.join(outDir,'480p.m3u8'),
//   ];
//   await new Promise((resolve, reject) => execFile('ffmpeg', cmd, (e) => e ? reject(e) : resolve()));
//   const master = [
//     '#EXTM3U',
//     '#EXT-X-VERSION:3',
//     '#EXT-X-STREAM-INF:BANDWIDTH=6500000,RESOLUTION=1920x1080','1080p.m3u8',
//     '#EXT-X-STREAM-INF:BANDWIDTH=3500000,RESOLUTION=1280x720','720p.m3u8',
//     '#EXT-X-STREAM-INF:BANDWIDTH=1800000,RESOLUTION=854x480','480p.m3u8',
//   ].join('\n');
//   await fs.writeFile(path.join(outDir,'master.m3u8'), master);
// }, { connection: { url: REDIS_URL }});

// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => console.log('API listening on :' + PORT));





const express = require('express');
const fs = require('fs/promises');
const fss = require('fs');
const path = require('path');
const multer = require('multer');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Queue, Worker, QueueEvents } = require('bullmq');
const { execFile } = require('child_process');
const { lookup: mime } = require('mime-types');

// ---- paths & config ----
const ROOT = '/srv/storage/library';
const HLS = '/srv/storage/hls';
const THUMBS = '/srv/storage/thumbs';
const TMP = '/srv/storage/tmp';
const JWT_SECRET = process.env.JWT_SECRET || 'change-me';
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const FFMPEG = process.env.FFMPEG || '/usr/bin/ffmpeg'; // <— NEW

const app = express();
app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(rateLimit({ windowMs: 60_000, max: 120 }));

// --------- Auth (demo) ----------
const user = { email: 'you@example.com', password: 'supersecret' };
app.post('/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email === user.email && password === user.password) {
    return res.json({ token: jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: '7d' }) });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});
const auth = (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    jwt.verify(t, JWT_SECRET); next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
};

app.get('/health', (_req, res) => res.json({ ok: true }));

// --------- Helpers ----------
const safe = (rel) => {
  const p = path.join(ROOT, rel || '/');
  if (!p.startsWith(ROOT)) throw new Error('Unsafe path');
  return p;
};
const norm = (p) => (p || '/').replace(/\/+/g, '/');

const upload = multer({ dest: TMP });

// --------- List ----------
app.get('/fs/list', auth, async (req, res) => {
  try {
    const rel = norm(req.query.path || '/');
    const full = safe(rel);
    const dirents = await fs.readdir(full, { withFileTypes: true });
    const items = await Promise.all(dirents.map(async d => {
      const fp = path.join(full, d.name);
      const st = await fs.stat(fp);
      return { name: d.name, isDir: d.isDirectory(), size: st.size, mtime: st.mtime };
    }));
    items.sort((a,b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
    res.json({ path: rel, items });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --------- Text read/write ----------
app.get('/fs/text', auth, async (req, res) => {
  try { res.type('text/plain').send(await fs.readFile(safe(req.query.path), 'utf8')); }
  catch (e) { res.status(400).json({ error: e.message }); }
});
app.put('/fs/text', auth, async (req, res) => {
  try { await fs.writeFile(safe(req.body.path), req.body.content || '', 'utf8'); res.json({ ok: true }); }
  catch (e) { res.status(400).json({ error: e.message }); }
});

// --------- mkdir / rm / mv ----------
app.post('/fs/mkdir', auth, async (req, res) => { try { await fs.mkdir(safe(req.body.path), { recursive: true }); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }});
app.post('/fs/rm',    auth, async (req, res) => { try { await fs.rm   (safe(req.body.path), { recursive: true, force: true }); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }});
app.post('/fs/mv',    auth, async (req, res) => { try { await fs.rename(safe(req.body.from), safe(req.body.to)); res.json({ ok: true }); } catch (e) { res.status(400).json({ error: e.message }); }});

// --------- Upload ----------
app.post('/fs/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const dest = safe(path.join(req.body.dest || '/', req.file.originalname));
    await fs.copyFile(req.file.path, dest);
    res.json({ ok: true, name: req.file.originalname });

    // Auto-transcode if video
    const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
    const isVideo = ['mp4','mkv','mov','webm','avi','m4v','wmv','flv'].includes(ext);
    if (isVideo) {
      const rel = path.join(req.body.dest || '/', req.file.originalname).replace(/\\/g,'/');
      const name = path.parse(req.file.originalname).name;
      await q.add('hls', { src: path.join(ROOT, rel), outDir: path.join(HLS, name), name });
    }
  } catch (e) { res.status(400).json({ error: e.message }); }
  finally { if (req.file?.path) fs.rm(req.file.path, { force: true }); }
});

// --------- Download (with Range) ----------
app.get('/fs/download', auth, async (req, res) => {
  try {
    const full = safe(req.query.path);
    const st = await fs.stat(full);
    const range = req.headers.range;
    if (!range) {
      res.writeHead(200, {
        'Content-Length': st.size,
        'Content-Type': mime(path.extname(full)) || 'application/octet-stream',
        'Content-Disposition': `inline; filename="${path.basename(full)}"`
      });
      return fss.createReadStream(full).pipe(res);
    }
    const [s, e] = range.replace(/bytes=/,'').split('-').map(Number);
    const start = isNaN(s)?0:s; const end = isNaN(e)?st.size-1:e;
    res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${st.size}`,
        'Accept-Ranges':'bytes',
        'Content-Length': end-start+1,
        'Content-Type': mime(path.extname(full)) || 'application/octet-stream'
    });
    fss.createReadStream(full, { start, end }).pipe(res);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --------- Thumbnails (image/video) ----------
app.get('/thumb', auth, async (req, res) => {
  try {
    const rel = req.query.path; const src = safe(rel);
    const base = path.basename(rel) + '.jpg';
    const out = path.join(THUMBS, base);
    if (!fss.existsSync(out)) {
      await new Promise((resolve, reject) =>
        execFile(FFMPEG, ['-y','-ss','00:00:02','-i',src,'-frames:v','1','-vf','scale=320:-1',out],
          { maxBuffer: 10 * 1024 * 1024 },
          (e, _stdout, stderr) => {
            if (e) {
              console.error('FFMPEG thumb error:', e.message);
              console.error(stderr?.toString());
              reject(e);
            } else resolve();
          })
      );
    }
    res.sendFile(out);
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// --------- Transcode jobs (BullMQ) ----------
const q  = new Queue('transcode',  { connection: { url: REDIS_URL }});
const qe = new QueueEvents('transcode', { connection: { url: REDIS_URL }});

app.post('/video/transcode', auth, async (req, res) => {
  const rel = req.body.path;              // e.g. /Movies/video.mp4
  const src = path.join(ROOT, rel);
  const name = path.basename(rel, path.extname(rel));
  const outDir = path.join(HLS, name);
  await fs.mkdir(outDir, { recursive: true });
  const job = await q.add('hls', { src, outDir, name });
  res.json({ jobId: job.id, hls: `/hls/${encodeURIComponent(name)}/master.m3u8` });
});

app.get('/video/job/:id', auth, async (req, res) => {
  const job = await q.getJob(req.params.id);
  res.json({ id: job?.id, state: job ? await job.getState() : 'not_found', progress: job?.progress || 0 });
});

// Temporary serve HLS (Nginx will do this in prod)
app.get('/hls/:folder/:file', auth, (req, res) => {
  const p = path.join(HLS, req.params.folder, req.params.file);
  res.sendFile(p);
});

// Worker: ffmpeg HLS (1080p/720p/480p)
new Worker('transcode', async (job) => {
  const { src, outDir } = job.data;
  const cmd = [
    '-y','-i', src,
    '-filter_complex',
      "[0:v]split=3[v1][v2][v3];" +
      "[v1]scale=w=1920:h=-1:force_original_aspect_ratio=decrease[v1o];" +
      "[v2]scale=w=1280:h=-1:force_original_aspect_ratio=decrease[v2o];" +
      "[v3]scale=w=854:h=-1:force_original_aspect_ratio=decrease[v3o]",
    // 1080p
    '-map','[v1o]','-map','0:a:0?','-c:v','h264','-b:v','6000k','-maxrate','6500k','-bufsize','12000k','-c:a','aac','-b:a','192k',
    '-f','hls','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(outDir,'1080p_%03d.ts'),
    path.join(outDir,'1080p.m3u8'),
    // 720p
    '-map','[v2o]','-map','0:a:0?','-c:v','h264','-b:v','3000k','-maxrate','3500k','-bufsize','6000k','-c:a','aac','-b:a','128k',
    '-f','hls','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(outDir,'720p_%03d.ts'),
    path.join(outDir,'720p.m3u8'),
    // 480p
    '-map','[v3o]','-map','0:a:0?','-c:v','h264','-b:v','1500k','-maxrate','1800k','-bufsize','3000k','-c:a','aac','-b:a','96k',
    '-f','hls','-hls_time','6','-hls_playlist_type','vod','-hls_segment_filename', path.join(outDir,'480p_%03d.ts'),
    path.join(outDir,'480p.m3u8'),
  ];
  await new Promise((resolve, reject) =>
    execFile(FFMPEG, cmd, { maxBuffer: 20 * 1024 * 1024 }, (e, _stdout, stderr) => {
      if (e) {
        console.error('FFMPEG worker error:', e.message);
        console.error(stderr?.toString());
        reject(e);
      } else {
        resolve();
      }
    })
  );
  const master = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-STREAM-INF:BANDWIDTH=6500000,RESOLUTION=1920x1080','1080p.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=3500000,RESOLUTION=1280x720','720p.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=1800000,RESOLUTION=854x480','480p.m3u8',
  ].join('\n');
  await fs.writeFile(path.join(outDir,'master.m3u8'), master);
}, { connection: { url: REDIS_URL }});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log('API listening on :' + PORT));
