// import fs from 'node:fs/promises';
// import fss from 'node:fs';
// import dns from 'node:dns/promises';
// import ipaddr from 'ipaddr.js';
// import got from 'got';
// import path from 'node:path';
// import contentDisposition from 'content-disposition';
// import { TMP, MAX_DOWNLOAD_MB } from '../config/index.js';
// import { sanitizeBase } from '../utils/sanitize.js';

// const isPrivateIp = (ip) => {
//   try { const a = ipaddr.parse(ip); return a.range() !== 'unicast'; } catch { return true; }
// };

// async function assertSafeHttpUrlStrict(raw) {
//   let u;
//   try { u = new URL(raw); } catch { throw new Error('Invalid URL'); }
//   if (!/^https?:$/.test(u.protocol)) throw new Error('Only http/https allowed');
//   const addrs = await dns.lookup(u.hostname, { all: true });
//   if (addrs.some(a => isPrivateIp(a.address))) throw new Error('Blocked internal address');
//   return u.toString();
// }

// export async function deriveFilenameFromHeadersOrUrl(url, headers) {
//   const cd = headers?.['content-disposition'];
//   if (cd) {
//     try {
//       const parsed = contentDisposition.parse(cd);
//       const name = parsed.parameters['filename*'] || parsed.parameters.filename;
//       if (name) return sanitizeBase(name);
//     } catch { }
//   }
//   const tail = decodeURIComponent((new URL(url).pathname.split('/').pop() || '').trim());
//   return sanitizeBase(tail || 'download.bin');
// }

// export async function downloadToTemp(validUrl) {
//   const tmpPath = path.join(TMP, `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`);
//   const limitBytes = MAX_DOWNLOAD_MB * 1024 * 1024;

//   await assertSafeHttpUrlStrict(validUrl);

//   await new Promise((resolve, reject) => {
//     const stream = got.stream(validUrl, {
//       timeout: { request: 600000 },
//       headers: { 'user-agent': 'Mozilla/5.0' },
//       followRedirect: true
//     });

//     stream.on('redirect', async (res, nextOpts) => {
//       try { await assertSafeHttpUrlStrict(res.responseUrl); }
//       catch (e) { stream.destroy(e); }
//     });

//     let transferred = 0;
//     stream.on('downloadProgress', p => {
//       try {
//         const pct = p?.total
//           ? Math.round((p.transferred / p.total) * 100)
//           : Math.min(99, Math.round((p?.percent || 0) * 100));
//         job.progress = pct;
//         remoteDownloads.set(id, job);   // <— keep the Map in sync
//       } catch { }
//     });
//     // stream.on('downloadProgress', p => {
//     //   transferred = p.transferred || transferred;
//     //   if (limitBytes && transferred > limitBytes) {
//     //     stream.destroy(new Error('Max size exceeded'));
//     //   }
//     // });

//     const w = fss.createWriteStream(tmpPath);
//     stream.on('error', reject).pipe(w).on('error', reject).on('finish', resolve);
//   });

//   return tmpPath;
// }





import fs from 'node:fs/promises';
import fss from 'node:fs';
import dns from 'node:dns/promises';
import http from 'node:http';
import https from 'node:https';
import ipaddr from 'ipaddr.js';
import got from 'got';
import path from 'node:path';
import contentDisposition from 'content-disposition';
import { TMP, MAX_DOWNLOAD_MB } from '../config/index.js';
import { sanitizeFilename } from '../utils/sanitizeFilename.js';

const isPrivateIp = (ip) => {
  try {
    const a = ipaddr.parse(ip);
    return a.range() !== 'unicast'; // true if private/loopback/link-local
  } catch {
    return true;
  }
};

async function assertSafeHttpUrlStrict(raw) {
  let u;
  try {
    u = new URL(raw);
  } catch {
    throw new Error('Invalid URL');
  }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http/https allowed');

  const addrs = await dns.lookup(u.hostname, { all: true });
  if (addrs.some((a) => isPrivateIp(a.address))) {
    throw new Error('Blocked internal address');
  }
  return u.toString();
}



