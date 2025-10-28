# PLAN.md — Node.js API Gateway / Rate Limiter
A production-grade API gateway and rate limiter built with **Node.js**, **Express**, **TypeScript**, **MongoDB**, and **Redis**. The system exposes a single entry point for clients, forwards traffic to downstream services, enforces authentication and quotas, and records usage for analytics.

---

## 1) Project Overview

### Goals
- Accept HTTP(S) requests, validate API keys or JWTs, and proxy to registered upstream services.
- Enforce burst + sustained rate limits per principal using Redis.
- Offer an Admin API for managing routes, credentials, quotas, and plugins.
- Record request/response metadata in MongoDB for auditing and analytics.
- Provide a plugin hook system for request/response enrichment.

### Guiding Principles
- Keep the runtime slim: Express + focused libraries, no heavy frameworks.
- Prefer explicit, testable modules over hidden magic.
- Ship with Docker Compose so contributors can boot the full stack quickly.
- Document operational knobs, logging, and failure-handling strategies.

---

## 2) Architecture

### High-Level Data Flow
```
Client
  └─> Gateway (Express / Node.js)
        ├─ Env & Config loader
        ├─ Logger (pino)
        ├─ Auth providers (API key, JWT)
        ├─ Rate Limiter (Redis token bucket)
        ├─ Proxy Engine (http-proxy)
        ├─ Plugin Runner (pre/post/error hooks)
        └─ Usage Logger (MongoDB)
Upstream Services
MongoDB (state, logs, analytics snapshots)
Redis (counters, caches, locks)
```

### Request Lifecycle (target)
1. Parse request, assign correlation ID, and normalize headers.
2. Resolve principal via API key or JWT strategies.
3. Check Redis-backed rate limits, short-circuit on 429 with metadata headers.
4. Run pre-request plugins (header mutation, validation, etc.).
5. Forward request using `http-proxy` with timeout/retry policies.
6. Run post-request plugins (response shaping, metrics).
7. Persist usage info asynchronously to MongoDB and return response.

---

## 3) Tech Choices

- **Node.js 20 + TypeScript**: modern JS runtime with type safety.
- **Express 5**: mature HTTP server with flexible middleware.
- **http-proxy**: stable reverse-proxy implementation supporting streaming.
- **Redis 7**: atomic token bucket + lightweight caching.
- **MongoDB 7**: schema-flexible storage for API keys, routes, usage logs.
- **pino**: structured logging with minimal overhead.
- **Jest + supertest** (later): testing harness for unit/integration coverage.
- **Docker Compose**: local orchestration of gateway + dependencies.

---

## 4) Project Layout (current + planned)

```
src/
  config/        # env parsing, logging, constants
  http/          # Express app factory, middleware registration
  proxy/         # proxy controller, upstream registry (planned)
  auth/          # API key + JWT strategies (planned)
  ratelimit/     # Redis token bucket client (planned)
  plugins/       # hook execution + SDK (planned)
  routes/        # express routers (health, admin, gateway)
  telemetry/     # logging, metrics exporters (planned)
  server.ts      # bootstrap + graceful shutdown

test/
  unit/          # jest unit tests (planned)
  e2e/           # docker-backed integration suites (planned)

docker-compose.yml
Dockerfile
.env.example
README.md
AGENTS.md
PLAN.md
```

---

## 5) Execution Roadmap (Six Iterations)

### Iteration 1 — Bootstrap (completed)
- Set up TypeScript Express app, logging, health endpoint.
- Provide Dockerfile + Compose stack (Gateway + MongoDB + Redis).
- Document local workflows (README, AGENTS, PLAN).
- Status: merged into `develop` as the baseline scaffold.

### Iteration 2 — Route Registry & Proxy Skeleton
- Implement persistent route definitions (MongoDB schema).
- Load route configs into memory with cache invalidation.
- Build proxy middleware that resolves upstream from the registry and forwards requests.
- Provide admin endpoints for CRUD on routes.
- Branch to use: `feat/proxy` (in progress).

### Iteration 3 — Authentication & Identity (in progress)
- Store API keys securely (hashed) and expose lifecycle endpoints (issue, rotate, revoke).
- Add JWT verification (RS256 + HS256) with JWK fetch + caching.
- Resolve principal context and attach to request object for downstream logic.
- Branch to use: `feat/auth`.

