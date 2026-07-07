import { createClient } from 'redis';

let _client: ReturnType<typeof createClient> | null = null;

export async function getRedis() {
  if (!_client) {
    _client = createClient({
      url: process.env.REDIS_URL,
      socket: {
        connectTimeout: 3000,
        reconnectStrategy: false,
      },
    });
    _client.on('error', (e) => console.error('[Redis] client error', e));
  }
  if (!_client.isOpen) {
    await _client.connect();
  }
  return _client;
}
