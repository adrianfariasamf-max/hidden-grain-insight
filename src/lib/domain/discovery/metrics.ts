// Discovery Metrics — pure, O(n + e) primitives (EPIC-004.1).
//
// Every function is:
//   - pure (no I/O, no time, no randomness),
//   - single-pass whenever possible,
//   - safe for empty input.
//
// Higher-level detectors (see `./analyzer`) build a single `GraphIndex`
// once and reuse it across every insight type — never call these one at
// a time inside a hot loop.

import type { KnowledgeObjectId } from "@/lib/api/types";
import { getRelationshipTypeDescriptor, type RelationshipCategory } from "../relationship-ontology";
import type { Relationship } from "../relationship";

export interface DegreeCounts {
  incoming: number;
  outgoing: number;
  total: number;
}

export const EMPTY_DEGREES: DegreeCounts = Object.freeze({ incoming: 0, outgoing: 0, total: 0 });

/** Union-Find (Weighted Quick-Union with Path Compression). Used by
 *  `computeConnectedComponents` — kept private to the metrics module. */
class DSU {
  private parent = new Map<string, string>();
  private size = new Map<string, number>();
  add(id: string) {
    if (!this.parent.has(id)) {
      this.parent.set(id, id);
      this.size.set(id, 1);
    }
  }
  find(id: string): string {
    let root = id;
    while (this.parent.get(root) !== root) root = this.parent.get(root)!;
    // Path compression.
    let cur = id;
    while (this.parent.get(cur) !== root) {
      const next = this.parent.get(cur)!;
      this.parent.set(cur, root);
      cur = next;
    }
    return root;
  }
  union(a: string, b: string) {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    const sa = this.size.get(ra)!;
    const sb = this.size.get(rb)!;
    if (sa < sb) {
      this.parent.set(ra, rb);
      this.size.set(rb, sa + sb);
    } else {
      this.parent.set(rb, ra);
      this.size.set(ra, sa + sb);
    }
  }
  roots(): string[] {
    const out: string[] = [];
    for (const [id, p] of this.parent) if (id === p) out.push(id);
    return out;
  }
  componentSize(id: string): number {
    return this.size.get(this.find(id)) ?? 0;
  }
}

// ---------------------------------------------------------------------------
// Per-node primitives
// ---------------------------------------------------------------------------

/** Compute (in, out, total) degree for every id that appears in the
 *  relationship set. O(e). */
export function computeDegrees(
  relationships: readonly Relationship[],
): Map<KnowledgeObjectId, DegreeCounts> {
  const out = new Map<KnowledgeObjectId, DegreeCounts>();
  const bump = (id: KnowledgeObjectId, key: "incoming" | "outgoing") => {
    const cur = out.get(id) ?? { incoming: 0, outgoing: 0, total: 0 };
    cur[key] += 1;
    cur.total += 1;
    out.set(id, cur);
  };
  for (const r of relationships) {
    bump(r.sourceId, "outgoing");
    bump(r.targetId, "incoming");
  }
  return out;
}

export function incomingCount(
  degrees: ReadonlyMap<KnowledgeObjectId, DegreeCounts>,
  id: KnowledgeObjectId,
): number {
  return degrees.get(id)?.incoming ?? 0;
}

export function outgoingCount(
  degrees: ReadonlyMap<KnowledgeObjectId, DegreeCounts>,
  id: KnowledgeObjectId,
): number {
  return degrees.get(id)?.outgoing ?? 0;
}

export function totalDegree(
  degrees: ReadonlyMap<KnowledgeObjectId, DegreeCounts>,
  id: KnowledgeObjectId,
): number {
  return degrees.get(id)?.total ?? 0;
}

// ---------------------------------------------------------------------------
// Resolution ratios
// ---------------------------------------------------------------------------

export interface ResolutionCounts {
  resolved: number;
  unresolved: number;
  total: number;
  /** unresolved / total, or 0 when total === 0. */
  unresolvedRatio: number;
  /** resolved / total, or 0 when total === 0. */
  resolvedRatio: number;
}

export function resolutionOfSet(rels: readonly Relationship[]): ResolutionCounts {
  let resolved = 0;
  let unresolved = 0;
  for (const r of rels) {
    if (r.status === "resolved") resolved += 1;
    else if (r.status === "unresolved") unresolved += 1;
  }
  const total = resolved + unresolved;
  return {
    resolved,
    unresolved,
    total,
    unresolvedRatio: total === 0 ? 0 : unresolved / total,
    resolvedRatio: total === 0 ? 0 : resolved / total,
  };
}