### Iteration 4 — Rate Limiting (in progress)
- Implement Redis-backed token bucket (Lua script).
- Support per-key defaults + route overrides.
- Emit standard rate-limit headers (`x-ratelimit-limit`, `x-ratelimit-remaining`, `retry-after`).
- Add Jest coverage for edge cases (concurrency, refill timing).
- Branch to use: `feat/rate-limiter`.

### Iteration 5 — Usage Logging & Analytics
- Capture structured request/response logs (status, latency, bytes, principal).
- Batch writes to MongoDB to avoid blocking.
- Expose admin analytics endpoints (filter by key, route, status, date range).
- Seed dashboards/aggregations for quick insights.
- Branch to use: `feat/analytics`.

### Iteration 6 — Plugin Framework (in progress)
- Define plugin manifest schema and execution sandbox.
- Support pre, post, and error hooks with shared context.
- Provide example plugins (header injector, response redactor).
- Add guardrails for timeouts and error isolation.
- Branch to use: `feat/plugins`.

---

## 6) Configuration & Deployment

- **Environment Management**: `dotenv` for local dev; document variables in `.env.example`.
- **Runtime Flags**:
  - `PORT` (default 3000)
  - `MONGO_URI` (defaults to Compose service)
  - `REDIS_URL` (defaults to Compose service)
  - `LOG_LEVEL`, `JWT_JWKS_URL`, etc. (planned additions)
- **Secrets**: never commit `.env`; rotate keys regularly.
- **Docker Strategy**: multi-stage build producing a lean production image; Compose orchestrates dependencies locally.
- **Observability**: integrate pino logs with request IDs; plan for metrics export (Prometheus / OpenTelemetry).

---

## 7) Rate Limiter Design (Redis)

- **Algorithm**: Token bucket with refill interval + burst capacity.
- **Key Schema**: `rl:{principal}:{routeId}` + global fallback key.
- **Implementation**: Lua script that refills, consumes, and returns remaining tokens + reset TTL.
- **Headers**: send limit/remaining/reset and optional `retry-after` on 429.
- **Overrides**: allow per-route or per-principal policies stored in MongoDB.

---

## 8) Data Storage & Models (MongoDB)

- **User**: `_id`, `email`, `role`, `status`.
- **ApiKey**: `_id`, `displayId`, `keyHash`, `ownerId`, `scopes`, `rateLimit`, `status`, timestamps.
- **Route**: `_id`, `pattern`, `methods`, `upstream` (`baseUrl`, headers, timeout), `authMode`, `plugins`.
- **UsageLog**: `_id`, `ts`, `principal`, `routeId`, `status`, `latencyMs`, `bytesIn`, `bytesOut`, `error`.
- **PluginManifest**: `name`, `version`, `entry`, `hooks`, `configSchema`.
- **AnalyticsSnapshot**: aggregated stats for dashboards (daily/hourly).

---

## 9) Testing Strategy

- **Unit**: Isolate config loaders, rate-limiter math, auth helpers, plugin runner.
- **Integration**: Use supertest to hit Express routes against in-memory or test containers.
- **E2E**: Compose-based suites verifying proxy + upstream behavior with MongoDB/Redis.
- **Load Testing**: k6/autocannon scripts to validate rate limiter under pressure.
- **CI**: GitHub Actions (planned) running lint, test, and Docker build.

---

## 10) Documentation & DX

- Keep README focused on quick start + workflows.
- Maintain AGENTS.md as the contributor playbook.
- Produce OpenAPI specs for Admin API once endpoints stabilize.
- Supply Postman / curl examples for common flows.
- Add issue templates, labels (`good first issue`, `help wanted`) as the project opens up.

---

## 11) Future Enhancements

- Hot-reloadable plugin system with sandboxing (VM isolation or worker threads).
- Quota-based billing (daily/monthly request caps).
- Adaptive rate limiting based on upstream feedback (dynamic throttling).
- mTLS between gateway and upstreams.
- Distributed tracing via OpenTelemetry and OTLP exporters.
- Admin UI (React/Next.js) backed by the Admin API.
- Multi-region deployment strategy with Redis + Mongo replication.
