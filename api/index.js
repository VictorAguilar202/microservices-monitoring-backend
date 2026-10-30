import { handler } from '../src/server.js';

export default function vercelHandler(req, res) {
  const requestedPath = req.query?.path;
  if (typeof requestedPath === 'string' && requestedPath.startsWith('/')) {
    const query = new URLSearchParams();
    Object.entries(req.query || {}).forEach(([key, value]) => {
      if (key !== 'path' && typeof value === 'string') query.set(key, value);
    });
    const suffix = query.toString() ? `?${query}` : '';
    req.url = `/api${requestedPath}${suffix}`;
  }
  return handler(req, res);
}
