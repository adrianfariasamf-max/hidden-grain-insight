// Deterministic Discovery Analyzer (EPIC-004.1).
//
// Input: the read-only Knowledge Graph (nodes + relationships).
// Output: an ordered list of `DiscoveryInsight` — same input → identical
// output, always. No randomness, no time, no probabilistic model, no AI.
//
// Algorithm:
//   1. Build ONE `GraphIndex` (degrees, per-node rels, per-node resolution,
//      per-node category set, connected components). O(n + e).
//   2. Run each detector against the index. O(n + e) each; detectors do
//      not re-scan the full relationship set.
//   3. Rank the aggregated result (see `./ranking`).
//
// Every insight built here satisfies the explainability contract:
// non-empty `why` + at least one `evidence` entry.

import type { GraphNode, KnowledgeObjectId } from "@/lib/api/types";
import { getRelationshipTypeDescriptor } from "../relationship-ontology";
import type { Relationship } from "../relationship";
import {
  computeCategoriesByNode,
  computeConnectedComponents,
  computeDegrees,
  computeRelationshipsByNode,
  computeResolutionByNode,
  customRelationshipRatio,
  mean,
  relationshipCategoryDistribution,
  relationshipTypeDistribution,
  stddev,
  type ComponentIndex,
  type DegreeCounts,
  type ResolutionCounts,
} from "./metrics";
import { getInsightTypeDescriptor } from "./ontology";
import { rankInsights } from "./ranking";
import type {
  DiscoveryEvidence,
  DiscoveryInsight,
  InsightPriority,
  InsightType,
} from "./types";

// ---------------------------------------------------------------------------
// Input contract
// ---------------------------------------------------------------------------

/** Minimal graph shape the analyzer needs. Deliberately narrower than the
 *  wire response so tests and adapters can pass any pre-normalized dataset. */
export interface DiscoveryGraphInput {
  nodes: readonly Pick<GraphNode, "id" | "title" | "type" | "category">[];
  relationships: readonly Relationship[];
}

// ---------------------------------------------------------------------------
// Options — deterministic thresholds. Kept as constants so the same input
// always yields the same output; callers can override for offline tools.
// ---------------------------------------------------------------------------

export interface DiscoveryOptions {
  /** Minimum incoming edges to fire MULTIPLE_INCOMING. Default 3. */
  multipleIncomingMin: number;
  /** Minimum outgoing edges to fire MULTIPLE_OUTGOING. Default 3. */
  multipleOutgoingMin: number;
  /** Minimum distinct relationship categories to fire CENTRAL_CONNECTOR. */
  centralConnectorCategoryMin: number;
  /** Unresolved ratio (in [0,1]) to fire UNRESOLVED_CLUSTER. Default 0.5. */
  unresolvedRatioThreshold: number;
  /** Minimum edges on the node before UNRESOLVED_CLUSTER is considered. */
  unresolvedRatioMinEdges: number;
  /** Fraction of nodes (in [0,1]) considered "dense" component. Default 0.25. */
  denseComponentShare: number;
  /** Max size of a component still considered "sparse". Default 2. */
  sparseComponentMaxSize: number;
}

export const DEFAULT_DISCOVERY_OPTIONS: DiscoveryOptions = Object.freeze({
  multipleIncomingMin: 3,
  multipleOutgoingMin: 3,
  centralConnectorCategoryMin: 2,
  unresolvedRatioThreshold: 0.5,
  unresolvedRatioMinEdges: 2,
  denseComponentShare: 0.25,
  sparseComponentMaxSize: 2,
});

// ---------------------------------------------------------------------------
// GraphIndex — computed once, reused by every detector.
// ---------------------------------------------------------------------------

export interface GraphIndex {
  nodeIds: readonly KnowledgeObjectId[];
  degrees: ReadonlyMap<KnowledgeObjectId, DegreeCounts>;
  relsByNode: ReadonlyMap<KnowledgeObjectId, readonly Relationship[]>;
  resolutionByNode: ReadonlyMap<KnowledgeObjectId, ResolutionCounts>;
  categoriesByNode: ReadonlyMap<KnowledgeObjectId, ReadonlySet<string>>;
  components: ComponentIndex;
  /** Descriptive statistics on total degree across all nodes. */
  degreeStats: { mean: number; stddev: number; max: number; highThreshold: number };
  /** Ratio of relationships whose type is not in the ontology catalog. */
  customRatio: number;
  /** Global type/category histograms — reserved for future analyzers. */
  typeHistogram: ReadonlyMap<string, number>;
  categoryHistogram: ReadonlyMap<string, number>;
}

