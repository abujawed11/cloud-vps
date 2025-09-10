// import { Router } from 'express';
// import fs from 'node:fs/promises';
// import fss from 'node:fs';
// import path from 'node:path';
// import multer from 'multer';
// import { auth } from '../middlewares/auth.js';
// import { ROOT, THUMBS, TMP, AUTO_TRANSCODE_UPLOAD } from '../config/index.js';
// import { safe, norm } from '../utils/safePath.js';
// import { mimeOf } from '../utils/mime.js';
// import { copyRecursive, moveCrossFsSafe } from '../services/fsService.js';
// import { transcodeQueue } from '../queue/bull.js';

// const r = Router();
// const upload = multer({ dest: TMP });

// r.get('/list', auth, async (req,res) => {
//   const rel = norm(req.query.path || '/');
//   const full = safe(rel);
//   const dirents = await fs.readdir(full, { withFileTypes:true });
//   const items = await Promise.all(dirents.map(async d => {
//     const fp = path.join(full, d.name);
//     const st = await fs.stat(fp);
//     return { name:d.name, isDir:d.isDirectory(), size:st.size, mtime:st.mtime };
//   }));
//   items.sort((a,b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
//   res.json({ path: rel, items });
// });

// r.post('/mkdir', auth, async (req,res) => {
//   await fs.mkdir(safe(req.body.path), { recursive:true });
//   res.json({ ok:true });
// });

// r.post('/rm', auth, async (req,res) => {
//   const p = safe(req.body.path);
//   if (p === ROOT) throw new Error('Cannot delete root storage directory');
//   await fs.rm(p, { recursive:true, force:true });
//   res.json({ ok:true });
// });

// r.post('/mv', auth, async (req,res) => {
//   const { from,to,src,dest,copy=false } = req.body;
//   const s = safe(from || src); const d = safe(to || dest);
//   if (copy) await copyRecursive(s,d);
//   else await moveCrossFsSafe(s,d);
//   res.json({ ok:true });
// });

// r.post('/cp', auth, async (req,res) => {
//   const { from,to,src,dest } = req.body;
//   await copyRecursive(safe(from||src), safe(to||dest));
//   res.json({ ok:true });
// });

// r.post('/upload', auth, upload.single('file'), async (req,res) => {
//   try {
//     const dest = safe(path.join(req.body.dest || '/', req.file.originalname));
//     await fs.copyFile(req.file.path, dest);
//     res.json({ ok:true, name:req.file.originalname });

//     const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
//     const isVideo = ['mp4','mkv','mov','webm','avi','m4v','wmv','flv'].includes(ext);
//     if (AUTO_TRANSCODE_UPLOAD && isVideo) {
//       const name = path.parse(req.file.originalname).name;
//       await transcodeQueue.add('hls', { src: dest, outDir: path.join(process.env.HLS, name), name });
//     }
//   } finally {
//     if (req.file?.path) fs.rm(req.file.path, { force:true });
//   }
// });

// r.get('/download', auth, async (req,res) => {
//   const full = safe(req.query.path);
//   const st = await fs.stat(full);
//   const range = req.headers.range;

//   // CORS headers for media files
//   const corsHeaders = {
//     'Access-Control-Allow-Origin': '*',
//     'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
//     'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
//     'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
//   };

//   if (!range) {
//     res.writeHead(200, {
//       ...corsHeaders,
//       'Content-Length': st.size,
//       'Content-Type': mimeOf(full),
//       'Content-Disposition': `inline; filename="${path.basename(full)}"`,
//       'Cache-Control': 'private, max-age=3600'
//     });
//     return fss.createReadStream(full).pipe(res);
//   }
//   const [s,e] = range.replace(/bytes=/,'').split('-').map(Number);
//   const start = Number.isNaN(s) ? 0 : s;
//   const end   = Number.isNaN(e) ? st.size - 1 : e;
//   if (start > end || end >= st.size) {
//     res.writeHead(416, { 
//       ...corsHeaders,
//       'Content-Range': `bytes */${st.size}` 
//     }); 
//     return res.end();
//   }
//   res.writeHead(206, {
//     ...corsHeaders,
//     'Content-Range': `bytes ${start}-${end}/${st.size}`,
//     'Accept-Ranges': 'bytes',
//     'Content-Length': end - start + 1,
//     'Content-Type': mimeOf(full),
//     'Cache-Control': 'private, max-age=3600'
//   });
//   fss.createReadStream(full, { start, end }).pipe(res);
// });

// r.get('/text', auth, async (req,res) => {
//   const full = safe(req.query.path);
//   const text = await fs.readFile(full, 'utf8');
//   res.json({ text });
// });

// r.put('/text', auth, async (req,res) => {
//   const full = safe(req.body.path);
//   await fs.writeFile(full, req.body.text, 'utf8');
//   res.json({ ok: true });
// });

// r.get('/thumb', auth, async (req,res) => {
//   // (You can port your thumb logic here later; keep it out of the hot path for now)
//   res.status(501).json({ error: 'Not implemented in modular split yet' });
// });