export async function deriveFilenameFromHeadersOrUrl(url, headers) {
  // try Content-Disposition first
  const cd = headers?.['content-disposition'];
  if (cd) {
    try {
      const parsed = contentDisposition.parse(cd);
      const candidate = parsed.parameters['filename*'] || parsed.parameters.filename;
      if (candidate) return sanitizeFilename(candidate);
    } catch {}
  }
  // fallback to URL tail
  const tail = decodeURIComponent((new URL(url).pathname.split('/').pop() || '').trim());
  return sanitizeFilename(tail || 'download.bin');
}

// export async function deriveFilenameFromHeadersOrUrl(url, headers) {
//   const cd = headers?.['content-disposition'];
//   if (cd) {
//     try {
//       const parsed = contentDisposition.parse(cd);
//       const name =
//         parsed.parameters['filename*'] || parsed.parameters.filename;
//       if (name) return sanitizeBase(name);
//     } catch {}
//   }
//   const tail = decodeURIComponent(
//     (new URL(url).pathname.split('/').pop() || '').trim()
//   );
//   return sanitizeBase(tail || 'download.bin');
// }

/**
 * Download to a temp file.
 * @param {string} validUrl - already validated URL
 * @param {function} onProgress - optional callback(percent)
 * @returns {Promise<string>} - path to temp file
 */
export async function downloadToTemp(validUrl, onProgress) {
  const tmpPath = path.join(
    TMP,
    `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );
  const limitBytes = MAX_DOWNLOAD_MB * 1024 * 1024;

  await assertSafeHttpUrlStrict(validUrl);

  const downloadResult = await new Promise((resolve, reject) => {
    const stream = got.stream(validUrl, {
      timeout: { 
        request: 30000,
        response: 60000 
      },
      headers: { 
        'user-agent': 'Mozilla/5.0',
        'accept-encoding': 'gzip, deflate, br'
      },
      followRedirect: true,
      retry: {
        limit: 3,
        methods: ['GET']
      },
      http2: true,
      decompress: true,
      agent: {
        http: new http.Agent({
          keepAlive: true,
          maxSockets: 10
        }),
        https: new https.Agent({
          keepAlive: true,
          maxSockets: 10
        })
      }
    });

    let expectedSize = null;
    let actualBytes = 0;

    stream.on('response', (response) => {
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        expectedSize = parseInt(contentLength, 10);
      }
    });

    stream.on('redirect', async (res) => {
      try {
        await assertSafeHttpUrlStrict(res.responseUrl);
      } catch (e) {
        stream.destroy(e);
      }
    });

    stream.on('downloadProgress', (p) => {
      try {
        actualBytes = p.transferred || 0;
        
        if (expectedSize && expectedSize > 0) {
          const pct = Math.round((actualBytes / expectedSize) * 100);
          if (onProgress) onProgress(Math.min(pct, 99));
        } else if (p?.percent) {
          const pct = Math.min(99, Math.round(p.percent * 100));
          if (onProgress) onProgress(pct);
        }
        
        if (limitBytes && actualBytes > limitBytes) {
          stream.destroy(new Error('Max size exceeded'));
        }
      } catch (e) {
        console.error('Progress tracking error:', e);
      }
    });

    const w = fss.createWriteStream(tmpPath);
    let streamEnded = false;
    let writeStreamEnded = false;

    stream.on('error', (err) => {
      console.error('Download stream error:', err);
      w.destroy();
      reject(err);
    });

    w.on('error', (err) => {
      console.error('Write stream error:', err);
      stream.destroy();
      reject(err);
    });

    stream.on('end', () => {
      streamEnded = true;
      if (writeStreamEnded) {
        resolve({ expectedSize, actualBytes });
      }
    });

    w.on('finish', async () => {
      writeStreamEnded = true;
      if (streamEnded) {
        // Final progress update
        if (onProgress) onProgress(100);
        resolve({ expectedSize, actualBytes });
      }
    });

    stream.pipe(w);
  });

  // Verify file size after download
  const stats = await fs.stat(tmpPath);
  const fileSize = stats.size;
  
  console.log(`Download completed: Expected=${downloadResult.expectedSize}, Actual=${downloadResult.actualBytes}, File=${fileSize}`);
  
  if (downloadResult.expectedSize && Math.abs(fileSize - downloadResult.expectedSize) > 1024) {
    throw new Error(`File size mismatch: expected ${downloadResult.expectedSize}, got ${fileSize}`);
  }

  return tmpPath;
}

