import type { Artwork, Point } from "../../../shared/types";
import { artworkById } from "../../../shared/catalog";

export const STUDY_LIMIT = 4;
/** One wall bay; beyond this works move to a facing wall rather than shrink. */
export const BAY_CAPACITY = 10.8;
const GAP = 1.5;
const EYE = 1.55;
/** Museum centre line for hung works. */
export const CENTRE_LINE = 1.5;

export type StudyPlacement = {
  art: Artwork;
  /** Metres, from the artwork's declared centimetre size. */
  width: number;
  height: number;
  /** Recommended stand-off for this size, in metres. */
  standoff: number;
  x: number;
  y: number;
  z: number;
  rotation: number;
  group: number;
};

export type StudyGroup = {
  index: number;
  wall: "north" | "south";
  ids: string[];
  width: number;
  /** Stand-off at which the whole band is visible. */
  distance: number;
  label: string;
  /** Standing point for looking at the whole group. */
  viewer: Point;
  yaw: number;
};

export type StudyPlan = {
  placements: StudyPlacement[];
  groups: StudyGroup[];
  room: { width: number; depth: number; height: number };
  start: Point;
  yaw: number;
  /** True when works had to be split across walls. */
  split: boolean;
};

export function displaySize(a: Artwork) {
  return { width: a.size.width / 100, height: a.size.height / 100 };
}

export function standoffFor(a: Artwork) {
  const { width, height } = displaySize(a);
  const diagonal = Math.hypot(width, height);
  return Math.round(Math.min(4, Math.max(2.6, diagonal * 1.3)) * 10) / 10;
}

export function planStudy(ids: string[]): StudyPlan {
  let buckets: Artwork[][] = [];
  const room = { width: 14, depth: 14.4, height: 4.4 };
  const arts = ids
    .map((id) => artworkById(id))
    .filter((a): a is Artwork => Boolean(a))
    .slice(0, STUDY_LIMIT);

  // Split across two facing walls only when one band cannot hold the set.
  // Balancing the widths avoids a lone work stranded on the second wall.
  const bandWidths = arts.map((a) => displaySize(a).width);
  const totalWidth =
    bandWidths.reduce((n, w) => n + w, 0) +
    GAP * Math.max(0, arts.length - 1);
  if (totalWidth <= BAY_CAPACITY || arts.length < 2) {
    buckets = arts.length ? [arts] : [];
  } else {
    // Choose the split that minimises the fuller band, preserving left-to-
    // right viewing order on each wall. A 3 + 1 split is avoided when 2 + 2
    // gives a more even pair of groups.
    let bestSplit = 1;
    let bestMax = Infinity;
    for (let split = 1; split < arts.length; split++) {
      const first =
        bandWidths.slice(0, split).reduce((n, w) => n + w, 0) +
        GAP * (split - 1);
      const second =
        bandWidths.slice(split).reduce((n, w) => n + w, 0) +
        GAP * (arts.length - split - 1);
      const worst = Math.max(first, second);
      if (worst < bestMax - 1e-6) {
        bestMax = worst;
        bestSplit = split;
      }
    }
    buckets = [arts.slice(0, bestSplit), arts.slice(bestSplit)];
  }

  const wallZ = room.depth / 2 - 0.18;
  const placements: StudyPlacement[] = [];
  const groups: StudyGroup[] = [];
  buckets.forEach((bucket, index) => {
    const wall: "north" | "south" = index % 2 === 0 ? "north" : "south";
    const rotation = wall === "north" ? 0 : Math.PI;
    const widths = bucket.map((a) => displaySize(a).width);
    const total = widths.reduce((n, w) => n + w, 0) + GAP * (bucket.length - 1);
    let cursor = -total / 2;
    bucket.forEach((art, i) => {
      const width = widths[i];
      const height = displaySize(art).height;
      placements.push({
        art,
        width,
        height,
        standoff: standoffFor(art),
        x: cursor + width / 2,
        y: CENTRE_LINE,
        z: wall === "north" ? -wallZ : wallZ,
        rotation,
        group: index,
      });
      cursor += width + GAP;
    });
    const maxStandoff = Math.max(...bucket.map(standoffFor));
    // Stand far enough back to see the whole band with breathing room: 0.74 is
    // the horizontal half-tangent the room camera keeps at every aspect ratio,
    // plus a 0.6 m margin so outer frames are not clipped at the edge. Never
    // closer than the band's own recommended distance.
    const fit = (total / 2 + 0.6) / 0.72;
    const groupDistance = Math.min(
      room.depth / 2 - 1.2,
      Math.max(maxStandoff, fit),
    );
    groups.push({
      index,
      wall,
      ids: bucket.map((a) => a.id),
      width: total,
      distance: Math.round(groupDistance * 10) / 10,
      label: `${String.fromCharCode(65 + index)} 组`,
      viewer: {
        x: 0,
        z: wall === "north" ? -wallZ + groupDistance : wallZ - groupDistance,
      },
      yaw: wall === "north" ? 0 : Math.PI,
    });
  });

  return {
    placements,
    groups,
    room,
    start: groups[0]?.viewer ?? { x: 0, z: 0 },
    yaw: 0,
    split: groups.length > 1,
  };
}

export function studyBounds(plan: StudyPlan) {
  const xLimit = plan.room.width / 2 - 0.9;
  const zLimit = plan.room.depth / 2 - 0.9;
  return {
    start: plan.start,
    constrain: (p: Point) => ({
      x: Math.max(-xLimit, Math.min(xLimit, p.x)),
      z: Math.max(-zLimit, Math.min(zLimit, p.z)),
    }),
  };
}
