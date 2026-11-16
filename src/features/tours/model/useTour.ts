import { useState } from "react";
import type { TourState } from "../../../shared/types";
import { routes } from "../../../shared/catalog";
import { tourTarget, tourRoute } from "../lib/routeProgress";
const initial: TourState = { routeId: null, step: 0, phase: "idle" };
export function useTour() {
  const [state, setState] = useState<TourState>(initial);
  return {
    state,
    target: tourTarget(state),
    start: (id: string) => {
      if (routes.some((r) => r.id === id))
        setState({ routeId: id, step: 0, phase: "walking" });
    },
    arrive: () =>
      setState((t) =>
        t.phase === "walking" ? { ...t, phase: "listening" } : t,
      ),
    next: () =>
      setState((t) => {
        const r = tourRoute(t);
        if (!r) return t;
        return t.step + 1 >= r.stops.length
          ? { ...t, phase: "done", pausedFrom: undefined }
          : { ...t, step: t.step + 1, phase: "walking", pausedFrom: undefined };
      }),
    /** Suspends the tour in place, keeping route, step and the mode to return to. */
    pause: () =>
      setState((t) =>
        t.phase === "walking" || t.phase === "listening"
          ? { ...t, phase: "paused", pausedFrom: t.phase }
          : t,
      ),
    resume: () =>
      setState((t) =>
        t.phase === "paused"
          ? { ...t, phase: t.pausedFrom ?? "walking", pausedFrom: undefined }
          : t,
      ),
    /** Re-suspends a resumed tour without losing the checkpoint. */
    suspend: () =>
      setState((t) =>
        t.phase === "walking" || t.phase === "listening"
          ? { ...t, phase: "paused", pausedFrom: t.phase }
          : t,
      ),
    stop: () => setState(initial),
  };
}
