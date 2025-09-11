import { PORT } from './config/index.js';
import app from './app.js';

const server = app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});

// Increase timeout for large file uploads (5 minutes)
server.timeout = 5 * 60 * 1000;
server.keepAliveTimeout = 65000;
server.headersTimeout = 66000;
