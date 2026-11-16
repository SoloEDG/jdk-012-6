import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { Point } from "../../../shared/types";
import { buildStudyScene } from "../lib/scene";
import type { StudyPlan } from "../lib/layout";
import type { TextureStrategy } from "../model/useStudy";

export function StudyViewport({
  plan,
  position,
  yaw,
  strategy,
  focusId,
  onSelect,
  onNear,
}: {
  plan: StudyPlan;
  position: React.RefObject<Point>;
  yaw: React.RefObject<number>;
  strategy: TextureStrategy;
  focusId: string | null;
  onSelect: (id: string) => void;
  onNear?: (id: string | null) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const api = useRef<ReturnType<typeof buildStudyScene> | null>(null);
  const select = useRef(onSelect);
  select.current = onSelect;
  const nearNotify = useRef(onNear);
  nearNotify.current = onNear;

  useEffect(() => {
    const el = root.current!;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setError("当前设备无法启动三维画面，可改用并置档案查看。");
      return;
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    const baseEdge = strategy === "detail" ? 620 : 1040;
    const detailEdge = strategy === "detail" ? 1536 : 1024;
    const study = buildStudyScene(plan, baseEdge, detailEdge);
    api.current = study;
    // Fixed horizontal field of view: the layout's group stand-off assumes a
    // set horizontal angle, so portrait phones show the same wall width as a
    // desktop instead of cropping the outer works.
    const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 70);
    const HORIZONTAL_HALF_TAN = 0.74;
    const resize = () => {
      renderer.setSize(el.clientWidth, el.clientHeight);
      camera.aspect = el.clientWidth / el.clientHeight;
      camera.fov = THREE.MathUtils.radToDeg(
        2 * Math.atan(HORIZONTAL_HALF_TAN / camera.aspect),
      );
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();

    let frame = 0;
    let dragging = false,
      moved = 0,
      pressY = 0,
      last = 0;
    let pitch = -0.02;
    const down = (e: PointerEvent) => {
      dragging = true;
      last = e.clientX;
      pressY = e.clientY;
      moved = 0;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientX - last;
      yaw.current -= delta * 0.0045;
      const dy = e.clientY - pressY;
      pitch = Math.max(-0.5, Math.min(0.45, -0.02 + dy * 0.0022));
      moved += Math.abs(delta) + Math.abs(dy);
      last = e.clientX;
      pressY = e.clientY;
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      if (moved >= 5) return;
      const rect = el.getBoundingClientRect();
      const ray = new THREE.Raycaster();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(study.frames)[0];
      if (hit) select.current(hit.object.userData.artworkId);
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);

    const tick = (now: number) => {
      camera.position.set(position.current.x, 1.55, position.current.z);
      camera.rotation.set(pitch, yaw.current, 0);
      renderer.render(study.scene, camera);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      renderer.domElement.removeEventListener("pointerdown", down);
      renderer.domElement.removeEventListener("pointermove", move);
      renderer.domElement.removeEventListener("pointerup", up);
      study.dispose();
      api.current = null;
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [plan, position, yaw, strategy]);

  // Which work receives the single high-resolution map: the one the visitor
  // stands closest to, falling back to the selected object when the room is
  // viewed as a group. Only one map is ever promoted; releasing the previous
  // one happens inside setDetail.
  const [nearId, setNearId] = useState<string | null>(null);
  useEffect(() => {
    if (strategy !== "detail") return;
    let ticking = false;
    const sample = () => {
      ticking = false;
      const a = api.current;
      if (!a) return;
      const p = position.current;
      let best: string | null = null;
      let bestScore = Infinity;
      const facing = yaw.current;
      for (const item of a.placements) {
        const d = Math.hypot(item.x - p.x, item.z - p.z);
        // Is the work on the side of the room the visitor faces? Compare the
        // direction from visitor to work with the camera's forward vector.
        const toArt = Math.atan2(item.x - p.x, item.z - p.z);
        let angle = Math.abs(
          ((toArt - facing + Math.PI * 3) % (Math.PI * 2)) - Math.PI,
        );
        const seen = angle < Math.PI / 2.6;
        // Within reach of the work's own recommended distance, closeness wins;
        // otherwise the selected work keeps the detail texture.
        const score =
          seen && d <= item.standoff + 1.4 ? d : item.standoff + 2.6;
        if (score < bestScore) {
          bestScore = score;
          best = item.id;
        }
      }
      setNearId(best);
      nearNotify.current?.(best);
    };
    const timer = window.setInterval(() => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(sample);
      }
    }, 240);
    return () => window.clearInterval(timer);
  }, [strategy, position, yaw]);

  useEffect(() => {
    if (strategy !== "detail") {
      api.current?.setDetail(null);
      return;
    }
    const id = nearId ?? focusId;
    if (!id) {
      api.current?.setDetail(null);
      return;
    }
    // Deferred so walking past works does not allocate and release maps on
    // every step; only a sustained stop refines.
    const timer = window.setTimeout(() => api.current?.setDetail(id), 220);
    return () => window.clearTimeout(timer);
  }, [nearId, focusId, strategy]);

  useEffect(() => {
    api.current?.setActive(focusId);
  }, [focusId]);

  return (
    <div className="viewport study-viewport" ref={root}>
      {error && <div className="webgl-error">{error}</div>}
    </div>
  );
}
