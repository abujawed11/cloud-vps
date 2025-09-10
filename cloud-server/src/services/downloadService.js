import fs from 'node:fs/promises';
import fss from 'node:fs';
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';
import got from 'got';
import path from 'node:path';
import contentDisposition from 'content-disposition';
import { TMP, MAX_DOWNLOAD_MB } from '../config/index.js';
import { sanitizeBase } from '../utils/sanitize.js';

const isPrivateIp = (ip) => {
  try { const a = ipaddr.parse(ip); return a.range() !== 'unicast'; } catch { return true; }
};

async function assertSafeHttpUrlStrict(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('Invalid URL'); }
  if (!/^https?:$/.test(u.protocol)) throw new Error('Only http/https allowed');
  const addrs = await dns.lookup(u.hostname, { all: true });
  if (addrs.some(a => isPrivateIp(a.address))) throw new Error('Blocked internal address');
  return u.toString();
}

export async function deriveFilenameFromHeadersOrUrl(url, headers) {
  const cd = headers?.['content-disposition'];
  if (cd) {
    try {
      const parsed = contentDisposition.parse(cd);
      const name = parsed.parameters['filename*'] || parsed.parameters.filename;
      if (name) return sanitizeBase(name);
    } catch {}
  }
  const tail = decodeURIComponent((new URL(url).pathname.split('/').pop() || '').trim());
  return sanitizeBase(tail || 'download.bin');
}

export async function downloadToTemp(validUrl) {
  const tmpPath = path.join(TMP, `dl_${Date.now()}_${Math.random().toString(36).slice(2)}`);
  const limitBytes = MAX_DOWNLOAD_MB * 1024 * 1024;

  await assertSafeHttpUrlStrict(validUrl);

  await new Promise((resolve, reject) => {
    const stream = got.stream(validUrl, {
      timeout: { request: 600000 },
      headers: { 'user-agent': 'Mozilla/5.0' },
      followRedirect: true
    });

    stream.on('redirect', async (res, nextOpts) => {
      try { await assertSafeHttpUrlStrict(res.responseUrl); }
      catch (e) { stream.destroy(e); }
    });

    let transferred = 0;
    stream.on('downloadProgress', p => {
      transferred = p.transferred || transferred;
      if (limitBytes && transferred > limitBytes) {
        stream.destroy(new Error('Max size exceeded'));
      }
    });

    const w = fss.createWriteStream(tmpPath);
    stream.on('error', reject).pipe(w).on('error', reject).on('finish', resolve);
  });

  return tmpPath;
}
