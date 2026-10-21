import { buildServer } from './server.js';

const port = Number(process.env['CORE_PORT'] ?? 4000);
const host = process.env['CORE_HOST'] ?? '127.0.0.1';

const server = buildServer();
await server.listen({ port, host });
