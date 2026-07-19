// Session-scoped accumulator for facet values discovered while browsing
// the Explorer. The API does not expose a catalog/facets endpoint yet, so
// the UI presents these as auxiliary hints — never as the canonical set.
//
// Values live in module memory: they reset on full page reload, which is
// the intended "session" scope for this MVP.

const types = new Set<string>();
const categories = new Set<string>();
const statuses = new Set<string>();

function addAll(set: Set<string>, values: Iterable<string | undefined | null>): void {
  for (const v of values) {
    if (!v) continue;
    const trimmed = v.trim();
    if (trimmed.length === 0) continue;
    set.add(trimmed);
  }
}

export function recordFacets(input: {
  types?: Iterable<string | undefined | null>;
  categories?: Iterable<string | undefined | null>;
  statuses?: Iterable<string | undefined | null>;
}): void {
  if (input.types) addAll(types, input.types);
  if (input.categories) addAll(categories, input.categories);
  if (input.statuses) addAll(statuses, input.statuses);
}

function sorted(set: Set<string>): string[] {
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}

export function getFacets(): { types: string[]; categories: string[]; statuses: string[] } {
  return {
    types: sorted(types),
    categories: sorted(categories),
    statuses: sorted(statuses),
  };
}

/** Test-only helper. Not used by the app runtime. */
export function _resetFacets(): void {
  types.clear();
  categories.clear();
  statuses.clear();
}