/** Per-node resolution ratios, keyed by any endpoint the node participates in. */
export function computeResolutionByNode(
  relationships: readonly Relationship[],
): Map<KnowledgeObjectId, ResolutionCounts> {
  const buckets = new Map<KnowledgeObjectId, Relationship[]>();
  const push = (id: KnowledgeObjectId, r: Relationship) => {
    const cur = buckets.get(id) ?? [];
    cur.push(r);
    buckets.set(id, cur);
  };
  for (const r of relationships) {
    push(r.sourceId, r);
    push(r.targetId, r);
  }
  const out = new Map<KnowledgeObjectId, ResolutionCounts>();
  for (const [id, list] of buckets) out.set(id, resolutionOfSet(list));
  return out;
}

// ---------------------------------------------------------------------------
// Distributions
// ---------------------------------------------------------------------------

export function relationshipTypeDistribution(
  relationships: readonly Relationship[],
): Map<string, number> {
  const out = new Map<string, number>();
  for (const r of relationships) {
    const t = getRelationshipTypeDescriptor(r.type).id;
    out.set(t, (out.get(t) ?? 0) + 1);
  }
  return out;
}

export function relationshipCategoryDistribution(
  relationships: readonly Relationship[],
): Map<RelationshipCategory, number> {
  const out = new Map<RelationshipCategory, number>();
  for (const r of relationships) {
    const c = getRelationshipTypeDescriptor(r.type).category;
    out.set(c, (out.get(c) ?? 0) + 1);
  }
  return out;
}

/** Share of relationships whose type is not in the official catalog.
 *  Returns 0 when the set is empty. */
export function customRelationshipRatio(relationships: readonly Relationship[]): number {
  if (relationships.length === 0) return 0;
  let custom = 0;
  for (const r of relationships) if (getRelationshipTypeDescriptor(r.type).isCustom) custom += 1;
  return custom / relationships.length;
}

/** Per-node relationships grouped by endpoint. O(e). */
export function computeRelationshipsByNode(
  relationships: readonly Relationship[],
): Map<KnowledgeObjectId, Relationship[]> {
  const out = new Map<KnowledgeObjectId, Relationship[]>();
  const push = (id: KnowledgeObjectId, r: Relationship) => {
    const cur = out.get(id) ?? [];
    cur.push(r);
    out.set(id, cur);
  };
  for (const r of relationships) {
    push(r.sourceId, r);
    push(r.targetId, r);
  }
  return out;
}

/** Per-node set of unique relationship categories present on its edges. */
export function computeCategoriesByNode(
  byNode: ReadonlyMap<KnowledgeObjectId, readonly Relationship[]>,
): Map<KnowledgeObjectId, Set<RelationshipCategory>> {
  const out = new Map<KnowledgeObjectId, Set<RelationshipCategory>>();
  for (const [id, rels] of byNode) {
    const set = new Set<RelationshipCategory>();
    for (const r of rels) set.add(getRelationshipTypeDescriptor(r.type).category);
    out.set(id, set);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Connected components
// ---------------------------------------------------------------------------

export interface ComponentIndex {
  /** Root id for every input node. */
  componentOf: Map<KnowledgeObjectId, string>;
  /** Size of each component, keyed by root id. */
  sizes: Map<string, number>;
  /** Deterministic component ordering (largest first, then by root id). */
  ordered: readonly { root: string; size: number }[];
}

export function computeConnectedComponents(
  nodeIds: readonly KnowledgeObjectId[],
  relationships: readonly Relationship[],
): ComponentIndex {
  const dsu = new DSU();
  for (const id of nodeIds) dsu.add(id);
  for (const r of relationships) {
    dsu.add(r.sourceId);
    dsu.add(r.targetId);
    dsu.union(r.sourceId, r.targetId);
  }
  const componentOf = new Map<KnowledgeObjectId, string>();
  const sizes = new Map<string, number>();
  const seen = new Set<KnowledgeObjectId>();
  for (const id of nodeIds) {
    seen.add(id);
    const root = dsu.find(id);
    componentOf.set(id, root);
  }
  for (const r of relationships) {
    for (const id of [r.sourceId, r.targetId]) {
      if (seen.has(id)) continue;
      seen.add(id);
      componentOf.set(id, dsu.find(id));
    }
  }
  for (const root of dsu.roots()) sizes.set(root, dsu.componentSize(root));
  const ordered = [...sizes.entries()]
    .map(([root, size]) => ({ root, size }))
    .sort((a, b) => (b.size !== a.size ? b.size - a.size : a.root.localeCompare(b.root)));
  return { componentOf, sizes, ordered };
}

// ---------------------------------------------------------------------------
// Threshold helpers (pure, deterministic)
// ---------------------------------------------------------------------------

/** Population mean of a numeric array. Returns 0 for empty input. */
export function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  let s = 0;
  for (const v of values) s += v;
  return s / values.length;
}

/** Population standard deviation. Returns 0 for length < 2. */
export function stddev(values: readonly number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  let s = 0;
  for (const v of values) s += (v - m) * (v - m);
  return Math.sqrt(s / values.length);
}
