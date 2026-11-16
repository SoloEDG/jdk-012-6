import { useState, useEffect } from "react";
import { loadDocument, saveDocument } from "../../../shared/storage";
import { artworkById } from "../../../shared/catalog";
import { comparisonKey } from "../../../shared/comparisons";
import type { Comparison } from "../../../shared/types";

export function useCollection() {
  const [document, setDocument] = useState(loadDocument);
  const [storageError, setStorageError] = useState(false);
  useEffect(() => {
    setStorageError(!saveDocument(document));
  }, [document]);
  return {
    document,
    storageError,
    toggle: (id: string) =>
      setDocument((d) => {
        const removing = d.favorites.includes(id);
        return {
          ...d,
          favorites: removing
            ? d.favorites.filter((x) => x !== id)
            : [...d.favorites, id],
          // Notes and comparison relations survive; only the arrangement
          // cannot include a work that is no longer collected.
          studyIds: removing
            ? d.studyIds.filter((x) => x !== id)
            : d.studyIds,
        };
      }),
    note: (id: string, text: string) =>
      setDocument((d) => ({ ...d, notes: { ...d.notes, [id]: text } })),
    record: (id: string, seconds: number) => {
      if (!artworkById(id)) return;
      setDocument((d) => {
        const previous = d.visits.find((v) => v.id === id);
        return {
          ...d,
          visits: previous
            ? d.visits.map((v) =>
                v.id === id ? { ...v, seconds: v.seconds + seconds } : v,
              )
            : [...d.visits, { id, seconds, at: Date.now() }],
        };
      });
    },
    saveStudy: (ids: string[]) =>
      setDocument((d) => ({ ...d, studyIds: ids })),
    /** Starts a fresh study set with `id` first, padded from favorites. */
    startStudy: (id: string, limit: number) =>
      setDocument((d) => {
        if (!artworkById(id) || !d.favorites.includes(id)) return d;
        const siblings = d.favorites.filter(
          (x) => x !== id && artworkById(x),
        );
        return {
          ...d,
          // Start with a workable trio, never the maximum: the visitor can
          // still add a fourth deliberately.
          studyIds: [id, ...siblings].slice(0, Math.min(3, Math.max(2, limit))),
        };
      }),
    /** Seeds the study set from favorites only when it is not already viable. */
    ensureStudy: (limit: number) =>
      setDocument((d) => {
        const valid = d.studyIds
          .filter((id) => artworkById(id) && d.favorites.includes(id))
          .slice(0, limit);
        if (valid.length >= 2) return d;
        const seed = d.favorites.filter((id) => artworkById(id)).slice(0, 3);
        return { ...d, studyIds: seed.slice(0, limit) };
      }),
    addStudy: (id: string, limit: number) =>
      setDocument((d) => {
        if (!artworkById(id) || !d.favorites.includes(id)) return d;
        const valid = d.studyIds.filter(
          (x) => artworkById(x) && d.favorites.includes(x),
        );
        if (valid.includes(id) || valid.length >= limit) return d;
        return { ...d, studyIds: [...valid, id] };
      }),
    removeStudy: (id: string, limit: number) =>
      setDocument((d) => {
        const valid = d.studyIds
          .filter((x) => artworkById(x) && d.favorites.includes(x))
          .slice(0, limit);
        if (valid.length <= 2 || !valid.includes(id)) return d;
        return { ...d, studyIds: valid.filter((x) => x !== id) };
      }),
    /**
     * `touch` records the relation even before prose is written, for an
     * explicit comparison run. Typing alone never creates an empty record.
     */
    compare: (
      ids: string[],
      note: string,
      segment: number,
      options?: { touch?: boolean },
    ) =>
      setDocument((d) => {
        const key = comparisonKey(ids);
        const previous = d.comparisons.find(
          (c) => comparisonKey(c.ids) === key,
        );
        if (!previous && !note.trim() && !options?.touch) return d;
        const next: Comparison = {
          ids: [...ids],
          note,
          segment,
          at: Date.now(),
        };
        return {
          ...d,
          comparisons: previous
            ? d.comparisons.map((c) =>
                comparisonKey(c.ids) === key ? next : c,
              )
            : [...d.comparisons, next],
        };
      }),
  };
}
