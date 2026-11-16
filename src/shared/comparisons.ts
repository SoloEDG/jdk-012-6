import type { Comparison, GalleryDocument } from "./types";

/** Stable key for a comparison set: ordering never forks a second note. */
export function comparisonKey(ids: string[]): string {
  return [...ids].sort().join("+");
}

export function findComparison(
  document: GalleryDocument,
  ids: string[],
): Comparison | undefined {
  const key = comparisonKey(ids);
  return document.comparisons.find(
    (comparison) => comparisonKey(comparison.ids) === key,
  );
}
