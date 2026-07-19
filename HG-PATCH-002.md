# HG-PATCH-002 — Query Policy and Explorer Correctness

Status: Applied to project copy
Version: 1.0.0

## Scope

- Central TanStack Query defaults and retry policy.
- Health polling only on the System route.
- Stable normalized query keys and request parameters.
- Explorer URL constraints, whitespace normalization and offset recovery.
- Session-level accumulation of discovered Explorer facets.
- Local Knowledge Object ID validation before network access.

## Behavioral decisions

- Overview reads health without continuous polling.
- System polls health every 30 seconds.
- Object list queries normalize offset, limit, q and filters before both cache-key creation and HTTP serialization.
- Explorer facets are explicitly session-discovered, not described as canonical until the API exposes a facet endpoint.
- Invalid object IDs render a local validation state and never call the API.

## Deferred

Canonical facets and server-side graph filtering remain backend-contract work and are not fabricated in the frontend.
