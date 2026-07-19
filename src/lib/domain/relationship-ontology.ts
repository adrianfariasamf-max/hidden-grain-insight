// Canonical Relationship Ontology for Hidden Grain (EPIC-002.3).
//
// This module is the SINGLE SOURCE OF TRUTH for relationship types across
// the product. Feature code (Object Detail, Graph, Explorer, future AI /
// inference / analytics surfaces) must resolve every wire `type` string
// through `getRelationshipTypeDescriptor()` — never branch on raw strings.
//
// The catalog is intentionally conservative: it seeds the known types the
// current backend emits and leaves room for future entries. When the
// backend introduces a new type the UI degrades gracefully by wrapping it
// in a "Custom" descriptor that preserves the original id.

import {
  GitBranch,
  Link2,
  Network,
  Package,
  Puzzle,
  Share2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

/** Coarse grouping for legends, filters and analytics. Kept small on
 *  purpose — categories are a governance surface, not a free-for-all. */
export type RelationshipCategory =
  | "structural"
  | "referential"
  | "dependency"
  | "semantic"
  | "custom";

/** Tone token — must stay in sync with the design tokens exposed to
 *  Tailwind (`primary`, `success`, `warning`, `neutral`). */
export type RelationshipTone = "primary" | "success" | "warning" | "neutral";

export interface RelationshipTypeDescriptor {
  /** Stable machine id. For catalog entries this is the canonical lowercase
   *  form; for unknown backend values it is the original raw string. */
  id: string;
  /** Human-readable label. Never fabricated for custom types — falls back
   *  to the raw id when no override exists. */
  displayName: string;
  /** Short editorial description. Empty string when unknown. */
  description: string;
  /** Icon suggestion. Purely presentational. */
  icon: LucideIcon;
  /** Semantic tone. */
  tone: RelationshipTone;
  /** Governance category. Custom / unknown types fall into "custom". */
  category: RelationshipCategory;
  /** Deterministic sort weight — lower renders first in legends. */
  order: number;
  /** True when the descriptor was synthesized for an unknown backend
   *  value (i.e. it is not part of the official catalog). */
  isCustom: boolean;
}

// ---------------------------------------------------------------------------
// Official catalog. Aliases share a single descriptor so wire variants
// (`depends` / `depends_on`, `reference` / `references`) resolve to the
// same entry — the catalog is normalized around the canonical `id`.
// ---------------------------------------------------------------------------

interface CatalogSeed extends Omit<RelationshipTypeDescriptor, "isCustom"> {
  aliases?: readonly string[];
}

const CATALOG_SEEDS: readonly CatalogSeed[] = [
  {
    id: "contains",
    displayName: "Contains",
    description: "The source object contains the target as a structural child.",
    icon: Package,
    tone: "primary",
    category: "structural",
    order: 10,
  },
  {
    id: "part_of",
    displayName: "Part of",
    description: "The source object is a structural part of the target.",
    icon: Puzzle,
    tone: "primary",
    category: "structural",
    order: 11,
  },
  {
    id: "depends_on",
    displayName: "Depends on",
    description: "The source object depends on the target to function.",
    icon: GitBranch,
    tone: "warning",
    category: "dependency",
    order: 20,
    aliases: ["depends"],
  },
  {
    id: "references",
    displayName: "References",
    description: "The source object refers to the target without a strong coupling.",
    icon: Link2,
    tone: "neutral",
    category: "referential",
    order: 30,
    aliases: ["reference"],
  },
  {
    id: "linked",
    displayName: "Linked",
    description: "A generic link between two objects.",
    icon: Link2,
    tone: "neutral",
    category: "referential",
    order: 31,
  },
  {
    id: "connects",
    displayName: "Connects",
    description: "The source object connects to the target through the graph.",
    icon: Network,
    tone: "neutral",
    category: "semantic",
    order: 40,
  },
  {
    id: "related",
    displayName: "Related",
    description: "A generic semantic relation.",
    icon: Share2,
    tone: "neutral",
    category: "semantic",
    order: 41,
  },
];

const CATALOG: readonly RelationshipTypeDescriptor[] = CATALOG_SEEDS.map((seed) => ({
  id: seed.id,
  displayName: seed.displayName,
  description: seed.description,
  icon: seed.icon,
  tone: seed.tone,
  category: seed.category,
  order: seed.order,
  isCustom: false,
}));

const LOOKUP: ReadonlyMap<string, RelationshipTypeDescriptor> = (() => {
  const map = new Map<string, RelationshipTypeDescriptor>();
  for (const seed of CATALOG_SEEDS) {
    const canonical = CATALOG.find((c) => c.id === seed.id)!;
    map.set(seed.id, canonical);
    for (const alias of seed.aliases ?? []) map.set(alias.toLowerCase(), canonical);
  }
  return map;
})();

/** Canonical accessor. Returns a descriptor for every possible input,
 *  synthesizing a "Custom" entry that preserves the raw id when the type
 *  is not part of the catalog. Never throws, never returns undefined. */
export function getRelationshipTypeDescriptor(
  type: string | undefined | null,
): RelationshipTypeDescriptor {
  const raw = typeof type === "string" ? type.trim() : "";
  if (raw.length === 0) return CUSTOM_UNKNOWN;
  const hit = LOOKUP.get(raw.toLowerCase());
  if (hit) return hit;
  return {
    id: raw,
    displayName: raw,
    description: "",
    icon: Sparkles,
    tone: "neutral",
    category: "custom",
    order: 900,
    isCustom: true,
  };
}

/** Descriptor used when the wire value is missing or empty. */
const CUSTOM_UNKNOWN: RelationshipTypeDescriptor = {
  id: "unknown",
  displayName: "Unknown",
  description: "",
  icon: Sparkles,
  tone: "neutral",
  category: "custom",
  order: 999,
  isCustom: true,
};

/** Full catalog, ordered. Useful for future legends, filter menus and
 *  documentation surfaces. Custom / unknown types are NOT included. */
export function listRelationshipTypes(): readonly RelationshipTypeDescriptor[] {
  return [...CATALOG].sort((a, b) => a.order - b.order);
}

/** Deterministic comparator across arbitrary descriptors (catalog or
 *  custom). Custom entries always sort after catalog entries; ties break
 *  by displayName. */
export function compareRelationshipTypes(
  a: RelationshipTypeDescriptor,
  b: RelationshipTypeDescriptor,
): number {
  if (a.order !== b.order) return a.order - b.order;
  return a.displayName.localeCompare(b.displayName);
}
