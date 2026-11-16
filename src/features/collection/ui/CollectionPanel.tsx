import { Heart, Download, ArrowUpRight, Columns2, ArrowLeftRight } from "lucide-react";
import type { GalleryDocument } from "../../../shared/types";
import { artworkById } from "../../../shared/catalog";
import { recapStats, createRecap } from "../lib/recap";
import { comparisonKey } from "../../../shared/comparisons";
import { downloadRecap } from "../lib/download";
export function CollectionPanel({
  document,
  onSelect,
  onNote,
  onToggle,
  onStudy,
  onStudyWith,
}: {
  document: GalleryDocument;
  onSelect: (id: string) => void;
  onNote: (id: string, text: string) => void;
  onToggle: (id: string) => void;
  onStudy: () => void;
  onStudyWith: (id: string) => void;
}) {
  const stats = recapStats(document);
  const studies = document.studyIds.filter((id) => artworkById(id));
  const comparisons = document.comparisons.filter(
    (c) => c.ids.filter((id) => artworkById(id)).length >= 2,
  );
  return (
    <div className="collection-panel">
      <div className="eyebrow">YOUR PERSONAL GALLERY</div>
      <h2>把共鸣，留在这里。</h2>
      <div className="stats">
        <span>
          <strong>{stats.seen}</strong>已观看
        </span>
        <span>
          <strong>{stats.saved}</strong>已收藏
        </span>
        <span>
          <strong>{Math.floor(stats.seconds / 60)}′</strong>停留时长
        </span>
      </div>
      {document.favorites.length === 0 ? (
        <div className="empty">
          <Heart size={28} />
          <p>遇见喜欢的作品，点亮一颗心。</p>
          <small>你的参观故事，将从这里开始。</small>
        </div>
      ) : (
        document.favorites.map((id) => {
          const a = artworkById(id);
          if (!a) return null;
          return (
            <article className="saved-card" key={id}>
              <button className="saved-title" onClick={() => onSelect(id)}>
                {a.title}
                <ArrowUpRight size={15} />
              </button>
              <small>
                {a.artist} · {a.year}
              </small>
              <textarea
                aria-label={"感想-" + a.title}
                placeholder="写下此刻的感受…"
                value={document.notes[id] || ""}
                onChange={(e) => onNote(id, e.target.value)}
                maxLength={1000}
              />
              <div className="saved-card-actions">
                <button className="text-button" onClick={() => onStudyWith(id)}>
                  <Columns2 size={13} />
                  以这件为起点并置
                </button>
                <button className="text-button" onClick={() => onToggle(id)}>
                  移出收藏
                </button>
              </div>
            </article>
          );
        })
      )}
      {document.favorites.length >= 2 && (
        <button
          className="primary full study-cta"
          onClick={onStudy}
          title="保持原作尺寸，把收藏中的作品并置比较"
        >
          <Columns2 size={16} />
          {studies.length >= 2
            ? `继续并置研究 · ${studies.length} 件`
            : "开始并置研究"}
        </button>
      )}
      {comparisons.length > 0 && (
        <div className="collection-comparisons">
          <div className="section-title">
            <ArrowLeftRight size={15} />
            <span>比较笔记</span>
            <small>{comparisons.length} 组</small>
          </div>
          {comparisons.map((c) => (
            <article key={comparisonKey(c.ids)}>
              <strong>
                {c.ids
                  .map((id) => artworkById(id)?.title)
                  .filter(Boolean)
                  .join(" ↔ ")}
              </strong>
              <small>第 {c.segment + 1} 段对照 · 不重复计入参观时长</small>
              <p>{c.note || "尚未写下比较笔记"}</p>
            </article>
          ))}
        </div>
      )}
      <button
        className="primary full"
        disabled={!stats.saved}
        onClick={() => downloadRecap(createRecap(document))}
      >
        <Download size={16} />
        生成个人参观回顾
      </button>
    </div>
  );
}
