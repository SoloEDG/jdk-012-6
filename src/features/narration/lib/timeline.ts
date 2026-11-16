import type { Artwork } from "../../../shared/types";
export function captionAt(a: Artwork, elapsed: number): string {
  // The epsilon keeps a segment's last instant inside that segment rather
  // than flashing the next passage at the exact boundary.
  const index = Math.max(
    0,
    Math.floor((elapsed / a.duration) * a.transcript.length - 1e-9),
  );
  return a.transcript[Math.min(a.transcript.length - 1, index)];
}
export function formatTime(seconds: number): string {
  return `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0")}`;
}

/** Consent-aligned segment windows; a work without this segment returns null. */
export function segmentWindow(
  a: Artwork,
  segment: number,
): { start: number; end: number } | null {
  if (segment < 0 || segment >= a.transcript.length) return null;
  return {
    start: (segment / a.transcript.length) * a.duration,
    end: ((segment + 1) / a.transcript.length) * a.duration,
  };
}
export function segmentLabel(
  a: Artwork | null | undefined,
  segment: number,
): string {
  if (!a) return "未选择作品";
  const total = a.transcript.length;
  if (segment < 0 || segment >= total) return "无此段落";
  return `第 ${segment + 1} / ${total} 段`;
}
