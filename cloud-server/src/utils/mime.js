import { lookup as mime } from 'mime-types';
export const mimeOf = (p) => mime(p) || 'application/octet-stream';
