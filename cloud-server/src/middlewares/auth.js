import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

export const auth = (req, res, next) => {
  try {
    const t = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    jwt.verify(t, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
