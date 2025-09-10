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




// import { Router } from 'express';
// import fs from 'node:fs/promises';
// import fss from 'node:fs';
// import path from 'node:path';
// import multer from 'multer';
// import { auth } from '../middlewares/auth.js';
// import { ROOT, THUMBS, TMP, AUTO_TRANSCODE_UPLOAD, HLS } from '../config/index.js';
// import { safe, norm } from '../utils/safePath.js';
// import { mimeOf } from '../utils/mime.js';
// import { copyRecursive, moveCrossFsSafe } from '../services/fsService.js';
// import { transcodeQueue } from '../queue/bull.js';

// const r = Router();
// const upload = multer({ dest: TMP });

// /* ---------- shared CORS headers for media streaming ---------- */
// const corsHeaders = {
//   'Access-Control-Allow-Origin': '*', // 🔒 replace * with https://cloud.noteshandling.in in production
//   'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
//   'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
//   'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
// };

// /* ---------- FS list ---------- */
// r.get('/list', auth, async (req, res) => {
//   const rel = norm(req.query.path || '/');
//   const full = safe(rel);
//   const dirents = await fs.readdir(full, { withFileTypes: true });
//   const items = await Promise.all(
//     dirents.map(async d => {
//       const fp = path.join(full, d.name);
//       const st = await fs.stat(fp);
//       return { name: d.name, isDir: d.isDirectory(), size: st.size, mtime: st.mtime };
//     })
//   );
//   items.sort((a, b) => (b.isDir - a.isDir) || a.name.localeCompare(b.name));
//   res.json({ path: rel, items });
// });

// /* ---------- mkdir / rm / mv / cp ---------- */
// r.post('/mkdir', auth, async (req, res) => {
//   await fs.mkdir(safe(req.body.path), { recursive: true });
//   res.json({ ok: true });
// });

// r.post('/rm', auth, async (req, res) => {
//   const p = safe(req.body.path);
//   if (p === ROOT) throw new Error('Cannot delete root storage directory');
//   await fs.rm(p, { recursive: true, force: true });
//   res.json({ ok: true });
// });

// r.post('/mv', auth, async (req, res) => {
//   const { from, to, src, dest, copy = false } = req.body;
//   const s = safe(from || src);
//   const d = safe(to || dest);
//   if (copy) await copyRecursive(s, d);
//   else await moveCrossFsSafe(s, d);
//   res.json({ ok: true });
// });

// r.post('/cp', auth, async (req, res) => {
//   const { from, to, src, dest } = req.body;
//   await copyRecursive(safe(from || src), safe(to || dest));
//   res.json({ ok: true });
// });

// /* ---------- upload ---------- */
// r.post('/upload', auth, upload.single('file'), async (req, res) => {
//   try {
//     const dest = safe(path.join(req.body.dest || '/', req.file.originalname));
//     await fs.copyFile(req.file.path, dest);
//     res.json({ ok: true, name: req.file.originalname });

//     // optional auto-transcode
//     const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
//     const isVideo = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'wmv', 'flv'].includes(ext);
//     if (AUTO_TRANSCODE_UPLOAD && isVideo) {
//       const name = path.parse(req.file.originalname).name;
//       await transcodeQueue.add('hls', { src: dest, outDir: path.join(HLS, name), name });
//     }
//   } finally {
//     if (req.file?.path) fs.rm(req.file.path, { force: true });
//   }
// });

// /* ---------- download (with Range + CORS) ---------- */
// // Handle preflight OPTIONS

// /* ---------- download (with Range + CORS, robust) ---------- */
// r.options('/download', (req, res) => {
//   res.set({
//     'Access-Control-Allow-Origin': '*', // 🔒 set to your domain in prod
//     'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
//     'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
//     'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges'
//   });
//   res.sendStatus(200);
// });

// r.get('/download', auth, async (req, res) => {
//   const full = safe(req.query.path);
//   const st = await fs.stat(full);
//   const size = st.size;
//   const range = req.headers.range;

