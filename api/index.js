import { handler } from '../src/server.js';

export default function vercelHandler(req, res) {
  const requestUrl = new URL(req.url || '/', 'http://localhost');
  const requestedPath = req.query?.path || requestUrl.searchParams.get('path');
  if (typeof requestedPath === 'string' && requestedPath.startsWith('/')) {
    const query = new URLSearchParams();
    const requestQuery = Object.fromEntries(requestUrl.searchParams.entries());
    Object.entries({ ...requestQuery, ...(req.query || {}) }).forEach(([key, value]) => {
      if (key !== 'path' && typeof value === 'string') query.set(key, value);
    });
    const suffix = query.toString() ? `?${query}` : '';
    req.url = `/api${requestedPath}${suffix}`;
  }
  return handler(req, res);
}
