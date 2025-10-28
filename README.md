# Silver Gateway

Silver Gateway is a Node.js (TypeScript) API gateway and rate limiter designed to sit in front of upstream services. The first milestone focuses on bootstrapping a lightweight Express stack, wiring configuration, and providing room to layer authentication, throttling, and plugin mechanics incrementally.

## Project Layout

```
src/
  config/      # environment + logging helpers (import via @config/*)
  auth/        # API key & JWT logic (@auth/*)
  database/    # MongoDB connection helpers (@database/*)
  ratelimit/   # Redis token bucket logic (@ratelimit/*)
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

### Key Environment Variables

- `API_KEY_PREFIX`, `API_KEY_SECRET_BYTES` — control issued API key formatting.
- `JWT_SECRET` (for HS256/HS512) or `JWT_JWKS_URI` (for RS256) — pick one verification strategy.
- `JWT_ISSUER`, `JWT_AUDIENCE`, `JWT_ALGORITHMS` — optional claim checks for JWT validation.

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
    "rateLimit": {
      "limit": 200,
      "windowSec": 60
    }
  }'
```

On success the gateway immediately serves traffic for matching requests, forwarding them to the configured upstream. Update or remove routes with `PATCH /admin/routes/:id` and `DELETE /admin/routes/:id`.

- Include `rateLimit` overrides per route to customise the bucket size and window seconds.
- Send `{"rateLimit": null}` in a `PATCH` request to remove an override and fall back to defaults.

## Rate Limiting

- Backed by Redis using a token-bucket script (`src/ratelimit/rate-limiter.ts`).
- Default policy comes from `RATE_LIMIT_DEFAULT_LIMIT` (requests) and `RATE_LIMIT_DEFAULT_WINDOW_SEC` (seconds).
- Identifiers are derived from `x-api-key` if present, otherwise the request IP (including `x-forwarded-for`).
- Responses include `x-ratelimit-limit`, `x-ratelimit-remaining`, and `x-ratelimit-reset` headers, plus `retry-after` on `429`.

## Usage Logging & Analytics

- Requests emit structured usage entries buffered via `src/analytics/usage-log.service.ts` and persisted in `usage_logs`.
- Configure batching with `USAGE_LOG_BATCH_SIZE` and `USAGE_LOG_FLUSH_INTERVAL_MS` (ms).
- Query aggregates via `GET /admin/usage?from=...&to=...&routeId=...&apiKeyDisplayId=...`, or retrieve recent logs with `GET /admin/usage/logs?limit=200`.
- Logged fields include request/response sizes, latency, status, principal metadata, and optional API key identifiers.

## Admin API (API Keys)

Issue, rotate, and revoke API keys with the new `/admin/api-keys` endpoints. Keys are returned once in clear-text (format `sgk_<display>.<secret>`) and stored hashed via Argon2. Example:

```bash
curl -X POST http://localhost:3000/admin/api-keys \
  -H "Content-Type: application/json" \
  -d '{
    "name": "demo key",
    "description": "Used for local testing",
    "scopes": ["routes:read"]
  }'
```

Rotate with `POST /admin/api-keys/:id/rotate`, revoke via `POST /admin/api-keys/:id/revoke`, and update metadata with `PATCH /admin/api-keys/:id`.

## Authentication Layer

- Routes tagged `authMode: 'apiKey' | 'jwt' | 'both'` now enforce authentication before proxying.
- API keys are read from the `x-api-key` header; successful calls add `x-api-key-id`, `x-principal-scopes`, and `x-principal-subject` headers upstream.
- JWTs are verified with `jose`, supporting HS secrets (`JWT_SECRET`) or remote JWKS (`JWT_JWKS_URI`) and optional issuer/audience enforcement.
- Principal context is attached to `req.principal` for use in future middleware.

## Proxy Behaviour

- Requests are matched by HTTP method and `path-to-regexp` pattern priority (higher priority wins).
- Responses bubble straight from upstream services; errors produce `502` with a JSON body.
- Routes marked `enabled: false` are ignored until re-enabled.

## Next Steps

- Harden the proxy path (timeouts, retries, structured telemetry).
- Layer on authentication (API keys, JWT) to complement rate limiting.
- Expand automated tests with Jest + supertest covering admin, proxy, and limiter flows.
- Layer on Redis-backed rate limiting.
- Expand automated tests with Jest + supertest covering admin and proxy flows.

## License

Distributed under the MIT License. See `LICENSE` for details.
