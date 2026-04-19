# Docker Build Issue: Multi-Stage COPY Failure

## Problem

The Docker multi-stage build failed to copy the `.output` directory from the build stage to the production stage. The container would start but fail with:

```
Error: Cannot find module '/app/.output/server/index.mjs'
```

## Root Cause

The stale local `.output` directory was being copied into the build context and overwriting the Nitro build output. Even though `.output` was listed in `.gitignore`, it was still on disk and being picked up by Docker build.

## Fix

1. **Create `.dockerignore`** to exclude stale artifacts from the build context:

```
node_modules
.output
.nitro
data
coverage
plans
.claude
```

2. **Delete the stale `.output` directory** before building:

```bash
rm -rf .output
```

3. **Use a single-stage build** instead of multi-stage to avoid `COPY --from=build` issues with Alpine images and native module compilation:

```dockerfile
FROM node:22-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends python3 g++ make
RUN rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3001

ENV PORT=3001

CMD ["node", ".output/server/index.mjs"]
```

## Lesson

- Always create a `.dockerignore` file to prevent stale artifacts from polluting the build context
- Multi-stage Docker builds can be tricky with native modules (`better-sqlite3`) that need compilation
- A single-stage build is simpler and more reliable for small projects
