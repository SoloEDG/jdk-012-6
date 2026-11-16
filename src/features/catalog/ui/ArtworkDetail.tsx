import { useEffect, useRef } from "react";
import { Heart, Headphones, ArrowUpRight, Columns2, Ruler } from "lucide-react";
import { artworkById } from "../../../shared/catalog";
import { artCanvas } from "../../space/lib/artTexture";
export function ArtworkDetail({
  id,
  saved,
  onFavorite,
  onListen,
  onGo,
  onCompare,
}: {
  id: string | null;
  saved: boolean;
  onFavorite: () => void;
  onListen: () => void;
  onGo: () => void;
  onCompare: () => void;
}) {
  const a = artworkById(id);
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const node = canvas.current;
    if (!node || !a) return;
    const ctx = node.getContext("2d");
    if (!ctx) return;
    const painted = artCanvas(a, {
      maxEdge: 620,
      aspect: a.size.width / a.size.height,
    });
    node.width = painted.width;
    node.height = painted.height;
    ctx.drawImage(painted, 0, 0);
  }, [a?.id]);
  if (!a) return <div>靠近一件作品，开始探索。</div>;
  return (
    <section className="detail">
      <div className="eyebrow">
        ARTWORK INSIGHT <span>作品档案</span>
      </div>
      <div className="art-preview real">
        <canvas
          ref={canvas}
          aria-label={a.title + " 作品图"}
          // Every preview is drawn at 1 cm = 1 px, so works keep their
          // relative sizes across the archive as well as in the rooms.
          style={{ width: `${a.size.width}px` }}
        />
        <span>{a.en}</span>
      </div>
      <div className="detail-heading">
        <h2>{a.title}</h2>
        <button
          className={saved ? "icon-button saved" : "icon-button"}
          aria-label={saved ? "取消收藏" : "收藏作品"}
          onClick={onFavorite}
        >
          <Heart size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="artist">
        {a.artist} <span>/</span> {a.year}
      </p>
      <p className="medium">{a.medium}</p>
      <p className="art-size">
        <Ruler size={12} />
        原作 {a.size.width} × {a.size.height} cm · 档案内同比例预览（1 cm ≈ 1 px）
      </p>
      <p className="description">{a.description}</p>
      <div className="detail-actions">
        <button className="primary" onClick={onListen}>
          <Headphones size={16} />
          收听作品讲解
        </button>
        <button className="text-button" onClick={onGo}>
          前往作品
          <ArrowUpRight size={16} />
        </button>
        {saved && (
          <button className="text-button" onClick={onCompare}>
            <Columns2 size={15} />
            加入并置研究
          </button>
        )}
      </div>
    </section>
  );
}
