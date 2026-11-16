import type { GalleryDocument } from "../../../shared/types";
import { artworkById } from "../../../shared/catalog";

export function recapStats(d: GalleryDocument) {
  return {
    seen: d.visits.filter((v) => v.seconds >= 2).length,
    seconds: Math.round(d.visits.reduce((n, v) => n + v.seconds, 0)),
    saved: d.favorites.length,
    compared: d.comparisons.filter(
      (c) => c.ids.filter((id) => artworkById(id)).length >= 2,
    ).length,
  };
}

export function createRecap(d: GalleryDocument): string {
  const stats = recapStats(d);
  const comparisons = d.comparisons.filter(
    (c) => c.ids.filter((id) => artworkById(id)).length >= 2,
  );
  return [
    "余境 · 我的参观回顾",
    `观看 ${stats.seen} 件作品 · 停留 ${stats.seconds} 秒 · 并置比较 ${stats.compared} 组`,
    "",
    ...d.favorites.map((id) => {
      const a = artworkById(id);
      return a
        ? `${a.title} / ${a.artist}
原作 ${a.size.width} × ${a.size.height} cm · ${a.medium}
${d.notes[id] || "未添加感想"}
停留 ${Math.round(d.visits.find((v) => v.id === id)?.seconds || 0)} 秒`
        : "";
    }),
    ...(comparisons.length
      ? [
          "并置比较记录（每次只在回顾里保留关系，不重复计入参观时长）",
          ...comparisons.map((c) => {
            const names = c.ids
              .map((id) => artworkById(id)?.title)
              .filter(Boolean)
              .join(" ↔ ");
            const sizes = c.ids
              .map((id) => {
                const a = artworkById(id);
                return a ? `${a.title} ${a.size.width}×${a.size.height}cm` : "";
              })
              .filter(Boolean)
              .join("；");
            return `${names}
对照段落：第 ${c.segment + 1} 段
关系：${c.note || "未写下比较笔记"}
尺寸：${sizes}`;
          }),
        ]
      : []),
  ].join("\n\n");
}
