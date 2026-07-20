// Zod schemas that mirror the exact shapes currently consumed by the
// Hidden Grain UI. Kept 1:1 with `src/lib/api/types.ts` — do NOT add
// derived, hardcoded or UI-only fields.

import { z } from "zod";

export const KnowledgeObjectSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  category: z.string(),
  status: z.string(),
  version: z.string(),
  summary: z.string(),
  keywords: z.array(z.string()),
  tags: z.array(z.string()),
  path: z.string(),
  checksum: z.string(),
  relationshipCount: z.number(),
});

export const GraphNodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  category: z.string(),
});

export const GraphEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  type: z.string(),
  description: z.string().optional(),
  resolved: z.boolean(),
});

export const ObjectsListResponseSchema = z.object({
  total: z.number(),
  offset: z.number(),
  limit: z.number(),
  items: z.array(KnowledgeObjectSummarySchema),
});

export const ObjectDetailResponseSchema = z.object({
  object: KnowledgeObjectSummarySchema,
  node: GraphNodeSchema.optional(),
  relationships: z.object({
    outgoing: z.array(GraphEdgeSchema),
    incoming: z.array(GraphEdgeSchema),
  }),
});

export const GraphResponseSchema = z.object({
  generatedAt: z.string(),
  schemaVersion: z.string(),
  nodeCount: z.number(),
  edgeCount: z.number(),
  unresolvedEdgeCount: z.number(),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
});

export const HealthResponseSchema = z.object({
  status: z.string(),
  service: z.string(),
  schemaVersion: z.string(),
  objects: z.number(),
  nodes: z.number(),
  edges: z.number(),
  generatedAt: z.string(),
});

// ------------------- Write contract (EPIC-005.0) -------------------
export const CreateKnowledgeObjectRequestSchema = z.object({
  title: z.string().min(1).max(200),
  type: z.string().min(1),
  category: z.string().min(1),
  status: z.string().min(1),
  summary: z.string().max(2000).optional(),
  keywords: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const CreateKnowledgeObjectResponseSchema = ObjectDetailResponseSchema;

export const CreateRelationshipRequestSchema = z.object({
  sourceObjectId: z.string().uuid(),
  targetObjectId: z.string().uuid(),
  type: z.string().min(1),
  description: z.string().optional(),
  provenance: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

export const CreateRelationshipResponseSchema = GraphEdgeSchema;
