# Microservices Monitoring Backend

An audit and logging proxy for Inventory, Orders, and Payments microservices. It exposes a generic execution flow, structured logs, metrics, filters, pagination, and load simulation.

## Requirements

- Node.js 20+

## Run locally

```bash
npm install
copy .env.example .env
npm start
```

The API is available at `http://localhost:3000`.

## API

- `GET /health`
- `GET /api/services`
- `POST /api/{inventory|orders|payments}/{operation}`
- `GET /api/logs?service=&status=&from=&to=&page=1&limit=20`
- `GET /api/metrics`
- `POST /api/metrics/simulate-load` with `{ "count": 50 }`

Every execution creates an audit record containing request UUID, timestamp, service, operation, duration, and `SUCCESS`/`ERROR` status.

## Deployment

The included `Dockerfile` and `railway.json` are ready for Railway. The `api/index.js` adapter and `vercel.json` also support Vercel serverless deployment. Configure upstream URLs as environment variables when real microservices are available. Logs are intentionally in-memory for this workshop; use a persistent store for production scale.

## Test

```bash
npm test
```
