import { useMemo, useRef, useState, useEffect } from "react";
import type { GalleryDocument } from "../../../shared/types";
import { artworkById } from "../../../shared/catalog";
import { findComparison, comparisonKey } from "../../../shared/comparisons";
import { useNarration } from "../../narration";
import { segmentWindow } from "../../narration/lib/timeline";
import { planStudy, STUDY_LIMIT } from "../lib/layout";
import { textureBudget } from "../lib/textureBudget";

export type TextureStrategy = "detail" | "smooth";

/**
 * Study-room state. Deliberately separate from the hall's tour, walker and
 * narration so that leaving the room restores the hall unchanged.
 */
export function useStudy(
  document: GalleryDocument,
  collection: {
    startStudy: (id: string, limit: number) => void;
    ensureStudy: (limit: number) => void;
    addStudy: (id: string, limit: number) => void;
    removeStudy: (id: string, limit: number) => void;
    compare: (
      ids: string[],
      note: string,
      segment: number,
      options?: { touch?: boolean },
    ) => void;
  },
) {
  const favorites = document.favorites.filter((id) => artworkById(id));
  const ids = document.studyIds
    .filter((id) => artworkById(id) && favorites.includes(id))
    .slice(0, STUDY_LIMIT);
  const plan = useMemo(() => planStudy(ids), [ids.join("|")]);

  const [inRoom, setInRoom] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(ids[0] ?? null);
  const [segment, setSegmentState] = useState(
    () => findComparison(document, ids)?.segment ?? 0,
  );
  const [strategy, setStrategy] = useState<TextureStrategy>("detail");
  const [notice, setNotice] = useState("");
  const queue = useRef<string[] | null>(null);
  const segmentRef = useRef(0);
  segmentRef.current = segment;

  const key = comparisonKey(ids);
  const stored = findComparison(document, ids);
  const [draft, setDraft] = useState(stored?.note ?? "");
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const keyRef = useRef(key);
  const storedRef = useRef(stored);
  storedRef.current = stored;

  // Load the note belonging to the current set; sets never share a note.
  useEffect(() => {
    if (keyRef.current === key) return;
    keyRef.current = key;
    const saved = storedRef.current;
    const next = saved?.note ?? "";
    setDraft(next);
    draftRef.current = next;
    let active = segmentRef.current;
    if (saved) {
      const longest = Math.max(
        ...ids.map((id) => artworkById(id)?.transcript.length ?? 1),
      );
      if (saved.segment < longest) {
        active = saved.segment;
        setSegmentState(saved.segment);
      }
    }
    const absent = ids.filter((id) => {
      const art = artworkById(id);
      return !art || active >= art.transcript.length;
    });
    setNotice(
      absent.length
        ? `并置组合已改变；${absent
            .map((id) => `《${artworkById(id)?.title}》`)
            .join("、")}没有第 ${active + 1} 段讲解，将标注为未参与对照，不会用其他段落替代。上一组的比较笔记仍保存在“我的收藏 · 比较笔记”。`
        : "并置组合已改变；上一组的比较笔记仍保存在“我的收藏 · 比较笔记”。",
    );
  }, [key]);

  // Seeding happens asynchronously after the room description is read; make
  // sure the room always has a valid object in focus.
  useEffect(() => {
    if (!ids.length) return;
    if (focusId && ids.includes(focusId)) return;
    setFocusId(ids[0]);
  }, [ids.join("|"), focusId]);


  const narration = useNarration(() => advanceQueue());

  // A narrated object can disappear from the set (removed, unfavourited or
  // pruned after re-entering). Stop cleanly instead of leaving the player on
  // a work that is no longer on the wall; the comparison note is untouched.
  useEffect(() => {
    if (!narration.state.playing) return;
    if (!ids.includes(narration.state.artworkId ?? "")) {
      queue.current = null;
      narration.pause();
    }
  }, [ids.join("|"), narration.state.playing, narration.state.artworkId]);

  function advanceQueue() {
    const q = queue.current;
    if (!q || q.length === 0) return;
    const [next, ...rest] = q;
    queue.current = rest.length ? rest : null;
    const art = artworkById(next);
    if (!art) return advanceQueue();
    const win = segmentWindow(art, segmentRef.current);
    if (!win) return advanceQueue();
    setFocusId(next);
    narration.playRange(next, win.start, win.end);
  }

  const selected = new Set(ids);
  const maxSegments = Math.max(
    1,
    ...ids.map((id) => artworkById(id)?.transcript.length ?? 1),
  );
  const missing = ids.filter((id) => {
    const art = artworkById(id);
    return !art || segment >= art.transcript.length;
  });
  const comparable = ids.filter((id) => !missing.includes(id));

  const seed = () => {
    if (ids.length >= 2) return;
    collection.ensureStudy(STUDY_LIMIT);
  };

  const startWith = (id: string) => {
    queue.current = null;
    narration.pause();
    collection.startStudy(id, STUDY_LIMIT);
    setFocusId(id);
    setSegmentState(0);
    setNotice("");
  };

  const add = (id: string) => {
    if (!favorites.includes(id)) {
      setNotice("先在主展厅收藏这件作品，才能加入并置。");
      return;
    }
    if (ids.length >= STUDY_LIMIT) {
      setNotice(
        `并置上限 ${STUDY_LIMIT} 件：请先移除一件，或分组观看；不会缩小作品。`,
      );
      return;
    }
    collection.addStudy(id, STUDY_LIMIT);
    setFocusId(id);
    const art = artworkById(id);
    if (queue.current) {
      // The comparison chain is based on the old set; stop rather than jump.
      queue.current = null;
      narration.pause();
    }
    setNotice(
      art && segment >= art.transcript.length
        ? `《${art.title}》只有 ${art.transcript.length} 段讲解，没有第 ${segment + 1} 段；它将标注为未参与对照，不会用其他段落替代。`
        : "",
    );
  };

  const remove = (id: string) => {
    if (ids.length <= 2) {
      setNotice("并置至少需要两件作品：宁可分组观看，也不单独缩小一件。");
      return;
    }
    const remaining = ids.filter((x) => x !== id);
    collection.removeStudy(id, STUDY_LIMIT);
    if (queue.current) {
      queue.current = queue.current.filter((x) => remaining.includes(x));
      if (!queue.current.length) queue.current = null;
    }
    if (focusId === id) {
      // The narrated object is leaving: stop cleanly and move focus, without
      // touching the saved comparison note.
      queue.current = null;
      narration.pause();
      setFocusId(remaining[0] ?? null);
    }
    if (
      segment >= 1 &&
      remaining.every((x) => {
        const art = artworkById(x);
        return !art || segment >= art.transcript.length;
      })
    ) {
      // The remaining set has no work with this segment: fall back to segment 0
      // rather than silently substituting a different passage.
      setSegmentState(0);
      narration.pause();
      setNotice("剩余作品没有这一段讲解，已回到第 1 段；原比较笔记仍然保留。");
      return;
    }
    setNotice("");
  };

  const setSegment = (next: number) => {
    setSegmentState(next);
    if (queue.current) {
      queue.current = null;
      narration.pause();
    }
    setNotice("");
  };

  const updateNote = (text: string) => {
    setDraft(text);
    if (ids.length >= 2) collection.compare(ids, text, segment);
  };

  const playSingle = () => {
    if (!focusId) return;
    queue.current = null;
    narration.play(focusId);
    setNotice("");
  };

  const playSegment = () => {
    if (!focusId) return;
    const art = artworkById(focusId);
    if (!art) return;
    const win = segmentWindow(art, segment);
    if (!win) {
      setNotice("这件作品没有这一段讲解，未播放其他段落顶替。");
      return;
    }
    queue.current = null;
    narration.playRange(focusId, win.start, win.end);
    setNotice("");
  };

  const compareSegment = () => {
    if (comparable.length < 2) {
      setNotice(
        missing.length
          ? "同段对照至少需要两件作品拥有这一段；缺失的作品不会被其他段落替代。"
          : "至少选择两件作品。",
      );
      return;
    }
    const ordered = ids.filter((id) => comparable.includes(id));
    collection.compare(ids, draftRef.current, segment, { touch: true });
    queue.current = ordered.slice(1);
    setFocusId(ordered[0]);
    const art = artworkById(ordered[0])!;
    const win = segmentWindow(art, segment)!;
    narration.playRange(ordered[0], win.start, win.end);
    setNotice(
      `正在对照第 ${segment + 1} 段，共 ${ordered.length} 件${
        missing.length ? `；${missing.length} 件缺少此段，已标注未参与` : ""
      }。`,
    );
  };

  const stopNarration = () => {
    queue.current = null;
    narration.pause();
  };

  const updateStrategy = (next: TextureStrategy) => {
    setStrategy(next);
    setNotice(
      next === "detail"
        ? "按需细化：只为当前对象保留一张高精度贴图，切换时先释放旧的。"
        : "流畅对照：每件作品使用中等精度，切换无加载停顿，近距离细节略少。",
    );
  };

  const budget = textureBudget(ids.length, strategy);

  return {
    ids,
    favorites: favorites.filter((id) => !selected.has(id)),
    plan,
    inRoom,
    focusId,
    setFocusId: (id: string | null) => {
      if (id === focusId) return;
      setFocusId(id);
      if (queue.current) {
        // Choosing a new object stops the comparison chain but keeps the note.
        queue.current = null;
        narration.pause();
      }
    },
    segment,
    maxSegments,
    missing,
    comparable,
    note: draft,
    storedNote: stored?.note ?? "",
    key,
    /** Saved notes for overlapping sets, shown so a removal never reads as loss. */
    related: document.comparisons
      .filter(
        (c) =>
          comparisonKey(c.ids) !== key &&
          c.ids.some((id) => ids.includes(id)) &&
          c.note.trim(),
      )
      .slice(-4)
      .reverse(),
    strategy,
    budget,
    notice,
    narration,
    narrationPlaying: narration.state.playing,
    enterRoom: () => {
      setInRoom(true);
      if (!ids.includes(focusId ?? "")) setFocusId(ids[0] ?? null);
    },
    isMissing: (id: string | null) =>
      Boolean(id && missing.includes(id)),
    leaveRoom: () => {
      stopNarration();
      setInRoom(false);
    },
    seed,
    startWith,
    add,
    remove,
    setSegment,
    updateNote,
    playSingle,
    playSegment,
    compareSegment,
    stopNarration,
    updateStrategy,
    setNotice,
  };
}
