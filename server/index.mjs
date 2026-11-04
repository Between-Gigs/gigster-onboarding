import { resolve } from 'node:path';
import { createApp } from './app.mjs';
import { readConfig } from './auth.mjs';
import { openStore } from './store.mjs';

const config = readConfig();
const store = openStore(resolve(config.databasePath));
const app = createApp({ store, config });
const server = app.listen(config.port, config.host, () => {
  console.log(`Between Gigs API listening on ${config.host}:${config.port}. Authentication ${config.authConfigured ? 'configured' : 'requires configuration'}.`);
});
function shutdown() {
  server.close(() => { store.close(); process.exit(0); });
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
