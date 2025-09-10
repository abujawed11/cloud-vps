import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

export const auth = (req, res, next) => {
  try {
    // Check Authorization header first, then query parameter for media files
    let token = (req.headers.authorization || '').replace(/^Bearer\s+/, '');
    if (!token) {
      token = req.query.token || '';
    }
    jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
};
