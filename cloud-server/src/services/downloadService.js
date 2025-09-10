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
    const range = a.range();
    // Only block truly private ranges, not CDN/public IPs
    return range === 'private' || range === 'loopback' || range === 'linkLocal';
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

  // Skip IP validation for known CDN domains
  const trustedDomains = ['seedr.cc', 'googleapis.com', 'cloudflare.com', 'fastly.com'];
  const hostname = u.hostname.toLowerCase();
  
  if (trustedDomains.some(domain => hostname.endsWith(domain))) {
    console.log(`Trusted domain ${hostname}, skipping IP validation`);
    return u.toString();
  }

  try {
    const addrs = await dns.lookup(u.hostname, { all: true });
    console.log(`DNS lookup for ${u.hostname}:`, addrs.map(a => a.address));
    
    if (addrs.some((a) => isPrivateIp(a.address))) {
      throw new Error(`Blocked internal address for ${u.hostname}: ${addrs.map(a => a.address).join(', ')}`);
    }
  } catch (dnsError) {
    console.log(`DNS lookup failed for ${u.hostname}, allowing anyway:`, dnsError.message);
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

  // Attempt download with resume capability
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    attempt++;
    console.log(`Download attempt ${attempt}/${maxAttempts} for ${validUrl}`);
    
    try {
      const downloadResult = await attemptDownload(validUrl, tmpPath, onProgress, limitBytes, attempt > 1);
      
      // Verify file size after successful download
      const stats = await fs.stat(tmpPath);
      const fileSize = stats.size;
      
      console.log(`Download completed: Expected=${downloadResult.expectedSize}, Actual=${downloadResult.actualBytes}, File=${fileSize}`);
      
      if (downloadResult.expectedSize && Math.abs(fileSize - downloadResult.expectedSize) > 1024) {
        if (attempt < maxAttempts) {
          console.log(`Size mismatch on attempt ${attempt}, retrying with resume...`);
          continue;
        } else {
          throw new Error(`File size mismatch after ${maxAttempts} attempts: expected ${downloadResult.expectedSize}, got ${fileSize}`);
        }
      }
      
      return tmpPath;
    } catch (error) {
      console.log(`Download attempt ${attempt} failed:`, error.message);
      if (attempt >= maxAttempts) {
        throw error;
      }
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

async function attemptDownload(validUrl, tmpPath, onProgress, limitBytes, isResume = false) {
  let startByte = 0;
  
  // Check if partial file exists for resume
  if (isResume) {
    try {
      const stats = await fs.stat(tmpPath);
      startByte = stats.size;
      console.log(`Resuming download from byte ${startByte}`);
    } catch {
      startByte = 0;
    }
  }

  const downloadResult = await new Promise((resolve, reject) => {
    const stream = got.stream(validUrl, {
      timeout: { 
        request: 60000,   // 1 minute connection
        response: 120000, // 2 minutes between chunks
        send: 30000,      // 30 seconds to send
        lookup: 10000     // 10 seconds DNS
      },
      headers: { 
        'user-agent': 'curl/7.68.0', // Simpler user agent
        'accept': '*/*',
        'accept-encoding': 'identity',
        'connection': 'keep-alive',
        'cache-control': 'no-cache',
        'pragma': 'no-cache',
        ...(startByte > 0 ? { 'range': `bytes=${startByte}-` } : {})
      },
      followRedirect: true,
      maxRedirects: 5,
      retry: {
        limit: 3,
        methods: ['GET'],
        statusCodes: [408, 413, 429, 500, 502, 503, 504, 521, 522, 524],
        errorCodes: ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND', 'ENETUNREACH', 'EAI_AGAIN']
      },
      http2: false,
      decompress: false,
      dnsCache: true,
      agent: {
        http: new http.Agent({
          keepAlive: true,
          keepAliveMsecs: 30000,
          maxSockets: 3,        // Reduced concurrent connections
          maxFreeSockets: 1,
          timeout: 120000,
          scheduling: 'fifo'
        }),
        https: new https.Agent({
          keepAlive: true,
          keepAliveMsecs: 30000,
          maxSockets: 3,        // Reduced concurrent connections  
          maxFreeSockets: 1,
          timeout: 120000,
          scheduling: 'fifo',
          secureProtocol: 'TLSv1_2_method' // Force TLS 1.2
        })
      }
    });

    let expectedSize = null;
    let actualBytes = 0;

    stream.on('response', (response) => {
      const contentLength = response.headers['content-length'];
      const contentRange = response.headers['content-range'];
      
      if (contentRange) {
        // Parse content-range: bytes 1024-2047/2048
        const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
        if (match) {
          expectedSize = parseInt(match[1], 10);
        }
      } else if (contentLength) {
        expectedSize = parseInt(contentLength, 10) + startByte;
      }
      
      console.log(`Response headers: Content-Length=${contentLength}, Content-Range=${contentRange}, Expected total size=${expectedSize}`);
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
        actualBytes = (p.transferred || 0) + startByte;
        
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

    const w = fss.createWriteStream(tmpPath, { flags: startByte > 0 ? 'a' : 'w' });
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

  return downloadResult;
}

