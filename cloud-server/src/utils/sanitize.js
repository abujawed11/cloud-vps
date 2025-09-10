import path from 'node:path';

export function sanitizeBase(name) {
  const base = path.basename(name || '');
  const clean = base.replace(/[\\\/\0\r\n\t]/g, '').trim() || 'download.bin';
  return clean.slice(0, 255);
}
