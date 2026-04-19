# Contract Testing

This project uses **Pact consumer-driven contracts** to ensure the API response shapes match what the frontend consumer expects.

## Architecture

The tests run in three phases against a live Nitro server:

```
Phase 1: Consumer Interactions     → generates pacts/frontend-todo-api.json
Phase 2: Provider Verification     → validates real server against pact file
Phase 3: Integration Tests         → covers state-dependent endpoints
```

All 15 tests live in a single file: `server/__tests__/contracts/pact.spec.ts`. They run sequentially (not concurrently) via a separate Vitest config to avoid module caching issues with the shared Nitro server.

## File Structure

```
server/
  __tests__/
    contracts/
      pact.spec.ts          # All contract tests (15 tests, 3 phases)
      helper.ts             # Server lifecycle: startServer(), stopServer(), api()
vitest.contracts.config.ts  # Sequential test runner for contract tests
pacts/
  frontend-todo-api.json    # Generated pact file (consumer interactions)
```

## How to Run

```bash
# Build first, then run contract tests
npm run test:contracts

# Or build and test in one command
npm run build && npm run test:contracts
```

The `test:contracts` script checks that `.output/server` exists before running, so it fails fast if the Nitro build hasn't been done.

## Test Phases

### Phase 1: Consumer Interactions (9 tests)

Uses `PactV4` to define what the frontend expects from each endpoint. A mock server is started, each interaction sends a request to the real Nitro backend, and the mock server records the interactions into a pact file (`pacts/frontend-todo-api.json`).

| Test | Method | Endpoint | Expected |
|------|--------|----------|----------|
| Health check | GET | `/api/health` | `{ status: "ok" }` |
| List todos | GET | `/api/todos` | Array of todos |
| Create todo | POST | `/api/todos` | Todo object with id, title, completed, createdAt, updatedAt |
| Empty title | POST | `/api/todos` | 400 with `{ message: "Title is required" }` |
| Get by id | GET | `/api/todos/:id` | Todo object |
| Unknown id | GET | `/api/todos/nonexistent` | 404 with `{ message: "Todo not found" }` |
| Update todo | PATCH | `/api/todos/:id` | Updated todo object |
| Update unknown | PATCH | `/api/todos/nonexistent` | 404 with `{ message: "Todo not found" }` |
| Delete todo | DELETE | `/api/todos/:id` | `{ id }` |

### Phase 2: Provider Verification (1 test)

Filters the pact file to **stateless interactions only** (those that don't require specific DB state) and runs the Pact `Verifier` against the real Nitro server. This catches regressions when handlers change without the contract in mind.

Stateless interactions: health check, list todos, create todo, empty title, nonexistent todo (GET), nonexistent todo (PATCH).

State-dependent interactions (get by id, update, delete) are excluded here because they require specific DB state and are tested in Phase 3 instead.

### Phase 3: Integration Tests (5 tests)

Tests state-dependent endpoints that require actual DB interactions — creating a todo first, then reading, updating, or deleting it.

## Pact Matchers Used

- `MatchersV3.like({...})` — validates object shape
- `MatchersV3.eachLike(...)` — validates array elements
- `MatchersV3.regex(pattern)` — validates string against regex (e.g., UUID, ISO datetime)

## Fixing Failures

### Test file doesn't exist or can't be found

Make sure `pact.spec.ts` exists in `server/__tests__/contracts/`. The vitest config (`vitest.contracts.config.ts`) only includes `*.spec.ts` files.

### Nitro build not found

```
test -d .output/server ... Build first: npm run build
```

Run `npm run build` before running contract tests, or use `npm run test` which builds automatically.

### Port 3001 already in use

```
Error: listen EADDRINUSE: address already in use :::3001
```

Another process is using port 3001. Kill it or change `PORT` in `server/__tests__/helper.ts`.

### Provider verification fails with "Content-Type" mismatch

The provider verifier matches against pact file body definitions. If the response format changed, update the matchers in `pact.spec.ts` to match the new format, then re-run Phase 1 to regenerate the pact file.

### Provider verification fails with "State not found"

The provider verifier only supports **stateless interactions** by default. If a stateful interaction (e.g., "a todo exists") fails, it should be moved to Phase 3 integration tests instead.

### Pact file not generated

Phase 1 tests must pass first. The pact file (`pacts/frontend-todo-api.json`) is only written when consumer interaction tests complete successfully. Run Phase 1 tests individually to debug:

```bash
npx vitest run --config vitest.contracts.config.ts -t "consumer interactions"
```

### Flaky tests

The consolidated approach in `pact.spec.ts` (all tests in one file, sharing one server instance) eliminates the flakiness that occurred with separate test files. If tests are still flaky:

1. Run `npm run test:contracts` multiple times to check consistency
2. Check that no other processes are using port 3001
3. Ensure `.output/server` was built from the same code you're testing

### Pact file out of sync with API

When the API changes, update the expectations in Phase 1 to match the new response shapes, re-run the tests to regenerate the pact file, then update Phase 2's stateless filter if needed.
