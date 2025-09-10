import { Worker } from 'bullmq';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import path from 'node:path';
import { REDIS_URL, FFMPEG } from '../config/index.js';
import { hlsArgs, writeMaster } from '../services/transcodeService.js';

const pExecFile = promisify(execFile);

// Run ONE job at a time on this VPS
new Worker('transcode', async (job) => {
  const { src, outDir } = job.data;
  await fs.mkdir(outDir, { recursive: true });

  const args = hlsArgs({ src, outDir });
  await pExecFile(FFMPEG, args, { maxBuffer: 20 * 1024 * 1024 });

  await writeMaster(outDir);
}, {
  connection: { url: REDIS_URL },
  concurrency: 1
});

console.log('Transcode worker running...');
