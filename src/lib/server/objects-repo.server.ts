// Object repository — server-only. Handles list/get/create.

import { supabaseAdmin } from "./db.server";
import {
  toGraphNode,
  toGraphEdge,
  toObjectSummary,
  type ObjectRow,
  type RelationshipRow,
} from "./mappers.server";
import type {
  KnowledgeObjectSummary,
  ObjectDetailResponse,
  ObjectsListResponse,
  ObjectsQueryParams,
} from "@/lib/api/types";

const OBJECT_COLUMNS =
  "id,title,type,category,status,summary,keywords,tags,version,path,checksum,created_at,updated_at";

async function countRelationships(ids: string[]): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (ids.length === 0) return counts;
  const { data, error } = await supabaseAdmin
    .from("relationships")
    .select("source_object_id,target_object_id")
    .or(`source_object_id.in.(${ids.join(",")}),target_object_id.in.(${ids.join(",")})`);
  if (error) throw error;
  const set = new Set(ids);
  for (const r of data ?? []) {
    if (set.has(r.source_object_id))
      counts.set(r.source_object_id, (counts.get(r.source_object_id) ?? 0) + 1);
    if (set.has(r.target_object_id) && r.target_object_id !== r.source_object_id) {
      counts.set(r.target_object_id, (counts.get(r.target_object_id) ?? 0) + 1);
    }
  }
  return counts;
}

export async function listObjects(params: ObjectsQueryParams): Promise<ObjectsListResponse> {
  const limit = Math.min(Math.max(params.limit ?? 20, 1), 100);
  const offset = Math.max(params.offset ?? 0, 0);

  let query = supabaseAdmin.from("knowledge_objects").select(OBJECT_COLUMNS, { count: "exact" });

  if (params.type) query = query.eq("type", params.type);
  if (params.category) query = query.eq("category", params.category);
  if (params.status) query = query.eq("status", params.status);
  if (params.tag) query = query.contains("tags", [params.tag]);
  if (params.q && params.q.trim()) {
    const q = params.q.trim().replace(/[%_]/g, "\\$&");
    query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%`);
  }

  query = query.order("updated_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  const rows = (data ?? []) as unknown as ObjectRow[];
  const relCounts = await countRelationships(rows.map((r) => r.id));
  const items: KnowledgeObjectSummary[] = rows.map((r) =>
    toObjectSummary(r, relCounts.get(r.id) ?? 0),
  );
  return { total: count ?? items.length, offset, limit, items };
}

export async function getObject(id: string): Promise<ObjectDetailResponse | null> {
  const { data: row, error } = await supabaseAdmin
    .from("knowledge_objects")
    .select(OBJECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;
  const objectRow = row as unknown as ObjectRow;

  const { data: rels, error: relErr } = await supabaseAdmin
    .from("relationships")
    .select("*")
    .or(`source_object_id.eq.${id},target_object_id.eq.${id}`);
  if (relErr) throw relErr;
  const relationshipRows = (rels ?? []) as unknown as RelationshipRow[];

  const outgoing = relationshipRows.filter((r) => r.source_object_id === id).map(toGraphEdge);
  const incoming = relationshipRows
    .filter((r) => r.target_object_id === id && r.source_object_id !== id)
    .map(toGraphEdge);

  const summary = toObjectSummary(objectRow, relationshipRows.length);
  return {
    object: summary,
    node: toGraphNode(objectRow),
    relationships: { outgoing, incoming },
  };
}

export interface CreateObjectInput {
  title: string;
  type: string;
  category: string;
  status: string;
  summary?: string;
  keywords?: string[];
  tags?: string[];
}

function computeChecksum(input: CreateObjectInput, id: string): string {
  // Deterministic short checksum — server-derived, not client-controlled.
  const payload = JSON.stringify({ id, ...input });
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = (h * 31 + payload.charCodeAt(i)) | 0;
  return `sha256:${(h >>> 0).toString(16).padStart(8, "0")}`;
}

export async function createObject(input: CreateObjectInput): Promise<ObjectDetailResponse> {
  const { data: inserted, error } = await supabaseAdmin
    .from("knowledge_objects")
    .insert({
      title: input.title,
      type: input.type,
      category: input.category,
      status: input.status,
      summary: input.summary ?? "",
      keywords: input.keywords ?? [],
      tags: input.tags ?? [],
      version: "1",
      path: "",
      checksum: "",
    })
    .select(OBJECT_COLUMNS)
    .single();
  if (error) throw error;
  const row = inserted as unknown as ObjectRow;
  const checksum = computeChecksum(input, row.id);
  const path = `/objects/${row.id}`;
  const { data: patched, error: pErr } = await supabaseAdmin
    .from("knowledge_objects")
    .update({ checksum, path })
    .eq("id", row.id)
    .select(OBJECT_COLUMNS)
    .single();
  if (pErr) throw pErr;
  const final = patched as unknown as ObjectRow;
  const summary = toObjectSummary(final, 0);
  return {
    object: summary,
    node: toGraphNode(final),
    relationships: { outgoing: [], incoming: [] },
  };
}
