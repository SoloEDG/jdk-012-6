import { useState, useRef, useEffect } from "react";
import type { Point } from "../../../shared/types";
import { approach, constrain } from "../lib/motion";

export type WalkBounds = {
  /** Returns a legal point for the given room. */
  constrain: (p: Point) => Point;
  start: Point;
  /** Initial facing direction for the room. */
  yaw?: number;
  /** Invalidates straight-line targets that are blocked in this room. */
  blocked?: (a: Point, b: Point) => boolean;
};

export function useWalker(onPosition: (p: Point) => void, bounds?: WalkBounds) {
  const room = useRef(bounds);
  room.current = bounds;
  const [position, setPosition] = useState<Point>(
    bounds?.start ?? { x: 3, z: 6.5 },
  );
  const positionRef = useRef(position);
  const target = useRef<Point | null>(null);
  const keys = useRef(new Set<string>());
  const suspended = useRef(false);
  const yaw = useRef(bounds?.yaw ?? 0);
  const callback = useRef(onPosition);
  callback.current = onPosition;
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (suspended.current) return;
      if ((e.target as HTMLElement).closest("input,textarea,select")) return;
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
        ].includes(e.key.toLowerCase())
      ) {
        e.preventDefault();
        keys.current.add(e.key.toLowerCase());
        target.current = null;
      }
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    let last = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      let p = positionRef.current;
      if (!suspended.current) {
        const k = keys.current;
        const confine = room.current?.constrain ?? constrain;
        if (target.current) {
          p = approach(p, target.current, dt, {
            constrain: confine,
            blocked: room.current?.blocked,
          });
        } else if (k.size) {
          const f =
            Number(k.has("w") || k.has("arrowup")) -
            Number(k.has("s") || k.has("arrowdown"));
          const s =
            Number(k.has("d") || k.has("arrowright")) -
            Number(k.has("a") || k.has("arrowleft"));
          const length = Math.hypot(f, s) || 1;
          p = confine({
            x:
              p.x +
              ((s * Math.cos(yaw.current) - f * Math.sin(yaw.current)) *
                dt *
                2.5) /
                length,
            z:
              p.z +
              ((-f * Math.cos(yaw.current) - s * Math.sin(yaw.current)) *
                dt *
                2.5) /
                length,
          });
        }
        if (
          Math.hypot(p.x - positionRef.current.x, p.z - positionRef.current.z) >
          0.0001
        ) {
          positionRef.current = p;
          setPosition(p);
          callback.current(p);
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);
  return {
    position,
    positionRef,
    yaw,
    go: (p: Point) => {
      target.current = p;
    },
    stop: () => {
      target.current = null;
    },
    place: (p: Point, facing?: number) => {
      target.current = null;
      keys.current.clear();
      const spot = (room.current?.constrain ?? constrain)(p);
      positionRef.current = spot;
      setPosition(spot);
      if (facing !== undefined) yaw.current = facing;
    },
    suspend: () => {
      suspended.current = true;
      keys.current.clear();
      target.current = null;
    },
    resume: () => {
      suspended.current = false;
    },
  };
}
