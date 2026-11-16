import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Headphones,
  Layers,
  Minus,
  Pause,
  Plus,
  Ruler,
} from "lucide-react";
import { artworks, artworkById } from "../../../shared/catalog";
import { segmentLabel } from "../../narration/lib/timeline";
import { STUDY_LIMIT } from "../lib/layout";
import type { useStudy } from "../model/useStudy";

export type Study = ReturnType<typeof useStudy>;

export function StudyPanel({
  study,
  tourStep,
  onLeave,
}: {
  study: Study;
  tourStep: number | null;
  onLeave: () => void;
}) {
  const [picker, setPicker] = useState(false);
  const ids = study.ids;
  const focus = artworkById(study.focusId);
  const playing = study.narration.state.playing;
  const elapsed = study.narration.state.elapsed;
  const progress =
    focus && focus.duration ? Math.min(1, elapsed / focus.duration) : 0;

  return (
    <section className="study-panel">
      <div className="study-panel-head">
        <div>
          <div className="eyebrow">
            COMPARATIVE STUDY <span>并置研究</span>
          </div>
          <h2>把作品放在一起看。</h2>
        </div>
        <button className="text-button" onClick={onLeave}>
          <ArrowLeft size={14} />
          返回主展厅
          {tourStep !== null && ` · 导览停在第 ${tourStep + 1} 站`}
        </button>
      </div>

      <div className="study-chips" aria-label="当前并置作品">
        {ids.map((id) => {
          const a = artworkById(id);
          if (!a) return null;
          const isMissing = study.missing.includes(id);
          return (
            <span
              key={id}
              className={[
                "study-chip",
                study.focusId === id ? "focused" : "",
                isMissing ? "missing" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-current={study.focusId === id ? "true" : undefined}
            >
              <button
                className="study-chip-name"
                onClick={() => study.setFocusId(id)}
                title="查看并听这一件"
              >
                {a.title}
              </button>
              <button
                className="study-chip-x"
                aria-label={"从并置中移除" + a.title}
                onClick={() => study.remove(id)}
              >
                <Minus size={12} />
              </button>
            </span>
          );
        })}
        <button
          className="study-add"
          onClick={() => setPicker((v) => !v)}
          disabled={ids.length >= STUDY_LIMIT}
          aria-label="加入并置作品"
        >
          <Plus size={13} />
          加入
        </button>
      </div>

      {picker && (
        <div className="study-picker">
          <div className="study-picker-note">
            最多并置 {STUDY_LIMIT} 件。空间不足时按组观看，不缩小任何作品。
          </div>
          {artworks.map((a) => {
            const saved = study.favorites.includes(a.id) || ids.includes(a.id);
            return (
              <button
                key={a.id}
                className={ids.includes(a.id) ? "picked" : ""}
                disabled={!saved || ids.includes(a.id)}
                onClick={() => study.add(a.id)}
              >
                <span style={{ background: a.color }} />
                {a.title}
                {!saved && <small>先收藏</small>}
                {ids.includes(a.id) && <small>已加入</small>}
              </button>
            );
          })}
        </div>
      )}

      {study.notice && <p className="study-notice">{study.notice}</p>}

      <div className="study-focus">
        <div className="study-focus-head">
          <div>
            <div className="eyebrow">当前对象 · IN FOCUS</div>
            <h3>{focus ? focus.title : "尚未选择"}</h3>
            {focus && (
              <p>
                {focus.artist} · {focus.year} · {focus.medium}
                <br />
                <span className="size-line">
                  <Ruler size={12} />
                  原作 {focus.size.width} × {focus.size.height} cm
                </span>
              </p>
            )}
          </div>
          <div className="study-focus-actions">
            <button
              className="primary"
              onClick={study.playSingle}
              disabled={!focus}
            >
              <Headphones size={15} />
              单独听这件
            </button>
            <button
              className="secondary"
              onClick={study.playSegment}
              disabled={!focus || study.missing.includes(focus.id)}
            >
              {playing ? <Pause size={14} /> : <ArrowRight size={14} />}
              只播本段
            </button>
          </div>
        </div>
        <div className="study-progress">
          <progress value={progress} max="1" />
          <span>
            {segmentLabel(focus, study.segment)}
            {focus && study.missing.includes(focus.id) ? " · 缺失，未以其他段落替代" : ""}
          </span>
        </div>
        <p className="study-caption">
          {study.narration.caption ||
            "选择“单独听这件”或“只播本段”，字幕会显示在这里。"}
        </p>
        <small className="study-caption-meta">
          {study.narration.supported
            ? "语音由设备中文语音合成播放"
            : "设备不支持语音，请阅读字幕"}
        </small>
      </div>

      <div className="study-segments">
        <div className="eyebrow">同段对照 · SAME PASSAGE</div>
        <div className="segment-track">
          {Array.from({ length: study.maxSegments }, (_, i) => (
            <button
              key={i}
              className={study.segment === i ? "active" : ""}
              aria-label={`第 ${i + 1} 段`}
              aria-pressed={study.segment === i}
              onClick={() => study.setSegment(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            className="segment-play"
            onClick={study.compareSegment}
            disabled={study.comparable.length < 2}
            title={
              study.comparable.length < 2
                ? "拥有这一段讲解的作品不足两件，无法同段对照"
                : "依次播放每件作品同一段落的讲解"
            }
          >
            {playing ? <Pause size={13} /> : <Layers size={13} />}
            {study.comparable.length < 2
              ? "缺少同段讲解"
              : `依次对照 ${study.comparable.length} 件`}
          </button>
          <button
            className="segment-stop"
            onClick={study.stopNarration}
            disabled={!playing}
          >
            停止
          </button>
        </div>
        {study.comparable.length < 2 && (
          <p className="segment-hint">
            第 {study.segment + 1} 段只有 {study.comparable.length}{" "}
            件作品拥有；不足以同段对照。可换一个段落，或补齐作品。
          </p>
        )}
        <ul className="segment-coverage">
          {ids.map((id) => {
            const a = artworkById(id);
            if (!a) return null;
            const count = a.transcript.length;
            return (
              <li
                key={id}
                className={
                  study.missing.includes(id) ? "missing" : "available"
                }
              >
                {a.title}
                <small>
                  {study.missing.includes(id)
                    ? `仅 ${count} 段 · 第 ${study.segment + 1} 段缺失`
                    : "有对应段落"}
                </small>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="study-matrix">
        <div className="eyebrow">构图 · 材质 · 共同主题</div>
        {study.plan.groups.map((group) => (
          <div className="study-group-row" key={group.index}>
            <span className="group-tag">{group.label}</span>
            <small>
              {group.wall === "north" ? "北墙" : "南墙"} ·{" "}
              {group.ids.length} 件 · 组视图 {group.distance} m · 单件{" "}
              {(() => {
                const stands = group.ids.map(
                  (id) =>
                    study.plan.placements.find((p) => p.art.id === id)
                      ?.standoff ?? 2.6,
                );
                const low = Math.min(...stands);
                const high = Math.max(...stands);
                return low === high ? `${low} m` : `${low}–${high} m`;
              })()}
            </small>
          </div>
        ))}
        <div className="study-matrix-list">
          {ids.map((id) => {
            const a = artworkById(id);
            if (!a) return null;
            const shared = a.themes.filter((t) =>
              ids.some(
                (other) =>
                  other !== id &&
                  artworkById(other)?.themes.includes(t),
              ),
            );
            return (
              <button
                key={id}
                className={
                  "matrix-card" + (study.focusId === id ? " focused" : "")
                }
                onClick={() => study.setFocusId(id)}
              >
                <span className="matrix-title">
                  {a.title}
                  <small>
                    {a.size.width} × {a.size.height} cm
                  </small>
                </span>
                <span className="matrix-row">
                  <em>构图</em>
                  {a.composition}
                </span>
                <span className="matrix-row">
                  <em>材质</em>
                  {a.medium}
                </span>
                <span className="matrix-row">
                  <em>共同主题</em>
                  {shared.length ? (
                    shared.map((t) => (
                      <span className="theme" key={t}>
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="theme none">无同组重合</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="study-note">
        <label htmlFor="study-note">
          <span className="eyebrow">比较笔记 · COMPARISON NOTE</span>
          <small>
            这组作品的笔记独立保存，不会写进任何单件收藏感想。
          </small>
        </label>
        <textarea
          id="study-note"
          placeholder="它们如何不同地处理同一段叙述？构图、尺寸或材质改变了什么？"
          value={study.note}
          onChange={(e) => study.updateNote(e.target.value)}
          maxLength={1000}
        />
      </div>

      {study.related.length > 0 && (
        <div className="study-related">
          <div className="eyebrow">相关比较笔记 · EARLIER SETS</div>
          {study.related.map((c) => (
            <article key={c.ids.join("+")}>
              <strong>
                {c.ids
                  .map((id) => artworkById(id)?.title)
                  .filter(Boolean)
                  .join(" ↔ ")}
              </strong>
              <small>第 {c.segment + 1} 段对照</small>
              <p>{c.note}</p>
            </article>
          ))}
        </div>
      )}

      <div className="study-strategy">
        <div className="eyebrow">贴图策略 · TEXTURE BUDGET</div>
        <div className="strategy-choices">
          <button
            className={study.strategy === "detail" ? "active" : ""}
            onClick={() => study.updateStrategy("detail")}
          >
            按需细化
            <small>
              每件 620px 共享 · 当前对象提升至 1536px，切换即释放
            </small>
          </button>
          <button
            className={study.strategy === "smooth" ? "active" : ""}
            onClick={() => study.updateStrategy("smooth")}
          >
            流畅对照
            <small>每件 1040px · 切换无需加载，近看细节略少</small>
          </button>
        </div>
        <p className="strategy-cost">
          当前并置 {study.ids.length} 件 · 共享贴图约 {study.budget.sharedMb} MB ·
          峰值约 {study.budget.peakMb} MB（估算，含当前聚焦的一张）。取景、
          尺寸与观看距离在两种策略下完全相同，差别只在近看的清晰度与切换的即时性。
        </p>
      </div>
    </section>
  );
}
