import fs from 'node:fs/promises';
import path from 'node:path';
import { HLS, FFMPEG_PRESET, FFMPEG_THREADS, HLS_GOP } from '../config/index.js';

export function hlsArgs({ src, outDir }) {
  const g = String(HLS_GOP);
  const commonVid = ['-c:v','libx264','-preset',FFMPEG_PRESET,'-threads',String(FFMPEG_THREADS),
                     '-sc_threshold','0','-g',g,'-keyint_min',g];
  const hlsFlags = ['-f','hls','-hls_time','6','-hls_flags','independent_segments','-hls_list_size','0'];

  return [
    '-y','-i', src,
    '-filter_complex',
    "[0:v]split=3[v1][v2][v3];" +
    "[v1]scale=w=1920:h=-2:force_original_aspect_ratio=decrease:force_divisible_by=2[v1o];" +
    "[v2]scale=w=1280:h=-2:force_original_aspect_ratio=decrease:force_divisible_by=2[v2o];" +
    "[v3]scale=w=854:h=-2:force_original_aspect_ratio=decrease:force_divisible_by=2[v3o]",

    // 1080p
    '-map','[v1o]','-map','0:a:0?','-c:a','aac','-ac','2','-b:a','192k',...commonVid,
    '-b:v','6000k','-maxrate','6500k','-bufsize','12000k', ...hlsFlags,
    '-hls_segment_filename', path.join(outDir,'1080p_%03d.ts'), path.join(outDir,'1080p.m3u8'),

    // 720p
    '-map','[v2o]','-map','0:a:0?','-c:a','aac','-ac','2','-b:a','128k',...commonVid,
    '-b:v','3000k','-maxrate','3500k','-bufsize','6000k',  ...hlsFlags,
    '-hls_segment_filename', path.join(outDir,'720p_%03d.ts'),  path.join(outDir,'720p.m3u8'),

    // 480p
    '-map','[v3o]','-map','0:a:0?','-c:a','aac','-ac','2','-b:a','96k', ...commonVid,
    '-b:v','1500k','-maxrate','1800k','-bufsize','3000k',  ...hlsFlags,
    '-hls_segment_filename', path.join(outDir,'480p_%03d.ts'),  path.join(outDir,'480p.m3u8'),
  ];
}

export async function writeMaster(outDir) {
  const master = [
    '#EXTM3U',
    '#EXT-X-VERSION:3',
    '#EXT-X-STREAM-INF:BANDWIDTH=6500000,RESOLUTION=1920x1080', '1080p.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=3500000,RESOLUTION=1280x720', '720p.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=1800000,RESOLUTION=854x480', '480p.m3u8',
  ].join('\n');
  await fs.writeFile(path.join(outDir, 'master.m3u8'), master);
}
