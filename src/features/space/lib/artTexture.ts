import * as THREE from "three";
import type { Artwork } from "../../../shared/types";

export type TextureOptions = {
  /** Longest edge in pixels. */
  maxEdge?: number;
  /** Overrides the canvas aspect ratio (width / height). */
  aspect?: number;
};

/**
 * Paints a generated artwork onto a canvas. The drawing is resolution
 * independent so the main hall and the study room can request different
 * texture budgets without changing the composition.
 */
export function artCanvas(
  a: Artwork,
  { maxEdge = 850, aspect: givenAspect }: TextureOptions = {},
): HTMLCanvasElement {
  const aspect = givenAspect ?? a.size.width / a.size.height;
  const w = aspect >= 1 ? maxEdge : Math.max(1, Math.round(maxEdge * aspect));
  const h = aspect >= 1 ? Math.max(1, Math.round(maxEdge / aspect)) : maxEdge;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  const unit = Math.min(w, h);
  g.fillStyle = "#e3dfd4";
  g.fillRect(0, 0, w, h);
  let seed = Number(a.id.slice(1)) * 7919;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };

  if (a.id === "a1") {
    for (let n = 0; n < 11; n++) {
      g.beginPath();
      g.moveTo(0, h);
      for (let x = 0; x <= w; x += Math.max(2, w / 175))
        g.lineTo(
          x,
          h * (0.247 + n * 0.0565) +
            Math.sin((x / w) * (700 / 115) + n) * h * 0.106 +
            Math.sin((x / w) * (700 / 40) + n) * h * 0.0235,
        );
      g.lineTo(w, h);
      g.fillStyle = [
        "#d1d9c9",
        "#bac8b6",
        "#a6bca8",
        "#88a18e",
        "#678a79",
        "#436d60",
      ][n % 6];
      g.fill();
    }
  } else if (a.id === "a2") {
    g.fillStyle = "#b6b0c6";
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 100; n++) {
      g.beginPath();
      for (let x = 0; x <= w; x += Math.max(2, w / 140)) {
        const y =
          h * (0.235 + n * 0.00824) +
          Math.sin((x / w) * (700 / 130) + n / 14) * h * 0.1;
        x ? g.lineTo(x, y) : g.moveTo(x, y);
      }
      g.strokeStyle = `rgba(244,236,255,${0.1 + rnd() * 0.5})`;
      g.stroke();
    }
  } else if (a.id === "a3") {
    g.fillStyle = "#e2c4a5";
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 18; n++) {
      g.fillStyle = ["#c66d45", "#edab70", "#8b4939", "#e6ce9f"][n % 4];
      g.fillRect(
        rnd() * w * 0.93,
        rnd() * h * 0.94,
        w * ((30 + rnd() * 230) / 700),
        h * ((40 + rnd() * 330) / 850),
      );
    }
  } else if (a.id === "a4") {
    g.fillStyle = "#a2bac0";
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 100; n++) {
      const x = rnd() * w,
        y = rnd() * h;
      const bw = w * ((20 + rnd() * 80) / 700);
      const bh = h * ((40 + rnd() * 140) / 850);
      g.fillStyle = ["#29464f", "#527983", "#d5d8c9"][n % 3];
      g.fillRect(x, y, bw, bh);
      g.strokeStyle = "#c2dddd";
      g.strokeRect(x, y, bw, h * (65 / 850));
    }
  } else if (a.id === "a5") {
    g.fillStyle = "#18261f";
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 3500; n++) {
      const t = rnd() * Math.PI * 2,
        r = Math.sqrt(rnd()) * unit * 0.4;
      g.fillStyle = ["#c7d297", "#768953", "#d8b76d"][n % 3];
      g.globalAlpha = rnd();
      g.beginPath();
      g.arc(
        w / 2 + Math.cos(t) * r,
        h / 2 + Math.sin(t) * r * 1.2,
        rnd() * unit * 0.0036,
        0,
        Math.PI * 2,
      );
      g.fill();
    }
    g.globalAlpha = 1;
  } else {
    g.fillStyle = "#c9bcab";
    g.fillRect(0, 0, w, h);
    for (let n = 0; n < 9; n++) {
      g.save();
      g.translate(w / 2, h * (420 / 850));
      g.rotate(n * 0.22);
      g.strokeStyle = n % 2 ? "#736b62" : "#eee4d8";
      g.lineWidth = unit * (18 / 700);
      g.beginPath();
      g.ellipse(
        0,
        0,
        unit * ((95 + n * 15) / 700),
        unit * (240 / 700),
        0,
        0,
        Math.PI * 2,
      );
      g.stroke();
      g.restore();
    }
  }
  return c;
}

export function artTexture(
  a: Artwork,
  options: TextureOptions = {},
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(artCanvas(a, options));
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** Small paper label used for the study-room plaques. */
export function plaqueTexture(
  lines: string[],
  style: {
    background?: string;
    heading?: string;
    body?: string;
    align?: CanvasTextAlign;
  } = {},
): THREE.CanvasTexture {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 160;
  const g = c.getContext("2d")!;
  g.fillStyle = style.background ?? "#f2eee3";
  g.fillRect(0, 0, c.width, c.height);
  const x = style.align === "center" ? c.width / 2 : 24;
  g.textAlign = style.align ?? "left";
  g.fillStyle = style.heading ?? "#4b473d";
  g.font = "500 34px 'Noto Serif SC', serif";
  g.fillText(lines[0] || "", x, 58);
  g.fillStyle = style.body ?? "#7d7668";
  g.font = "20px sans-serif";
  g.fillText(lines[1] || "", x, 94);
  g.fillText(lines[2] || "", x, 124);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
