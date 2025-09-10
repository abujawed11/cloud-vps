import path from 'node:path';
import { ROOT } from '../config/index.js';

export const norm = p => (p || '/').replace(/\/+/g, '/');

export function safe(rel) {
  const cleanRel = (rel || '/').replace(/^\/+/, '');
  const full = path.resolve(ROOT, cleanRel);
  if (!full.startsWith(path.resolve(ROOT) + path.sep) && full !== path.resolve(ROOT)) {
    throw new Error('Unsafe path');
  }
  return full;
}
