// Mutation factories for TanStack Query.
// UI is not wired yet (EPIC-005.0 excludes forms); these are ready for the
// next EPIC to consume via `useMutation(createObjectMutation(qc))`.

import { type QueryClient } from "@tanstack/react-query";

import { api } from "./client";
import { hgKeys } from "./queries";
import type {
  CreateKnowledgeObjectRequest,
  CreateRelationshipRequest,
  ObjectDetailResponse,
} from "./types";

export const createObjectMutation = (qc: QueryClient) => ({
  mutationKey: [...hgKeys.objects(), "create"] as const,
  mutationFn: (input: CreateKnowledgeObjectRequest) => api.createObject(input),
  onSuccess: (data: ObjectDetailResponse) => {
    qc.invalidateQueries({ queryKey: hgKeys.objects() });
    qc.invalidateQueries({ queryKey: [...hgKeys.all, "graph"] });
    qc.invalidateQueries({ queryKey: hgKeys.health() });
    // Prime the detail cache so the immediate navigation to /objects/:id
    // renders without an extra round-trip.
    qc.setQueryData(hgKeys.object(data.object.id), data);
  },
});

export const createRelationshipMutation = (qc: QueryClient) => ({
  mutationKey: [...hgKeys.all, "relationships", "create"] as const,
  mutationFn: (input: CreateRelationshipRequest) => api.createRelationship(input),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: hgKeys.all });
  },
});
