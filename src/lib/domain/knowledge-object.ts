// Canonical Knowledge Object model for Hidden Grain (HG-CORE-001).
//
// This is the ONLY shape the UI should reason about. The API contract
// (`src/lib/api/types.ts`) is treated as an on-the-wire dialect that is
// translated into this canonical form by `normalize.ts`. No feature code
// should destructure `KnowledgeObjectSummary` / `GraphNode` directly.
//
// Fields marked optional are optional on purpose: the current backend
// contract does not carry them yet. They live on the canonical model so
// UI code can be written against the final shape today, and the normalizer
// can start populating them the moment the backend adopts them — no UI
// change required.

import { z } from "zod";

export type KnowledgeObjectId = string;

/** Auxiliary bag for fields that are not first-class in the canonical model
 *  but still ship on the current contract. Keeping them here means feature
 *  code has one predictable place to reach for them, without polluting the
 *  canonical surface. */
export interface KnowledgeObjectMetadata {
  /** Backend "category" — a coarse classification we do NOT promote to
   *  `type`, because `type` and `category` are distinct in the contract. */
  category?: string;
  /** Content keywords (semantic hints). Always an array (possibly empty). */
  keywords: readonly string[];
  /** Content-addressable digest of the underlying source, when the backend
   *  emits one. Presentational only. */
  checksum?: string;
  /** Filesystem-like path or logical source key. Mirrored as `source`. */
  path?: string;
  /** Number of relationships reported by the projection. */
  relationshipCount?: number;
}

/** Version handle. Kept intentionally minimal — HG-CORE-001 only prepares
 *  the shape; editing/history is future work. */
export interface KnowledgeObjectVersionRef {
  /** Current version string as reported by the backend. */
  current?: string;
  /** Reserved for future: ordered list of prior versions. Undefined today. */
  history?: readonly string[];
  /** Reserved for future: whether newer versions exist upstream. */
  hasNewer?: boolean;
}

export interface KnowledgeObject {
  id: KnowledgeObjectId;
  /** Human-readable label. Falls back to `id` if the backend omits it. */
  title: string;
  /** Domain type (contract field). */
  type?: string;
  /** Lifecycle status (contract field). */
  status?: string;
  /** Long-form description. Populated from `summary` (list/detail) or
   *  `description` (edge context) — never fabricated. */
  description?: string;
  /** Reserved: user-managed labels. Not in current contract. */
  labels?: readonly string[];
  /** Free-form tags. Always an array (possibly empty). */
  tags: readonly string[];
  /** Reserved: owner user / team. Not in current contract. */
  owner?: string;
  /** Logical origin (currently `metadata.path`). */
  source?: string;
  /** Reserved: ISO timestamp. Not in current contract. */
  createdAt?: string;
  /** Reserved: ISO timestamp. Not in current contract. */
  updatedAt?: string;
  /** Current version string. Duplicated in `versionRef.current` for the
   *  versioning-ready API surface. */
  version?: string;
  /** Version-ready handle — see `KnowledgeObjectVersionRef`. */
  versionRef?: KnowledgeObjectVersionRef;
  /** Auxiliary metadata bag — see `KnowledgeObjectMetadata`. */
  metadata: KnowledgeObjectMetadata;
}

/** Relationship between two Knowledge Objects. Mirrors the on-the-wire
 *  `GraphEdge` today; kept in the domain layer so feature code depends on
 *  the domain, not on the API dialect. */
export interface KnowledgeRelationship {
  id: string;
  source: KnowledgeObjectId;
  target: KnowledgeObjectId;
  type: string;
  description?: string;
  resolved: boolean;
}

// ---------------------------------------------------------------------------
// Zod schemas — these validate the *canonical* shape, not the wire shape.
// They exist so downstream code (tests, future persistence, or a devtool)
// can assert on normalized data. Contract validation still lives in
// `src/lib/api/schemas.ts`.
// ---------------------------------------------------------------------------

const IsoDateSchema = z
  .string()
  .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid ISO date" });

export const KnowledgeObjectMetadataSchema: z.ZodType<KnowledgeObjectMetadata> = z.object({
  category: z.string().optional(),
  keywords: z.array(z.string()).readonly(),
  checksum: z.string().optional(),
  path: z.string().optional(),
  relationshipCount: z.number().int().nonnegative().optional(),
});

export const KnowledgeObjectVersionRefSchema: z.ZodType<KnowledgeObjectVersionRef> = z.object({
  current: z.string().optional(),
  history: z.array(z.string()).readonly().optional(),
  hasNewer: z.boolean().optional(),
});

export const KnowledgeObjectSchema: z.ZodType<KnowledgeObject> = z.object({
  id: z.string().min(1),
  title: z.string(),
  type: z.string().optional(),
  status: z.string().optional(),
  description: z.string().optional(),
  labels: z.array(z.string()).readonly().optional(),
  tags: z.array(z.string()).readonly(),
  owner: z.string().optional(),
  source: z.string().optional(),
  createdAt: IsoDateSchema.optional(),
  updatedAt: IsoDateSchema.optional(),
  version: z.string().optional(),
  versionRef: KnowledgeObjectVersionRefSchema.optional(),
  metadata: KnowledgeObjectMetadataSchema,
});

export const KnowledgeRelationshipSchema: z.ZodType<KnowledgeRelationship> = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  type: z.string(),
  description: z.string().optional(),
  resolved: z.boolean(),
});