//   // Common headers for all responses
//   const baseHeaders = {
//     'Access-Control-Allow-Origin': '*', // 🔒 set to https://cloud.noteshandling.in in prod
//     'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
//     'Accept-Ranges': 'bytes',
//     'Content-Type': mimeOf(full),
//     'Cache-Control': 'private, max-age=3600',
//     'Content-Disposition': `inline; filename="${path.basename(full)}"`
//   };

//   // HEAD requests: send headers only (no body)
//   if (req.method === 'HEAD') {
//     res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
//     return res.end();
//   }

//   if (!range) {
//     // Full-content response
//     res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
//     return fss.createReadStream(full).pipe(res);
//   }

//   // ---- Robust Range parsing ----
//   // Accept:
//   //   bytes=START-
//   //   bytes=START-END
//   //   bytes=-SUFFIX_LENGTH
//   let start, end;
//   const m = /^bytes=(\d*)-(\d*)$/.exec(range);
//   if (!m) {
//     // Malformed Range -> 416 with required header
//     res.writeHead(416, {
//       ...baseHeaders,
//       'Content-Range': `bytes */${size}`
//     });
//     return res.end();
//   }

//   const startStr = m[1];
//   const endStr = m[2];

//   if (startStr === '' && endStr === '') {
//     // "bytes=-" (invalid)
//     res.writeHead(416, {
//       ...baseHeaders,
//       'Content-Range': `bytes */${size}`
//     });
//     return res.end();
//   }

//   if (startStr === '') {
//     // Suffix range: last N bytes
//     const suffixLength = parseInt(endStr, 10);
//     if (isNaN(suffixLength)) {
//       res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
//       return res.end();
//     }
//     if (suffixLength === 0) {
//       // last 0 bytes -> empty but valid
//       start = size; // will produce empty body
//       end = size - 1;
//     } else {
//       start = Math.max(0, size - suffixLength);
//       end = size - 1;
//     }
//   } else {
//     start = parseInt(startStr, 10);
//     end = endStr ? parseInt(endStr, 10) : size - 1;
//   }

//   // Clamp end to EOF
//   if (end >= size) end = size - 1;

//   // Validate now
//   if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= size) {
//     res.writeHead(416, {
//       ...baseHeaders,
//       'Content-Range': `bytes */${size}`
//     });
//     return res.end();
//   }

//   const chunkSize = end - start + 1;
//   res.writeHead(206, {
//     ...baseHeaders,
//     'Content-Range': `bytes ${start}-${end}/${size}`,
//     'Content-Length': chunkSize
//   });

//   const stream = fss.createReadStream(full, { start, end });
//   stream.pipe(res);
// });


// /* ---------- text files ---------- */
// r.get('/text', auth, async (req, res) => {
//   const full = safe(req.query.path);
//   const text = await fs.readFile(full, 'utf8');
//   res.json({ text });
// });

// r.put('/text', auth, async (req, res) => {
//   const full = safe(req.body.path);
//   await fs.writeFile(full, req.body.text, 'utf8');
//   res.json({ ok: true });
// });

// /* ---------- thumbs (todo) ---------- */
// r.get('/thumb', auth, async (_req, res) => {
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
import { sanitizeFilename, makeUniqueInDirSync } from '../utils/sanitizeFilename.js';


const r = Router();
const upload = multer({ dest: TMP });

// 👇 Use one place to define the allowed origin (override via env in prod)
const ALLOW_ORIGIN = process.env.CORS_ORIGIN || 'https://cloud.noteshandling.in';

/* ---------- generic preflight for everything under /fs/* ---------- */
r.options('*', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': req.headers.origin || ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Access-Control-Allow-Credentials': 'true',
  });
  res.sendStatus(200);
});

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
// r.post('/upload', auth, upload.single('file'), async (req, res) => {
//   try {
//     const dest = safe(path.join(req.body.dest || '/', req.file.originalname));
//     await fs.copyFile(req.file.path, dest);
//     // No need to set CORS manually here; the global app CORS + r.options above handle it
//     res.json({ ok: true, name: req.file.originalname });

