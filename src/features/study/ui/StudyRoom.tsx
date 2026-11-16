import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Locate, MapPin, Move, Ruler } from "lucide-react";
import { STUDY_LIMIT } from "../lib/layout";
import { artworkById } from "../../../shared/catalog";
import { StudyViewport } from "./StudyViewport";
import { StudyPanel, type Study } from "./StudyPanel";
import { useStudyWalker } from "../model/useStudyWalker";
import type { StudyGroup } from "../lib/layout";

export function StudyRoom({
  study,
  tourPaused,
  onLeave,
}: {
  study: Study;
  tourPaused: { step: number } | null;
  onLeave: () => void;
}) {
  const walker = useStudyWalker(() => undefined, study.plan);
  const [groupId, setGroup] = useState<number | null>(
    study.plan.groups[0]?.index ?? null,
  );
  const [nearId, setNearId] = useState<string | null>(null);
  const placedKey = useRef<string | null>(null);

  // The room is rebuilt when the set changes; re-centre only then, so
  // walkers are not teleported by an unrelated re-render.
  useEffect(() => {
    if (placedKey.current === study.key) return;
    placedKey.current = study.key;
    walker.place(study.plan.start, study.plan.yaw);
    setGroup(study.plan.groups[0]?.index ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [study.key]);

  const group = study.plan.groups.find((g) => g.index === groupId) ?? null;

  const locate = (id: string) => {
    const placement = study.plan.placements.find((p) => p.art.id === id);
    if (!placement) return;
    setGroup(placement.group);
    walker.goTo(id);
  };

  const visitGroup = (g: StudyGroup) => {
    setGroup(g.index);
    walker.place(g.viewer, g.yaw);
  };

  const focus = artworkById(study.focusId);

  return (
    <>
      <aside className="left-sidebar study-left">
        <div className="exhibition-intro">
          <div className="eyebrow">
            COMPARATIVE STUDY <span>研究空间</span>
          </div>
          <h1>并置</h1>
          <p className="english-title">SIDE BY SIDE</p>
          <p className="intro-text">
            两到四件作品，以原作尺寸并置。
            <br />
            比较构图、材质与共同主题。
          </p>
          <div className="exhibition-meta">
            <span>{study.ids.length} 件并置</span>
            <span>{study.plan.groups.length} 组</span>
            <span>按真实比例</span>
          </div>
        </div>

        <div className="section-title">
          <Ruler size={16} />
          <span>研究清单</span>
          <small>按尺寸落位</small>
        </div>
        <ol className="study-roster">
          {study.plan.placements.map((p) => (
            <li key={p.art.id}>
              <button
                className={study.focusId === p.art.id ? "active" : ""}
                aria-current={
                  study.focusId === p.art.id ? "true" : undefined
                }
                onClick={() => {
                  study.setFocusId(p.art.id);
                  locate(p.art.id);
                }}
              >
                <span className="roster-color" style={{ background: p.art.color }} />
                <span>
                  <strong>{p.art.title}</strong>
                  <small>
                    {p.art.size.width} × {p.art.size.height} cm · 站位{" "}
                    {p.standoff} m
                  </small>
                </span>
              </button>
            </li>
          ))}
        </ol>

        <div className="section-title study-groups-title">
          <MapPin size={16} />
          <span>分组观看</span>
          <small>不缩小作品</small>
        </div>
        {study.plan.groups.map((g) => (
          <button
            key={g.index}
            className={"study-group" + (group?.index === g.index ? " active" : "")}
            onClick={() => visitGroup(g)}
          >
            <span>
              {g.label} · {g.wall === "north" ? "北墙" : "南墙"}
            </span>
            <small>
              {g.ids.length} 件 · 组视图 {g.distance} m · 单件{" "}
              {(() => {
                const stands = g.ids.map(
                  (id) =>
                    study.plan.placements.find((p) => p.art.id === id)
                      ?.standoff ?? 2.6,
                );
                const low = Math.min(...stands);
                const high = Math.max(...stands);
                return low === high ? `${low} m` : `${low}–${high} m`;
              })()}
            </small>
          </button>
        ))}
        {study.plan.split && (
          <p className="study-split-note">
            墙面不足，已分为 {study.plan.groups.length} 组；每件作品保持原尺寸，
            请分组观看，而不是把它们缩到同一面墙上。
          </p>
        )}

        <div className="sidebar-footer">
          <Move size={15} />
          <span>W / A / S / D 行走，靠近作品可细看。</span>
        </div>
      </aside>

      <section className="center study-center">
        <div className="view-heading">
          <div>
            <span className="eyebrow">THE STUDY ROOM</span>
            <h2>
              同一尺度下的比较
              <span>
                {study.ids.length} 件 · {study.plan.groups.length} 组
              </span>
            </h2>
          </div>
          <button className="text-button" onClick={onLeave}>
            <ArrowLeft size={15} />
            暂停研究，返回展厅
          </button>
        </div>
        <div className="scene-wrap study-scene">
          <StudyViewport
            plan={study.plan}
            position={walker.positionRef}
            yaw={walker.yaw}
            strategy={study.strategy}
            focusId={study.focusId}
            onSelect={(id) => {
              study.setFocusId(id);
              locate(id);
            }}
            onNear={setNearId}
          />
          <div className="scene-top">
            <span>
              <span className="live-dot" />
              并置研究中 · 原尺寸 1:1
            </span>
            <span className="study-strategy-tag">
              {study.strategy === "detail" ? "按需细化" : "流畅对照"} ·{" "}
              {study.budget.label}
            </span>
          </div>
          <div className="scene-location">
            <MapPin size={15} />
            {focus ? focus.title : "研究空间"}
            <small>
              {focus
                ? `${focus.size.width} × ${focus.size.height} cm · 建议 ${study.plan.placements.find((p) => p.art.id === focus.id)?.standoff} m`
                : "选择一件作品，走近比较"}
              {nearId && nearId !== study.focusId && artworkById(nearId)
                ? ` · 附近：${artworkById(nearId)!.title}`
                : ""}
            </small>
          </div>
          <button
            className="study-locate glass-button"
            aria-label="走到当前作品"
            title="走到当前作品"
            onClick={() => study.focusId && locate(study.focusId)}
          >
            <Locate size={16} />
          </button>
          <div className="scene-controls">
            <span>
              <kbd>W</kbd>
              <kbd>A</kbd>
              <kbd>S</kbd>
              <kbd>D</kbd> 行走
            </span>
            <span>
              <Move size={14} />
              拖动切换视角
            </span>
            <span>点击画面中的作品切换研究对象</span>
          </div>
        </div>
        {tourPaused && (
          <div className="study-paused">
            <span className="live-dot" />
            主展厅的主题导览已暂停在第 {tourPaused.step + 1} 站并保留位置；
            返回展厅后按“继续”即可接着走。
          </div>
        )}
        <div className="scene-caption">
          <span>
            所有作品按登记尺寸呈现；分组只改变墙面，不改变比例。
          </span>
          <span>并置上限 {STUDY_LIMIT} 件 · 超出请分组</span>
        </div>
      </section>

      <aside className="right-sidebar study-right">
        <StudyPanel
          study={study}
          tourStep={tourPaused ? tourPaused.step : null}
          onLeave={onLeave}
        />
      </aside>
    </>
  );
}
