import { PORT } from './config/index.js';
import app from './app.js';

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});
