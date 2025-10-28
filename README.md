# Silver Gateway

Silver Gateway is a Node.js (TypeScript) API gateway and rate limiter designed to sit in front of upstream services. The first milestone focuses on bootstrapping a lightweight Express stack, wiring configuration, and providing room to layer authentication, throttling, and plugin mechanics incrementally.

## Project Layout

```
src/
  config/      # environment + logging helpers (import via @config/*)
  database/    # MongoDB connection helpers (@database/*)
  http/        # Express app factory and middlewares (@http/*)
  proxy/       # route registry + proxy engine (@proxy/*)
  routes/      # HTTP route definitions (health, admin, gateway)
  server.ts    # process bootstrap and graceful shutdown
docker-compose.yml
Dockerfile
```

## Prerequisites

- Node.js 20.x (`nvm use` reads the provided `.nvmrc`)
- npm 10.x
- Docker (for local infrastructure)

Copy `.env.example` to `.env` or export the variables manually before running the app.

## Local Development

```bash
npm install
npm run dev          # start the gateway with tsx watch
npm run lint         # run ESLint across the src tree
npm run format       # format TypeScript sources with Prettier
npm run build        # type-check and emit JavaScript to dist/
npm run start        # run the compiled server from dist/
```

## Docker Workflow

```bash
docker compose up --build
```

The compose stack builds the Node.js service, then starts MongoDB and Redis alongside it for persistence and rate-limiting features. The gateway is exposed on `http://localhost:3000/health`.

## Admin API (Route Management)

Create, list, update, and delete proxy routes under `/admin/routes`. Routes are stored in MongoDB and cached in-memory for fast lookups.

```bash
curl -X POST http://localhost:3000/admin/routes \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Echo",
    "pattern": "/echo/:id",
    "methods": ["GET", "POST"],
    "authMode": "none",
    "upstream": {
      "target": "http://127.0.0.1:4100",
      "timeoutMs": 10000
    }
  }'
```

On success the gateway immediately serves traffic for matching requests, forwarding them to the configured upstream. Update or remove routes with `PATCH /admin/routes/:id` and `DELETE /admin/routes/:id`.

## Proxy Behaviour

- Requests are matched by HTTP method and `path-to-regexp` pattern priority (higher priority wins).
- Responses bubble straight from upstream services; errors produce `502` with a JSON body.
- Routes marked `enabled: false` are ignored until re-enabled.

## Next Steps

- Harden the proxy path (timeouts, retries, structured telemetry).
- Layer on authentication (API keys, JWT) and Redis-backed rate limiting.
- Expand automated tests with Jest + supertest covering admin and proxy flows.

## License

Distributed under the MIT License. See `LICENSE` for details.