export function buildGraphIndex(input: DiscoveryGraphInput): GraphIndex {
  const nodeIds: KnowledgeObjectId[] = input.nodes.map((n) => n.id);
  const degrees = computeDegrees(input.relationships);
  const relsByNode = computeRelationshipsByNode(input.relationships);
  const resolutionByNode = computeResolutionByNode(input.relationships);
  const categoriesByNode = computeCategoriesByNode(relsByNode);
  const components = computeConnectedComponents(nodeIds, input.relationships);
  const totals: number[] = nodeIds.map((id) => degrees.get(id)?.total ?? 0);
  const dMean = mean(totals);
  const dStd = stddev(totals);
  const dMax = totals.reduce((a, b) => (b > a ? b : a), 0);
  // "Highly connected" threshold: mean + 2σ, but never lower than 3 and
  // never above the observed max. Deterministic on the input.
  const highThreshold = Math.max(3, Math.min(dMax, Math.ceil(dMean + 2 * dStd)));
  return {
    nodeIds,
    degrees,
    relsByNode,
    resolutionByNode,
    categoriesByNode,
    components,
    degreeStats: { mean: dMean, stddev: dStd, max: dMax, highThreshold },
    customRatio: customRelationshipRatio(input.relationships),
    typeHistogram: relationshipTypeDistribution(input.relationships),
    categoryHistogram: relationshipCategoryDistribution(input.relationships) as ReadonlyMap<string, number>,
  };
}

// ---------------------------------------------------------------------------
// Insight construction
// ---------------------------------------------------------------------------

function makeId(type: InsightType, objectIds: readonly KnowledgeObjectId[]): string {
  return `${type}:${[...objectIds].sort().join(",")}`;
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  if (v < 0) return 0;
  if (v > 1) return 1;
  return v;
}

function makeInsight(input: {
  type: InsightType;
  objectIds: readonly KnowledgeObjectId[];
  relationshipIds?: readonly string[];
  score: number;
  why: string;
  evidence: readonly DiscoveryEvidence[];
  priorityOverride?: InsightPriority;
}): DiscoveryInsight {
  const descriptor = getInsightTypeDescriptor(input.type);
  if (input.evidence.length === 0) {
    // Guard the explainability invariant at the construction site. The
    // detectors below never violate it — but if a future detector does,
    // this fails loudly in tests instead of silently shipping empty
    // insights to the UI.
    throw new Error(`Discovery: insight of type ${input.type} is missing evidence.`);
  }
  return {
    id: makeId(input.type, input.objectIds),
    type: input.type,
    priority: input.priorityOverride ?? descriptor.suggestedPriority,
    score: clamp01(input.score),
    objectIds: input.objectIds,
    relationshipIds: input.relationshipIds ?? [],
    why: input.why,
    evidence: input.evidence,
    metadata: { experimental: false, origin: "deterministic" },
  };
}

// ---------------------------------------------------------------------------
// Detectors
// ---------------------------------------------------------------------------

function detectIsolated(index: GraphIndex, out: DiscoveryInsight[]) {
  for (const id of index.nodeIds) {
    const d = index.degrees.get(id);
    if (!d || d.total === 0) {
      out.push(
        makeInsight({
          type: "ISOLATED_OBJECT",
          objectIds: [id],
          score: 1,
          why: "This object has no incoming or outgoing relationships.",
          evidence: [
            { metric: "incomingCount", value: 0 },
            { metric: "outgoingCount", value: 0 },
            { metric: "totalDegree", value: 0 },
          ],
        }),
      );
    }
  }
}

