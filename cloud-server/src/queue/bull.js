import { Queue, QueueEvents } from 'bullmq';
import { REDIS_URL } from '../config/index.js';

export const transcodeQueue = new Queue('transcode', { connection: { url: REDIS_URL } });
export const transcodeEvents = new QueueEvents('transcode', { connection: { url: REDIS_URL } });