// export default r;




import { Router } from 'express';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { auth } from '../middlewares/auth.js';
import { ROOT, THUMBS, TMP, AUTO_TRANSCODE_UPLOAD, HLS } from '../config/index.js';
import { safe, norm } from '../utils/safePath.js';
import { mimeOf } from '../utils/mime.js';
import { copyRecursive, moveCrossFsSafe } from '../services/fsService.js';
import { transcodeQueue } from '../queue/bull.js';

const r = Router();
const upload = multer({ dest: TMP });

/* ---------- shared CORS headers for media streaming ---------- */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // 🔒 replace * with https://cloud.noteshandling.in in production
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
  'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
};

/* ---------- FS list ---------- */
r.get('/list', auth, async (req, res) => {
  const rel = norm(req.query.path || '/');
  const full = safe(rel);
  const dirents = await fs.readdir(full, { withFileTypes: true });
  const items = await Promise.all(
    dirents.map(async d => {
      const fp = path.join(full, d.name);
      const st = await fs.stat(fp);
      return { name: d.name, isDir: d.isDirectory(), size: st.size, mtime: st.mtime };
    })
  );
  items.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
  res.json({ path: rel, items });
});

/* ---------- mkdir / rm / mv / cp ---------- */
r.post('/mkdir', auth, async (req, res) => {
  await fs.mkdir(safe(req.body.path), { recursive: true });
  res.json({ ok: true });
});

r.post('/rm', auth, async (req, res) => {
  const p = safe(req.body.path);
  if (p === ROOT) throw new Error('Cannot delete root storage directory');
  await fs.rm(p, { recursive: true, force: true });
  res.json({ ok: true });
});

r.post('/mv', auth, async (req, res) => {
  const { from, to, src, dest, copy = false } = req.body;
  const s = safe(from || src);
  const d = safe(to || dest);
  if (copy) await copyRecursive(s, d);
  else await moveCrossFsSafe(s, d);
  res.json({ ok: true });
});

r.post('/cp', auth, async (req, res) => {
  const { from, to, src, dest } = req.body;
  await copyRecursive(safe(from || src), safe(to || dest));
  res.json({ ok: true });
});

/* ---------- upload ---------- */
r.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const dest = safe(path.join(req.body.dest || '/', req.file.originalname));
    await fs.copyFile(req.file.path, dest);
    res.json({ ok: true, name: req.file.originalname });

    // optional auto-transcode
    const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
    const isVideo = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'wmv', 'flv'].includes(ext);
    if (AUTO_TRANSCODE_UPLOAD && isVideo) {
      const name = path.parse(req.file.originalname).name;
      await transcodeQueue.add('hls', { src: dest, outDir: path.join(HLS, name), name });
    }
  } finally {
    if (req.file?.path) fs.rm(req.file.path, { force: true });
  }
});

/* ---------- download (with Range + CORS) ---------- */
// Handle preflight OPTIONS
r.options('/download', (req, res) => {
  res.set(corsHeaders);
  res.sendStatus(200);
});

r.get('/download', auth, async (req, res) => {
  const full = safe(req.query.path);
  const st = await fs.stat(full);
  const range = req.headers.range;

  if (!range) {
    res.writeHead(200, {
      ...corsHeaders,
      'Content-Length': st.size,
      'Content-Type': mimeOf(full),
      'Content-Disposition': `inline; filename="${path.basename(full)}"`,
      'Cache-Control': 'private, max-age=3600'
    });
    return fss.createReadStream(full).pipe(res);
  }

  const [s, e] = range.replace(/bytes=/, '').split('-').map(Number);
  const start = Number.isNaN(s) ? 0 : s;
  const end = Number.isNaN(e) ? st.size - 1 : e;

  if (start > end || end >= st.size) {
    res.writeHead(416, {
      ...corsHeaders,
      'Content-Range': `bytes */${st.size}`
    });
    return res.end();
  }

  res.writeHead(206, {
    ...corsHeaders,
    'Content-Range': `bytes ${start}-${end}/${st.size}`,
    'Accept-Ranges': 'bytes',
    'Content-Length': end - start + 1,
    'Content-Type': mimeOf(full),
    'Cache-Control': 'private, max-age=3600'
  });
  fss.createReadStream(full, { start, end }).pipe(res);
});

/* ---------- text files ---------- */
r.get('/text', auth, async (req, res) => {
  const full = safe(req.query.path);
  const text = await fs.readFile(full, 'utf8');
  res.json({ text });
});

r.put('/text', auth, async (req, res) => {
  const full = safe(req.body.path);
  await fs.writeFile(full, req.body.text, 'utf8');
  res.json({ ok: true });
});

/* ---------- thumbs (todo) ---------- */
r.get('/thumb', auth, async (_req, res) => {
  res.status(501).json({ error: 'Not implemented in modular split yet' });
});

export default r;
