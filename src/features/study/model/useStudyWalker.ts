import { useEffect, useRef } from "react";
import type { Point } from "../../../shared/types";
import { useWalker } from "../../space";
import type { StudyPlan, StudyPlacement } from "../lib/layout";
import { studyBounds } from "../lib/layout";

/**
 * Stands at the published viewing distance for a single work, or at the
 * group's viewing mark when several works share a wall.
 */
export function viewingSpot(
  plan: StudyPlan,
  placement: StudyPlacement,
): { point: Point; yaw: number } {
  const xLimit = plan.room.width / 2 - 0.9;
  const zLimit = plan.room.depth / 2 - 0.9;
  const wallZ = plan.room.depth / 2 - 0.18;
  const side = placement.rotation === 0 ? -1 : 1;
  return {
    // Stand at the distance published for this work's own size, never at a
    // compromise distance derived from the group.
    point: {
      x: Math.max(-xLimit, Math.min(xLimit, placement.x)),
      z: Math.max(-zLimit, Math.min(zLimit, side * (wallZ - placement.standoff))),
    },
    yaw: placement.rotation,
  };
}

export function useStudyWalker(onPosition: (p: Point) => void, plan: StudyPlan) {
  const bounds = studyBounds(plan);
  const walker = useWalker(onPosition, {
    ...bounds,
    yaw: plan.yaw,
  });
  const planRef = useRef(plan);
  planRef.current = plan;
  const arrived = useRef<(() => void) | null>(null);
  const pendingTarget = useRef<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => {
      const targetId = pendingTarget.current;
      if (targetId === null) return;
      const placement = planRef.current.placements.find(
        (p) => p.art.id === targetId,
      );
      if (!placement) return;
      const spot = viewingSpot(planRef.current, placement).point;
      if (
        Math.hypot(walker.position.x - spot.x, walker.position.z - spot.z) <
        0.25
      ) {
        const done = arrived.current;
        arrived.current = null;
        pendingTarget.current = null;
        done?.();
      }
    }, 120);
    return () => window.clearInterval(timer);
  }, [walker.position]);

  return {
    ...walker,
    reset: () => {
      pendingTarget.current = null;
      arrived.current = null;
      walker.place(plan.start, plan.yaw);
    },
    goTo: (id: string, onArrive?: () => void) => {
      const placement = plan.placements.find((p) => p.art.id === id);
      if (!placement) return;
      const spot = viewingSpot(plan, placement);
      walker.yaw.current = spot.yaw;
      walker.go(spot.point);
      pendingTarget.current = id;
      arrived.current = onArrive ?? null;
    },
  };
}