function detectDegree(
  index: GraphIndex,
  opts: DiscoveryOptions,
  out: DiscoveryInsight[],
) {
  const { highThreshold, max } = index.degreeStats;
  for (const id of index.nodeIds) {
    const d = index.degrees.get(id);
    if (!d) continue;
    if (d.incoming >= opts.multipleIncomingMin) {
      out.push(
        makeInsight({
          type: "MULTIPLE_INCOMING",
          objectIds: [id],
          relationshipIds: incomingRelIds(index, id),
          score: clamp01(max === 0 ? 0 : d.incoming / max),
          why: `This object is referenced by ${d.incoming} other objects.`,
          evidence: [{ metric: "incomingCount", value: d.incoming }],
        }),
      );
    }
    if (d.outgoing >= opts.multipleOutgoingMin) {
      out.push(
        makeInsight({
          type: "MULTIPLE_OUTGOING",
          objectIds: [id],
          relationshipIds: outgoingRelIds(index, id),
          score: clamp01(max === 0 ? 0 : d.outgoing / max),
          why: `This object references ${d.outgoing} other objects.`,
          evidence: [{ metric: "outgoingCount", value: d.outgoing }],
        }),
      );
    }
    if (d.total >= highThreshold && d.total > 0) {
      out.push(
        makeInsight({
          type: "HIGHLY_CONNECTED",
          objectIds: [id],
          relationshipIds: allRelIds(index, id),
          score: clamp01(max === 0 ? 0 : d.total / max),
          why: `This object has an unusually high total degree (${d.total}); the graph-wide threshold is ${highThreshold}.`,
          evidence: [
            { metric: "totalDegree", value: d.total },
            { metric: "highThreshold", value: highThreshold },
            { metric: "degreeMean", value: Number(index.degreeStats.mean.toFixed(3)) },
            { metric: "degreeStddev", value: Number(index.degreeStats.stddev.toFixed(3)) },
          ],
        }),
      );
    } else if (
      d.total > 0 &&
      d.total >= Math.ceil(index.degreeStats.mean) &&
      d.total < highThreshold
    ) {
      out.push(
        makeInsight({
          type: "POTENTIAL_HUB",
          objectIds: [id],
          relationshipIds: allRelIds(index, id),
          score: clamp01(max === 0 ? 0 : d.total / max),
          why: `This object is above the average degree (${d.total} ≥ mean ${index.degreeStats.mean.toFixed(2)}) but not in the top tier.`,
          evidence: [
            { metric: "totalDegree", value: d.total },
            { metric: "degreeMean", value: Number(index.degreeStats.mean.toFixed(3)) },
            { metric: "highThreshold", value: highThreshold },
          ],
        }),
      );
    }
  }
}

function detectCentralConnector(
  index: GraphIndex,
  opts: DiscoveryOptions,
  out: DiscoveryInsight[],
) {
  for (const id of index.nodeIds) {
    const cats = index.categoriesByNode.get(id);
    if (!cats || cats.size < opts.centralConnectorCategoryMin) continue;
    const d = index.degrees.get(id);
    if (!d || d.total === 0) continue;
    const categoryList = [...cats].sort();
    out.push(
      makeInsight({
        type: "CENTRAL_CONNECTOR",
        objectIds: [id],
        relationshipIds: allRelIds(index, id),
        score: clamp01(cats.size / 4),
        why: `This object bridges ${cats.size} relationship categories: ${categoryList.join(", ")}.`,
        evidence: [
          { metric: "categoryCount", value: cats.size },
          { metric: "categories", value: categoryList.join(",") },
          { metric: "totalDegree", value: d.total },
        ],
      }),
    );
  }
}

function detectUnresolvedCluster(
  index: GraphIndex,
  opts: DiscoveryOptions,
  out: DiscoveryInsight[],
) {
  for (const id of index.nodeIds) {
    const r = index.resolutionByNode.get(id);
    if (!r || r.total < opts.unresolvedRatioMinEdges) continue;
    if (r.unresolvedRatio < opts.unresolvedRatioThreshold) continue;
    const rels = index.relsByNode.get(id) ?? [];
    out.push(
      makeInsight({
        type: "UNRESOLVED_CLUSTER",
        objectIds: [id],
        relationshipIds: rels.filter((x) => x.status === "unresolved").map((x) => x.id),
        score: clamp01(r.unresolvedRatio),
        why: `${Math.round(r.unresolvedRatio * 100)}% of this object's relationships (${r.unresolved}/${r.total}) point to unresolved targets.`,
        evidence: [
          { metric: "unresolvedCount", value: r.unresolved },
          { metric: "totalRelationships", value: r.total },
          {
            metric: "unresolvedRatio",
            value: Number(r.unresolvedRatio.toFixed(3)),
          },
        ],
      }),
    );
  }
}

