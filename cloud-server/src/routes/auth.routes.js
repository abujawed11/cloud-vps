import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';

const r = Router();
const user = { email: 'you@example.com', password: 'supersecret' };

r.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (email === user.email && password === user.password) {
    return res.json({ token: jwt.sign({ sub: email }, JWT_SECRET, { expiresIn: '7d' }) });
  }
  res.status(401).json({ error: 'Invalid credentials' });
});

export default r;
