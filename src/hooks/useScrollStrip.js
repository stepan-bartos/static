import { useEffect, useRef } from 'react';

/**
 * Makes a horizontally scrolling line pleasant with a mouse: the wheel
 * scrolls it sideways and it can be dragged. Also publishes where the
 * scroll position is, as CSS variables, so edges can fade and a position
 * bar can be drawn without re-rendering on every scroll.
 *
 * Returns `wasDragged()` so a click that ends a drag can be ignored.
 */
export function useScrollStrip(ref, contentKey) {
  const dragged = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;

    const publish = () => {
      const max = el.scrollWidth - el.clientWidth;
      const visible = el.scrollWidth > 0 ? el.clientWidth / el.scrollWidth : 1;
      const host = el.parentElement || el;
      el.style.setProperty('--fade-left', el.scrollLeft > 4 ? '48px' : '0px');
      el.style.setProperty('--fade-right', el.scrollLeft < max - 4 ? '48px' : '0px');
      host.style.setProperty('--pos-width', `${Math.min(100, visible * 100)}%`);
      host.style.setProperty('--pos-left', `${max > 0 ? (el.scrollLeft / max) * (100 - visible * 100) : 0}%`);
    };

    const onWheel = (e) => {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // already a sideways gesture
      if (el.scrollWidth <= el.clientWidth) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };

    let drag = null;
    const onPointerDown = (e) => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: el.scrollLeft };
      dragged.current = false;
    };
    const onPointerMove = (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!dragged.current && Math.abs(dx) < 5) return;
      dragged.current = true;
      el.dataset.dragging = 'true';
      el.scrollLeft = drag.left - dx;
    };
    const onPointerUp = () => {
      if (!drag) return;
      drag = null;
      delete el.dataset.dragging;
      // Let the click that follows this pointerup see the flag, then clear it
      setTimeout(() => {
        dragged.current = false;
      }, 0);
    };

    publish();
    const observer = new ResizeObserver(publish);
    observer.observe(el);
    el.addEventListener('scroll', publish, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    return () => {
      observer.disconnect();
      el.removeEventListener('scroll', publish);
      el.removeEventListener('wheel', onWheel);
      el.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
    };
  }, [ref, contentKey]);

  return () => dragged.current;
}
