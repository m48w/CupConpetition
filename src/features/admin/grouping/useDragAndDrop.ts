import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { ZoneId } from "./draft";

/** これ以上動いたらドラッグ。小さい動きはタップとして扱う。 */
const DRAG_THRESHOLD_PX = 5;
/** 画面の端からこの距離に入ったら、自動でスクロールする。 */
const EDGE_PX = 64;
const SCROLL_STEP_PX = 12;

export interface DragState {
  teamId: string;
  x: number;
  y: number;
  over: ZoneId | null;
}

/** 指・マウスの下にある枠（`data-drop-zone`）を探す。 */
function zoneAt(x: number, y: number): ZoneId | null {
  const element = document.elementFromPoint(x, y)?.closest("[data-drop-zone]");
  return (element?.getAttribute("data-drop-zone") as ZoneId | null) ?? null;
}

/**
 * Pointer Events のドラッグ＆ドロップ。マウスと指の両方で動く
 * （HTML5 の drag and drop は iPad で動かないので使わない）。
 */
export function useDragAndDrop(onDrop: (teamId: string, zone: ZoneId) => void) {
  const [drag, setDragState] = useState<DragState | null>(null);
  /** イベントの中で今のドラッグを読むための控え（state は次の描画まで変わらないため）。 */
  const dragRef = useRef<DragState | null>(null);
  const setDrag = useCallback((next: DragState | null) => {
    dragRef.current = next;
    setDragState(next);
  }, []);
  const start = useRef<{ teamId: string; x: number; y: number } | null>(null);
  /** ドラッグのあとに来る click を、タップとして扱わないため。 */
  const justDragged = useRef(false);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>, teamId: string) => {
    if (event.button !== 0) return;
    // 前のドラッグのあとに click が来なかったときのため、ここで戻しておく。
    justDragged.current = false;
    start.current = { teamId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const origin = start.current;
      if (!origin) return;
      const moved = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      if (!dragRef.current && moved < DRAG_THRESHOLD_PX) return;
      setDrag({
        teamId: origin.teamId,
        x: event.clientX,
        y: event.clientY,
        over: zoneAt(event.clientX, event.clientY),
      });
      if (event.clientY < EDGE_PX) window.scrollBy(0, -SCROLL_STEP_PX);
      else if (event.clientY > window.innerHeight - EDGE_PX) window.scrollBy(0, SCROLL_STEP_PX);
    },
    [setDrag],
  );

  const finish = useCallback(
    (event: PointerEvent<HTMLElement>, cancelled: boolean) => {
      const origin = start.current;
      start.current = null;
      const current = dragRef.current;
      if (current) {
        justDragged.current = true;
        const zone = cancelled ? null : zoneAt(event.clientX, event.clientY);
        if (zone) onDrop(current.teamId, zone);
        setDrag(null);
      }
      if (origin && event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [onDrop, setDrag],
  );

  // ドラッグ中は文字が選択されないようにする。
  useEffect(() => {
    if (!drag) return;
    const previous = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    return () => {
      document.body.style.userSelect = previous;
    };
  }, [drag]);

  /** click がドラッグの続きなら true（1回だけ）。 */
  const consumeDragClick = useCallback(() => {
    const value = justDragged.current;
    justDragged.current = false;
    return value;
  }, []);

  return {
    drag,
    consumeDragClick,
    handlers: (teamId: string) => ({
      onPointerDown: (event: PointerEvent<HTMLElement>) => onPointerDown(event, teamId),
      onPointerMove,
      onPointerUp: (event: PointerEvent<HTMLElement>) => finish(event, false),
      onPointerCancel: (event: PointerEvent<HTMLElement>) => finish(event, true),
    }),
  };
}
