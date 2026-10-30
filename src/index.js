import http from 'node:http';
import { handler } from './server.js';

const port = Number(process.env.PORT || 3000);
http.createServer(handler).listen(port, () => console.log(`Monitoring API listening on port ${port}`));
