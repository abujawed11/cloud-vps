// src/utils/sanitizeFilename.js
import path from 'node:path';

const MAX_FILENAME_BYTES = 255;

function utf8Len(s) {
  return Buffer.byteLength(s, 'utf8');
}

// Truncate without cutting a multi-byte character in half
function truncateUtf8(s, maxBytes) {
  if (utf8Len(s) <= maxBytes) return s;
  let lo = 0, hi = s.length;
  while (lo < hi) {
    const mid = Math.floor((lo + hi + 1) / 2);
    if (utf8Len(s.slice(0, mid)) <= maxBytes) lo = mid;
    else hi = mid - 1;
  }
  return s.slice(0, lo);
}

export function sanitizeFilename(original) {
  let name = (original || 'file').toString();

  // Normalize and strip combining marks (accents, etc.)
  name = name.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');

  // Replace obviously problematic punctuation (fancy vertical bar, etc.)
  name = name.replace(/[\uFF5C\u2014\u2013]/g, '-'); // FULLWIDTH |, em/en-dash → -

  // Remove path/illegal/reserved chars and control chars
  name = name
    .replace(/[/\\?%*:|"<>]/g, '-')           // reserved/path chars
    .replace(/[\u0000-\u001F\u007F]/g, '')    // control chars
    .replace(/\s+/g, ' ')                     // collapse spaces
    .trim();

  if (!name) name = 'file';

  // Split into base + ext
  const p = path.parse(name);
  let base = p.name || 'file';
  let ext  = (p.ext || '').replace(/^\./, ''); // without leading dot

  // Cap absurdly long extensions
  if (utf8Len(ext) > 20) ext = truncateUtf8(ext, 20);

  // Reserve space for dot + ext (if any)
  const dotExt = ext ? `.${ext}` : '';
  const dotExtBytes = utf8Len(dotExt);
  const maxBaseBytes = Math.max(1, MAX_FILENAME_BYTES - dotExtBytes);

  // Truncate base to fit within 255 bytes total
  base = truncateUtf8(base, maxBaseBytes);

  let finalName = `${base}${dotExt}`;

  // Paranoia: enforce final check
  if (utf8Len(finalName) > MAX_FILENAME_BYTES) {
    finalName = truncateUtf8(finalName, MAX_FILENAME_BYTES);
  }

  return finalName || 'file';
}

/**
 * Optional: make name unique in a directory without exceeding 255 bytes.
 * Uses "name (1).ext", "name (2).ext", ... pattern.
 */
export function makeUniqueInDirSync(dirPath, desiredName, existsSync) {
  const tryName = (base, ext, n) => (n === 0 ? `${base}${ext}` : `${base} (${n})${ext}`);
  const p = path.parse(desiredName);
  let base = p.name;
  let ext = p.ext || '';

  // Keep adding (n) until free
  let n = 0;
  while (true) {
    let candidate = tryName(base, ext, n);

    // Trim candidate if it ran over the byte limit
    if (utf8Len(candidate) > MAX_FILENAME_BYTES) {
      // Make space for " (n)" and ext
      const suffix = (n === 0 ? '' : ` (${n})`) + ext;
      const maxBase = Math.max(1, MAX_FILENAME_BYTES - utf8Len(suffix));
      base = truncateUtf8(p.name, maxBase);
      candidate = tryName(base, ext, n);
    }

    if (!existsSync(path.join(dirPath, candidate))) return candidate;
    n += 1;
  }
}