//     // optional auto-transcode
//     const ext = (req.file.originalname.split('.').pop() || '').toLowerCase();
//     const isVideo = ['mp4', 'mkv', 'mov', 'webm', 'avi', 'm4v', 'wmv', 'flv'].includes(ext);
//     if (AUTO_TRANSCODE_UPLOAD && isVideo) {
//       const name = path.parse(req.file.originalname).name;
//       await transcodeQueue.add('hls', { src: dest, outDir: path.join(HLS, name), name });
//     }
//   } finally {
//     if (req.file?.path) fs.rm(req.file.path, { force: true });
//   }
// });


r.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const destRelDir = req.body.dest || '/';
    const destDir = safe(destRelDir);      // ensure directory is within ROOT
    await fs.mkdir(destDir, { recursive: true });

    // 1) sanitize
    const safeName = sanitizeFilename(req.file.originalname);

    // 2) optional: avoid overwriting existing file while keeping ≤255 bytes
    const finalName = makeUniqueInDirSync(destDir, safeName, fsSync.existsSync);

    const dest = path.join(destDir, finalName);

    try {
      await fs.copyFile(req.file.path, dest);
    } catch (e) {
      console.error('Upload copy failed:', e);
      return res.status(400).json({ error: e.message || 'Upload failed' });
    }

    res.json({ ok: true, name: finalName, path: path.join(destRelDir, finalName) });

    // optional auto-transcode
    const ext = (finalName.split('.').pop() || '').toLowerCase();
    const isVideo = ['mp4','mkv','mov','webm','avi','m4v','wmv','flv'].includes(ext);
    if (AUTO_TRANSCODE_UPLOAD && isVideo) {
      const justName = path.parse(finalName).name;
      await transcodeQueue.add('hls', { src: dest, outDir: path.join(HLS, justName), name: justName });
    }
  } finally {
    if (req.file?.path) fs.rm(req.file.path, { force: true });
  }
});

/* ---------- download (with Range + robust CORS) ---------- */
r.options('/download', (req, res) => {
  res.set({
    'Access-Control-Allow-Origin': req.headers.origin || ALLOW_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Authorization, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Access-Control-Allow-Credentials': 'true',
  });
  res.sendStatus(200);
});

r.get('/download', auth, async (req, res) => {
  const full = safe(req.query.path);
  const st = await fs.stat(full);
  const size = st.size;
  const range = req.headers.range;

  // Common headers for all responses
  const baseHeaders = {
    'Access-Control-Allow-Origin': req.headers.origin || ALLOW_ORIGIN,
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
    'Access-Control-Allow-Credentials': 'true',
    'Accept-Ranges': 'bytes',
    'Content-Type': mimeOf(full),
    'Cache-Control': 'private, max-age=3600',
    'Content-Disposition': `inline; filename="${path.basename(full)}"`,
  };

  // HEAD requests: headers only
  if (req.method === 'HEAD') {
    res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
    return res.end();
  }

  if (!range) {
    res.writeHead(200, { ...baseHeaders, 'Content-Length': size });
    return fss.createReadStream(full).pipe(res);
  }

  // Parse Range: bytes=START-END | START- | -SUFFIX
  let start, end;
  const m = /^bytes=(\d*)-(\d*)$/.exec(range);
  if (!m) {
    res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
    return res.end();
  }

  const startStr = m[1];
  const endStr = m[2];

  if (startStr === '' && endStr === '') {
    res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
    return res.end();
  }

  if (startStr === '') {
    // suffix range
    const suffixLength = parseInt(endStr, 10);
    if (isNaN(suffixLength)) {
      res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
      return res.end();
    }
    if (suffixLength === 0) {
      start = size;  // empty body
      end = size - 1;
    } else {
      start = Math.max(0, size - suffixLength);
      end = size - 1;
    }
  } else {
    start = parseInt(startStr, 10);
    end = endStr ? parseInt(endStr, 10) : size - 1;
  }

  if (end >= size) end = size - 1;
  if (isNaN(start) || isNaN(end) || start < 0 || start > end || start >= size) {
    res.writeHead(416, { ...baseHeaders, 'Content-Range': `bytes */${size}` });
    return res.end();
  }

  const chunkSize = end - start + 1;
  res.writeHead(206, {
    ...baseHeaders,
    'Content-Range': `bytes ${start}-${end}/${size}`,
    'Content-Length': chunkSize,
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
