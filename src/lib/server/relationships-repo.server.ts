// Relationship repository — server-only. Handles graph read + create.

import { supabaseAdmin, SCHEMA_VERSION } from "./db.server";
import { toGraphEdge, toGraphNode, type ObjectRow, type RelationshipRow } from "./mappers.server";
import type { GraphResponse } from "@/lib/api/types";

export async function getGraph(): Promise<GraphResponse> {
  const [{ data: nodes, error: nErr }, { data: edges, error: eErr }] = await Promise.all([
    supabaseAdmin.from("knowledge_objects").select("id,title,type,category"),
    supabaseAdmin.from("relationships").select("*"),
  ]);
  if (nErr) throw nErr;
  if (eErr) throw eErr;

  const nodeRows = (nodes ?? []) as unknown as Pick<ObjectRow, "id" | "title" | "type" | "category">[];
  const edgeRows = (edges ?? []) as unknown as RelationshipRow[];

  const mappedEdges = edgeRows.map(toGraphEdge);
  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: SCHEMA_VERSION,
    nodeCount: nodeRows.length,
    edgeCount: mappedEdges.length,
    unresolvedEdgeCount: mappedEdges.filter((e) => !e.resolved).length,
    nodes: nodeRows.map(toGraphNode),
    edges: mappedEdges,
  };
}

export interface CreateRelationshipInput {
  sourceObjectId: string;
  targetObjectId: string;
  type: string;
  description?: string;
  provenance?: string;
  confidence?: number;
}

export async function createRelationship(input: CreateRelationshipInput) {
  // Verify both endpoints exist → server-derived `resolved`.
  const { data: found, error: fErr } = await supabaseAdmin
    .from("knowledge_objects")
    .select("id")
    .in("id", [input.sourceObjectId, input.targetObjectId]);
  if (fErr) throw fErr;
  const foundIds = new Set((found ?? []).map((r) => r.id));
  const resolved = foundIds.has(input.sourceObjectId) && foundIds.has(input.targetObjectId);

  const { data, error } = await supabaseAdmin
    .from("relationships")
    .insert({
      source_object_id: input.sourceObjectId,
      target_object_id: input.targetObjectId,
      type: input.type,
      description: input.description ?? null,
      resolved,
      provenance: input.provenance ?? null,
      confidence: input.confidence ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toGraphEdge(data as unknown as RelationshipRow);
}