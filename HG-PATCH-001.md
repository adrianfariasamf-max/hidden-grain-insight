# HG-PATCH-001 — Contract Alignment and Hardened API Client

Status: Applied to project copy
Version: 1.0.0

## Implemented

- Runtime validation with Zod for `/health`, `/objects`, `/objects/:id` and `/graph`.
- Structured API errors preserving code, request ID, timestamp and details.
- Controlled request timeout through `VITE_HG_REQUEST_TIMEOUT_MS`.
- Dedicated network, timeout, contract and not-found error classes.
- ETag cache with `If-None-Match` and `304 Not Modified` handling.
- Repeated query parameters supported by the URL serializer.
- Request ID displayed in the visual error state when available.
- `typecheck` and aggregate `check` scripts added.
- `.env.example` updated.

## Contract decision

This patch deliberately preserves the contract currently consumed by the real Lovable UI:

- `/objects`: `{ total, offset, limit, items }`
- `/objects/:id`: `{ object, node?, relationships }`
- `/graph`: flat graph metrics plus nodes and edges
- `/health`: service and repository counters

The frontend will now fail explicitly with `ApiContractError` if the deployed backend returns a different shape. This prevents silent runtime corruption and makes the final API alignment observable.

## Files added

- `src/lib/api/schemas.ts`
- `HG-PATCH-001.md`

## Files modified

- `src/lib/api/client.ts`
- `src/lib/api/errors.ts`
- `src/components/state/ErrorState.tsx`
- `.env.example`
- `package.json`

## Verification commands

```bash
npm install
npm run typecheck
npm run lint
npm run build
```

The real production API remains required for end-to-end contract verification.
