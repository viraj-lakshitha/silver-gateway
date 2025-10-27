# Silver Gateway

Silver Gateway is a Node.js (TypeScript) API gateway and rate limiter designed to sit in front of upstream services. The first milestone focuses on bootstrapping a lightweight Express stack, wiring configuration, and providing room to layer authentication, throttling, and plugin mechanics incrementally.

## Project Layout

```
src/
  config/      # environment + logging helpers
  http/        # Express app factory and middlewares
  routes/      # HTTP route definitions
  server.ts    # process bootstrap and graceful shutdown
docker-compose.yml
Dockerfile
```

## Prerequisites

- Node.js 20.x
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

The compose stack builds the Node.js service, then starts MongoDB and Redis alongside it for future persistence and rate-limiting features. The gateway is exposed on `http://localhost:3000/health`.

## Next Steps

- Implement core proxying with `http-proxy` and route configuration storage.
- Add auth (API keys, JWT), Redis-backed rate limiting, and request logging.
- Extend the test suite with Jest and supertest once HTTP features land.
