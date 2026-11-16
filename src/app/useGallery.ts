import { useEffect, useRef, useState } from "react";
import { useWalker, distance, viewingPoint } from "../features/space";
import { useCatalog } from "../features/catalog";
import { useNarration } from "../features/narration";
import { useTour } from "../features/tours";
import { useCollection } from "../features/collection";
import { useStudy } from "../features/study";
import { artworkById } from "../shared/catalog";

export function useGallery() {
  const catalog = useCatalog();
  const tour = useTour();
  const collection = useCollection();
  const walker = useWalker(catalog.observe);
  const [inStudy, setInStudy] = useState(false);
  const narration = useNarration(() => {
    if (tour.state.phase === "listening") tour.next();
  });
  const study = useStudy(collection.document, collection);
  const resumeNarration = useRef(false);

  /** Explicit navigation: highlights the work now and pins it until arrival. */
  const goTo = (id: string) => {
    const a = artworkById(id);
    if (!a) return;
    catalog.pin(id);
    walker.go(viewingPoint(a.position, a.facing));
    walker.yaw.current = a.facing;
  };
  useEffect(() => {
    if (inStudy) return;
    if (tour.state.phase === "walking" && tour.target) goTo(tour.target);
  }, [tour.state.phase, tour.target, inStudy]);
  useEffect(() => {
    if (inStudy) return;
    if (tour.state.phase !== "walking" || !tour.target) return;
    const a = artworkById(tour.target)!;
    if (distance(walker.position, viewingPoint(a.position, a.facing)) < 0.15) {
      tour.arrive();
      narration.play(a.id);
    }
  }, [walker.position, tour.state.phase, tour.target, inStudy]);

  const enterStudy = () => {
    // Pause the hall tour and narration as a checkpoint, not a reset. When the
    // tour is already parked, keep whatever resume intent it carried.
    if (tour.state.phase === "walking" || tour.state.phase === "listening")
      resumeNarration.current =
        tour.state.phase === "listening" && narration.state.playing;
    tour.suspend();
    walker.stop();
    walker.suspend();
    narration.pause();
    study.enterRoom();
    setInStudy(true);
  };

  const exitStudy = () => {
    // The hall tour stays parked at its checkpoint. The visitor decides when
    // to continue; its route, step and narration position are all intact.
    study.leaveRoom();
    setInStudy(false);
    walker.resume();
  };

  const resumeTour = () => {
    if (tour.state.phase !== "paused") return;
    const wasListening = tour.state.pausedFrom === "listening";
    const restore =
      resumeNarration.current && wasListening && Boolean(tour.target);
    resumeNarration.current = false;
    resumeNarrationPending.current = restore;
    tour.resume();
  };

  // A tour resumed at a listening stop should carry on from the passage the
  // hall player was on when the tour was suspended. The study room's own
  // narration is a separate player and never writes to this state.
  const resumeNarrationPending = useRef(false);
  useEffect(() => {
    if (inStudy) return;
    if (tour.state.phase !== "listening") return;
    if (!resumeNarrationPending.current) return;
    resumeNarrationPending.current = false;
    const target = tour.target;
    if (!target) return;
    window.setTimeout(() => narration.play(target), 0);
  }, [tour.state.phase, tour.target, inStudy]);

  const current = useRef({
    nearby: inStudy ? null : catalog.nearby,
    record: collection.record,
  });
  current.current = {
    nearby: inStudy ? null : catalog.nearby,
    record: collection.record,
  };
  useEffect(() => {
    const t = setInterval(() => {
      if (current.current.nearby)
        current.current.record(current.current.nearby, 1);
    }, 1000);
    return () => clearInterval(t);
  }, []);
  return {
    catalog,
    tour,
    collection,
    walker,
    narration,
    study,
    inStudy,
    enterStudy,
    exitStudy,
    resumeTour,
    goTo,
    pauseTour: () => {
      tour.pause();
      walker.stop();
      narration.pause();
    },
    stopTour: () => {
      resumeNarration.current = false;
      tour.stop();
      walker.stop();
      narration.pause();
    },
    nextTour: () => {
      resumeNarration.current = false;
      walker.stop();
      narration.pause();
      tour.next();
    },
  };
}
