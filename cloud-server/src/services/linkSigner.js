import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

const secret = JWT_SECRET;
const ttl = Number(process.env.LINK_TTL_SECONDS || 7 * 24 * 3600); // 7 days default

function makeDirectLinkPayload({ path, asAttachment = false }) {
  return { path, asAttachment };
}

function signLink(payload, expiresInSec = ttl) {
  return jwt.sign(payload, secret, { expiresIn: expiresInSec });
}

function verifyLink(token) {
  return jwt.verify(token, secret);
}

export { makeDirectLinkPayload, signLink, verifyLink };