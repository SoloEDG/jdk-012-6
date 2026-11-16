import { useRef, useState } from "react";
import type { Point } from "../../../shared/types";
import { artworkById } from "../../../shared/catalog";
import { nearbyArtwork } from "../lib/proximity";
export function useCatalog() {
  const [active, setActive] = useState<string | null>("a1");
  const [nearby, setNearby] = useState<string | null>(null);
  // An explicit choice outranks proximity until the visitor actually arrives,
  // so walking past another work cannot silently swap what is being read or
  // narrated.
  const pinned = useRef<string | null>(null);
  return {
    active,
    nearby,
    /** Navigate to a work: show it now and keep it until the visitor arrives. */
    pin: (id: string | null) => {
      pinned.current = id;
      setActive(id);
    },
    observe: (p: Point) => {
      const id = nearbyArtwork(p);
      setNearby(id);
      const target = pinned.current;
      if (target) {
        const art = artworkById(target);
        if (art) {
          const arrived =
            Math.hypot(art.position.x - p.x, art.position.z - p.z) < 2.8;
          // Release the pin only once the visitor has arrived and then walks
          // somewhere else; otherwise proximity takes over again.
          if (arrived) pinned.current = null;
          return;
        }
        return;
      }
      if (id) setActive(id);
    },
  };
}
