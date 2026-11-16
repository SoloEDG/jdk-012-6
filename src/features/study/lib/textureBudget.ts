import type { TextureStrategy } from "../model/useStudy";

/**
 * The study room keeps sizes at 1:1, so the only memory lever is texture
 * resolution. `detail` keeps a shared low-resolution map on every work and
 * promotes a single focused work; `smooth` raises the shared map so switching
 * is instant but close viewing is softer. Neither option changes scale.
 */
export function textureBudget(count: number, strategy: TextureStrategy) {
  const base = strategy === "detail" ? 620 : 1040;
  const detail = strategy === "detail" ? (count > 0 ? 1536 : 0) : 0;
  const sharedMb = (count * base * base * 4) / (1024 * 1024);
  const detailMb = detail ? (detail * detail * 4) / (1024 * 1024) : 0;
  return {
    base,
    detail,
    sharedMb: Math.round(sharedMb * 10) / 10,
    peakMb: Math.round((sharedMb + detailMb) * 10) / 10,
    label:
      strategy === "detail"
        ? `共享 ${base}px · 聚焦 ${detail}px，切换即释放`
        : `每件 ${base}px · 切换无需加载`,
  };
}
