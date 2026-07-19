// Public entry point for the Discovery domain (EPIC-004.1).
//
// Discovery is deliberately separate from Search: Search answers "find
// exactly this", Discovery answers "surface things you did not know were
// important". This module exposes ONLY pure functions and types — no
// React, no hooks, no HTTP, no I/O.
//
// Extensibility (reserved, not implemented):
//   - `InsightType = "CUSTOM"` for future analyzers (heuristic / semantic
//     / AI / user feedback).
//   - `DiscoveryInsightMetadata.origin` distinguishes analyzer families.
//   - `DiscoveryInsightMetadata.experimental` gates non-canonical output.
//   - `DiscoveryInsightMetadata.userSignals` reserved for personalization.
//   - View-layer adapters live in `./selectors` so the eventual UI
//     integration is a wiring task, not a domain redesign.

export * from "./types";
export * from "./ontology";
export * from "./metrics";
export * from "./analyzer";
export * from "./ranking";
export * from "./selectors";