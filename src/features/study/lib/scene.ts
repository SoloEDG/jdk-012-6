import * as THREE from "three";
import type { Artwork } from "../../../shared/types";
import { artTexture, plaqueTexture } from "../../space/lib/artTexture";
import { disposeScene } from "../../space/lib/buildScene";
import type { StudyPlan } from "./layout";

/**
 * The study room keeps every work at its declared 1:1 size. Textures start at
 * a shared low resolution; only the work under examination is refined on
 * demand. The previous high-resolution map is released immediately, so the
 * extra GPU memory never scales with the number of works on the walls.
 */
const EYE = 1.55;

export function buildStudyScene(
  plan: StudyPlan,
  baseEdge: number,
  detailEdge: number,
) {
  const { width, depth, height } = plan.room;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#cfcbc0");
  scene.fog = new THREE.Fog("#cfcbc0", 12, 30);
  scene.add(new THREE.HemisphereLight("#fffaee", "#6d6254", 2.4));
  const sun = new THREE.DirectionalLight("#fff3dd", 2.1);
  sun.position.set(-4, 8, 5);
  scene.add(sun);
  const top = new THREE.DirectionalLight("#e8eeff", 0.6);
  top.position.set(3, 6, -6);
  scene.add(top);

  const slab = (
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    color: string,
    roughness = 0.86,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({ color, roughness }),
    );
    mesh.position.set(x, y, z);
    scene.add(mesh);
    return mesh;
  };

  slab(width, 0.14, depth, 0, -0.07, 0, "#a9a49a");
  slab(width, 0.3, depth, 0, height + 0.1, 0, "#e4dfd3");
  slab(width + 0.3, height, 0.25, 0, height / 2, -depth / 2 - 0.02, "#ded8cb");
  slab(width + 0.3, height, 0.25, 0, height / 2, depth / 2 + 0.02, "#ded8cb");
  slab(0.25, height, depth, -width / 2 - 0.02, height / 2, 0, "#d6d0c3");
  slab(0.25, height, depth, width / 2 + 0.02, height / 2, 0, "#d6d0c3");

  for (let x = -width / 2 + 2; x <= width / 2 - 2; x += 3.4) {
    slab(0.07, 0.008, depth, x, 0.005, 0, "#8f8a80");
  }
  for (let z = -depth / 2 + 1.6; z <= depth / 2 - 1; z += 3.1) {
    slab(0.008, 0.008, 0.008, 0, 0.006, z, "#8f8a80");
  }
  for (let x = -width / 2 + 2.5; x <= width / 2 - 2; x += 4.2) {
    slab(1.5, 0.03, 0.16, x, height - 0.07, 0, "#fdf7e7");
    const light = new THREE.PointLight("#fff4d9", 12, 9, 2);
    light.position.set(x, height - 0.4, 0);
    scene.add(light);
  }

  // A slim datum strip on the floor marks the room's centre without blocking
  // either viewing band.
  slab(width - 1, 0.01, 0.05, 0, 0.008, 0, "#a49a84");

  type Record = {
    art: Artwork;
    image: THREE.Mesh;
    frame: THREE.Mesh;
    base: THREE.CanvasTexture;
    detail: THREE.CanvasTexture | null;
    aspect: number;
  };
  const records: Record[] = [];
  const frames: THREE.Mesh[] = [];

  for (const p of plan.placements) {
    const group = new THREE.Group();
    group.position.set(p.x, p.y, p.z);
    group.rotation.y = p.rotation;

    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(p.width + 0.16, p.height + 0.16, 0.09),
      new THREE.MeshStandardMaterial({
        color: "#39362e",
        roughness: 0.6,
        metalness: 0.12,
      }),
    );
    group.add(frame);

    const base = artTexture(p.art, {
      maxEdge: baseEdge,
      aspect: p.width / p.height,
    });
    const image = new THREE.Mesh(
      new THREE.PlaneGeometry(p.width, p.height),
      new THREE.MeshBasicMaterial({
        map: base,
        toneMapped: false,
        transparent: true,
      }),
    );
    image.position.z = 0.052;
    image.userData.artworkId = p.art.id;
    group.add(image);
    frames.push(image);

    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(0.78, 0.24),
      new THREE.MeshBasicMaterial({
        map: plaqueTexture([
          p.art.title,
          `${p.art.artist} · ${p.art.year}`,
          `原作 ${p.art.size.width} × ${p.art.size.height} cm`,
        ]),
      }),
    );
    // Labels hang centred beneath the work. The clamp keeps the plaque above
    // 0.45 m in world space (group origin is at eye height) rather than
    // floating over the image for tall works.
    const labelY = Math.max(-p.height / 2 - 0.32, -EYE + 0.5);
    label.position.set(0, labelY, 0.06);
    group.add(label);

    scene.add(group);
    records.push({
      art: p.art,
      image,
      frame,
      base,
      detail: null,
      aspect: p.width / p.height,
    });
  }

  // Group labels and recommended distance marks make the grouping explicit.
  for (const g of plan.groups) {
    const label = new THREE.Mesh(
      new THREE.PlaneGeometry(1.7, 0.4),
      new THREE.MeshBasicMaterial({
        map: plaqueTexture([
          `${g.label} · ${g.ids.length} 件作品`,
          `组视图 ${g.distance} m · 单件 ${(() => {
            const stands = g.ids.map(
              (id) =>
                plan.placements.find((p) => p.art.id === id)?.standoff ?? 2.6,
            );
            const low = Math.min(...stands);
            const high = Math.max(...stands);
            return low === high ? `${low} m` : `${low}–${high} m`;
          })()}`,
          "作品按真实尺寸呈现，未缩小",
        ], {
          background: "#2b2b26",
          heading: "#e8ddc0",
          body: "#bdbba6",
          align: "center",
        }),
        transparent: true,
        opacity: 0.92,
      }),
    );
    const z = g.wall === "north" ? -depth / 2 + 0.14 : depth / 2 - 0.14;
    label.position.set(0, 3.55, z + (g.wall === "north" ? 0.01 : -0.01));
    label.rotation.y = g.wall === "north" ? 0 : Math.PI;
    scene.add(label);

    const mark = new THREE.Mesh(
      new THREE.PlaneGeometry(Math.min(g.width + 1.4, width - 2), 0.035),
      new THREE.MeshBasicMaterial({
        color: "#b19a6c",
        transparent: true,
        opacity: 0.55,
      }),
    );
    mark.rotation.x = -Math.PI / 2;
    mark.position.set(0, 0.012, g.viewer.z);
    scene.add(mark);
  }

  let activeId: string | null = null;
  let detailedArt: string | null = null;

  const setActive = (id: string | null) => {
    activeId = id;
    for (const r of records) {
      const frameMaterial = r.frame.material as THREE.MeshStandardMaterial;
      frameMaterial.emissive.set(id === r.art.id ? "#8a6f38" : "#000000");
      frameMaterial.emissiveIntensity = id === r.art.id ? 0.55 : 0;
      const material = r.image.material as THREE.MeshBasicMaterial;
      material.opacity = !activeId || activeId === r.art.id ? 1 : 0.78;
    }
  };

  const setDetail = (id: string | null) => {
    if (id === detailedArt) return;
    detailedArt = id;
    for (const r of records) {
      const material = r.image.material as THREE.MeshBasicMaterial;
      if (r.detail) {
        r.detail.dispose();
        r.detail = null;
      }
      if (id === r.art.id) {
        r.detail = artTexture(r.art, {
          maxEdge: detailEdge,
          aspect: r.aspect,
        });
        r.detail.anisotropy = 8;
        material.map = r.detail;
      } else {
        material.map = r.base;
      }
      material.needsUpdate = true;
    }
  };

  const dispose = () => {
    for (const r of records) r.detail?.dispose();
    disposeScene(scene);
  };

  return {
    scene,
    frames,
    setDetail,
    setActive,
    dispose,
    counts: () => ({ works: records.length, detail: detailedArt ? 1 : 0 }),
    placements: plan.placements.map((p) => ({
      id: p.art.id,
      x: p.x,
      z: p.z,
      standoff: p.standoff,
      rotation: p.rotation,
    })),
  };
}
