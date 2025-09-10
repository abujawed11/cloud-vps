import 'dotenv/config';
import path from 'node:path';

const env = (k, d) => process.env[k] ?? d;

export const PORT = parseInt(env('PORT', '5000'), 10);
export const JWT_SECRET = env('JWT_SECRET', 'change-me');
export const REDIS_URL = env('REDIS_URL', 'redis://127.0.0.1:6379');

export const ROOT   = env('ROOT',   '/srv/storage/library');
export const HLS    = env('HLS',    '/srv/storage/hls');
export const THUMBS = env('THUMBS', '/srv/storage/thumbs');
export const TMP    = env('TMP',    '/srv/storage/tmp');

export const FFMPEG = env('FFMPEG', '/usr/bin/ffmpeg');
export const FFMPEG_THREADS = parseInt(env('FFMPEG_THREADS', '2'), 10);
export const FFMPEG_PRESET  = env('FFMPEG_PRESET', 'veryfast');
export const HLS_GOP = parseInt(env('HLS_GOP', '60'), 10);

export const AUTO_TRANSCODE_UPLOAD = env('AUTO_TRANSCODE_UPLOAD', 'false') === 'true';
export const MAX_DOWNLOAD_MB = parseInt(env('MAX_DOWNLOAD_MB', '2048'), 10);

export const ensureTrailingSep = p => (p.endsWith(path.sep) ? p : p + path.sep);
