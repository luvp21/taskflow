import { createApp } from './app.js';
import { config } from './config.js';
import { connectDb } from './db.js';

// Connect before listening so the API never accepts requests it can't serve.
try {
  await connectDb(config.MONGODB_URI);
} catch (error) {
  console.error('Could not connect to MongoDB:', error);
  process.exit(1);
}

createApp().listen(config.PORT, () => {
  console.log(`API listening on http://localhost:${config.PORT}`);
});
