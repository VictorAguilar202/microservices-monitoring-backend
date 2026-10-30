import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 3000);
const MAX_LOGS = 1000;
const services = new Map([
  ['inventory', { name: 'Inventory', endpoint: process.env.INVENTORY_URL || null }],
  ['orders', { name: 'Orders', endpoint: process.env.ORDERS_URL || null }],
  ['payments', { name: 'Payments', endpoint: process.env.PAYMENTS_URL || null }]
]);
const logs = [];

function recordLog({ service, operation, status, durationMs, requestId, timestamp = new Date().toISOString() }) {
  const entry = { requestId, timestamp, service, operation, durationMs, status };
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.pop();
  return entry;
}

function json(res, status, body) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch { reject(new Error('Request body must be valid JSON')); }
    });
    req.on('error', reject);
  });
}

async function execute(serviceKey, operation, params = {}) {
  const service = services.get(serviceKey);
  if (!service) throw new Error(`Unknown service: ${serviceKey}`);
  const started = performance.now();
  const requestId = randomUUID();
  let status = 'SUCCESS';
  try {
    if (service.endpoint) {
      const target = new URL(operation, service.endpoint);
      Object.entries(params).forEach(([key, value]) => target.searchParams.set(key, String(value)));
      const response = await fetch(target, { signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
    } else {
      await new Promise(resolve => setTimeout(resolve, 40 + Math.floor(Math.random() * 180)));
    }
    return { requestId, result: { service: serviceKey, operation, params } };
  } catch (error) {
    status = 'ERROR';
    throw error;
  } finally {
    recordLog({ service: serviceKey, operation, status, durationMs: Math.round(performance.now() - started), requestId });
  }
}

function parseLimit(value, fallback = 20) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 100 ? parsed : fallback;
}

async function handler(req, res) {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return json(res, 200, { status: 'ok', uptime: process.uptime() });
    if (req.method === 'GET' && url.pathname === '/api/services') {
      return json(res, 200, [...services.entries()].map(([id, value]) => ({ id, name: value.name })));
    }
    if (req.method === 'GET' && url.pathname === '/api/metrics') {
      const selected = logs.filter(log => !url.searchParams.get('service') || log.service === url.searchParams.get('service'));
      const total = selected.length;
      const errors = selected.filter(log => log.status === 'ERROR').length;
      const average = total ? Math.round(selected.reduce((sum, log) => sum + log.durationMs, 0) / total) : 0;
      return json(res, 200, { totalCalls: total, errorRate: total ? Number((errors / total * 100).toFixed(1)) : 0, averageResponseTime: average, services: [...services.keys()].map(service => {
        const serviceLogs = selected.filter(log => log.service === service);
        return { service, totalCalls: serviceLogs.length, errorRate: serviceLogs.length ? Number((serviceLogs.filter(log => log.status === 'ERROR').length / serviceLogs.length * 100).toFixed(1)) : 0, averageResponseTime: serviceLogs.length ? Math.round(serviceLogs.reduce((sum, log) => sum + log.durationMs, 0) / serviceLogs.length) : 0 };
      }) });
    }
    if (req.method === 'GET' && url.pathname === '/api/logs') {
      const service = url.searchParams.get('service');
      const status = url.searchParams.get('status');
      const from = url.searchParams.get('from');
      const to = url.searchParams.get('to');
      const filtered = logs.filter(log => (!service || log.service === service) && (!status || log.status === status) && (!from || log.timestamp >= from) && (!to || log.timestamp <= to));
      const page = Math.max(1, Number(url.searchParams.get('page') || 1));
      const limit = parseLimit(url.searchParams.get('limit'));
      const start = (page - 1) * limit;
      return json(res, 200, { data: filtered.slice(start, start + limit), page, limit, total: filtered.length, totalPages: Math.max(1, Math.ceil(filtered.length / limit)) });
    }
    if (req.method === 'POST' && url.pathname === '/api/metrics/simulate-load') {
      const body = await readBody(req);
      const count = Math.min(100, Math.max(1, Number(body.count || 50)));
      await Promise.all(Array.from({ length: count }, (_, index) => execute([...services.keys()][index % services.size], 'simulate')));
      return json(res, 202, { message: `Generated ${count} calls`, count });
    }
    const operationMatch = url.pathname.match(/^\/api\/(inventory|orders|payments)\/(.+)$/);
    if (req.method === 'POST' && operationMatch) {
      const body = await readBody(req);
      return json(res, 200, await execute(operationMatch[1], operationMatch[2], body));
    }
    return json(res, 404, { error: 'Route not found' });
  } catch (error) {
    return json(res, 400, { error: error.message });
  }
}

export { handler, logs, recordLog, execute };