function detectClusterMembership(
  index: GraphIndex,
  opts: DiscoveryOptions,
  out: DiscoveryInsight[],
) {
  const nodeCount = index.nodeIds.length;
  if (nodeCount === 0) return;
  const denseThreshold = Math.max(3, Math.ceil(nodeCount * opts.denseComponentShare));
  // Emit at most one insight per component root, on the deterministic
  // "representative" node = lexicographically-smallest id in the component.
  const reps = new Map<string, KnowledgeObjectId>();
  const members = new Map<string, KnowledgeObjectId[]>();
  for (const id of index.nodeIds) {
    const root = index.components.componentOf.get(id);
    if (!root) continue;
    const list = members.get(root) ?? [];
    list.push(id);
    members.set(root, list);
    const cur = reps.get(root);
    if (cur === undefined || id < cur) reps.set(root, id);
  }
  for (const { root, size } of index.components.ordered) {
    const rep = reps.get(root);
    if (!rep) continue;
    if (size >= denseThreshold) {
      out.push(
        makeInsight({
          type: "DENSE_CLUSTER_MEMBER",
          objectIds: [rep],
          score: clamp01(size / nodeCount),
          why: `This object belongs to a large connected component of ${size} nodes (${Math.round((size / nodeCount) * 100)}% of the graph).`,
          evidence: [
            { metric: "componentSize", value: size },
            { metric: "componentShare", value: Number((size / nodeCount).toFixed(3)) },
            { metric: "componentRoot", value: root },
          ],
        }),
      );
    } else if (size > 0 && size <= opts.sparseComponentMaxSize) {
      out.push(
        makeInsight({
          type: "SPARSE_CLUSTER_MEMBER",
          objectIds: [rep],
          score: clamp01(1 - size / nodeCount),
          why: `This object belongs to a small connected component of ${size} node${size === 1 ? "" : "s"}.`,
          evidence: [
            { metric: "componentSize", value: size },
            { metric: "componentShare", value: Number((size / nodeCount).toFixed(3)) },
            { metric: "componentRoot", value: root },
          ],
        }),
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Run every deterministic detector over the input graph. Result is
 *  ranked (see `./ranking`) — callers do not need to sort again. */
export function analyzeGraph(
  input: DiscoveryGraphInput,
  optionsOverride?: Partial<DiscoveryOptions>,
): DiscoveryInsight[] {
  const opts: DiscoveryOptions = { ...DEFAULT_DISCOVERY_OPTIONS, ...(optionsOverride ?? {}) };
  const index = buildGraphIndex(input);
  const out: DiscoveryInsight[] = [];
  detectIsolated(index, out);
  detectDegree(index, opts, out);
  detectCentralConnector(index, opts, out);
  detectUnresolvedCluster(index, opts, out);
  detectClusterMembership(index, opts, out);
  return rankInsights(out);
}

// ---------------------------------------------------------------------------
// Internal helpers — narrow, deterministic. Kept module-local.
// ---------------------------------------------------------------------------

function allRelIds(index: GraphIndex, id: KnowledgeObjectId): string[] {
  return (index.relsByNode.get(id) ?? []).map((r) => r.id);
}
function incomingRelIds(index: GraphIndex, id: KnowledgeObjectId): string[] {
  return (index.relsByNode.get(id) ?? []).filter((r) => r.targetId === id).map((r) => r.id);
}
function outgoingRelIds(index: GraphIndex, id: KnowledgeObjectId): string[] {
  return (index.relsByNode.get(id) ?? []).filter((r) => r.sourceId === id).map((r) => r.id);
}

// `getRelationshipTypeDescriptor` is imported for future detectors that
// branch on ontology metadata. Keep the import live so removing it in a
// future refactor is a conscious decision, not an accident.
void getRelationshipTypeDescriptor;