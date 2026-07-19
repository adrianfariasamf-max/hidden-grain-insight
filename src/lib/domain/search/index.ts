// Public entry point for the search domain.
//
// Purpose: single canonical representation of any search performed in
// Hidden Grain (Explorer, Graph, Object Detail, future semantic / AI /
// agent surfaces). This layer is pure — no React, no I/O, no HTTP.
//
// Extensibility: add new dimensions to `SearchQuery` in `./types` and
// extend `normalizeSearchQuery` in `./normalize`. Serialization,
// equality, state helpers, URL and cache adapters pick the new
// dimension up automatically because they all funnel through the
// normalized form.

export * from "./types";
export * from "./normalize";
export * from "./serialize";
export * from "./state";
export * from "./url";
export * from "./cache";
export * from "./validation";
