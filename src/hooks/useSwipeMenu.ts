import { useCallback, useEffect, useRef, useState, type RefObject, type TouchEvent as ReactTouchEvent } from 'react';

const isPhone = () => typeof window !== 'undefined' && window.innerWidth < 768;
const menuWidth = () => Math.min(window.innerWidth * 0.85, 320);

/**
 * Phone side menu gestures:
 * - swipe left on the open menu closes it (follows the finger; vertical scroll still works),
 * - swipe right from the screen's left edge opens it,
 * - the phone's Back button closes it instead of leaving the page.
 * `offset` is the menu's translateX in px while dragging/settling (null = no inline transform).
 */
export function useSwipeMenu(open: boolean, setOpen: (v: boolean) => void, panelRef: RefObject<HTMLElement>) {
  const [offset, setOffset] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [openedByDrag, setOpenedByDrag] = useState(false);
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const settle = useCallback((to: number, then?: () => void) => {
    setDragging(false);
    setOffset(to);
    if (settleTimer.current) clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(() => {
      setOffset(null);
      then?.();
    }, 200);
  }, []);
  useEffect(() => () => { if (settleTimer.current) clearTimeout(settleTimer.current); }, []);

  // --- Close: horizontal swipe left on the open menu ---
  useEffect(() => {
    const el = panelRef.current;
    if (!open || !el || !isPhone()) return;
    let x0 = 0, y0 = 0, t0 = 0, dx = 0, mode: 'idle' | 'pending' | 'drag' | 'scroll' = 'idle';
    const onStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; t0 = performance.now(); dx = 0; mode = 'pending';
    };
    const onMove = (e: TouchEvent) => {
      if (mode === 'idle' || mode === 'scroll') return;
      dx = e.touches[0].clientX - x0;
      const dy = e.touches[0].clientY - y0;
      if (mode === 'pending') {
        if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 1.2) { mode = 'drag'; setDragging(true); }
        else if (Math.abs(dy) > 10) { mode = 'scroll'; return; }
        else return;
      }
      e.preventDefault(); // we own this horizontal gesture
      setOffset(Math.min(0, dx));
    };
    const onEnd = () => {
      if (mode !== 'drag') { mode = 'idle'; return; }
      mode = 'idle';
      const w = el.offsetWidth || menuWidth();
      const speed = dx / Math.max(1, performance.now() - t0); // px/ms, negative = leftwards
      if (dx < -w * 0.35 || (speed < -0.5 && dx < -40)) settle(-w, () => setOpen(false));
      else settle(0);
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [open, panelRef, setOpen, settle]);

  // --- Open: swipe right starting on the left-edge strip (handlers for that element) ---
  const edge = useRef({ x0: 0, y0: 0, t0: 0, dx: 0, active: false });
  const edgeHandlers = {
    onTouchStart: (e: ReactTouchEvent) => {
      const t = e.touches[0];
      edge.current = { x0: t.clientX, y0: t.clientY, t0: performance.now(), dx: 0, active: false };
    },
    onTouchMove: (e: ReactTouchEvent) => {
      const t = e.touches[0];
      const g = edge.current;
      g.dx = t.clientX - g.x0;
      const dy = t.clientY - g.y0;
      if (!g.active) {
        if (g.dx > 10 && g.dx > Math.abs(dy)) {
          g.active = true;
          setOpenedByDrag(true);
          setDragging(true);
          setOpen(true);
        } else return;
      }
      setOffset(Math.min(0, -menuWidth() + g.dx));
    },
    onTouchEnd: () => {
      const g = edge.current;
      if (!g.active) return;
      g.active = false;
      const w = menuWidth();
      const speed = g.dx / Math.max(1, performance.now() - g.t0);
      if (g.dx > w * 0.35 || (speed > 0.5 && g.dx > 40)) settle(0);
      else settle(-w, () => setOpen(false));
    },
  };
  useEffect(() => { if (!open) setOpenedByDrag(false); }, [open]);

  // --- Back button closes the menu (phones) ---
  const pushedRef = useRef(false);
  useEffect(() => {
    if (!isPhone()) return;
    if (open && !pushedRef.current) {
      // Same URL, extra entry; keep the router's own state so it doesn't think the page changed.
      window.history.pushState({ ...(window.history.state ?? {}), sideMenu: true }, '');
      pushedRef.current = true;
    } else if (!open && pushedRef.current) {
      pushedRef.current = false;
      if (window.history.state?.sideMenu) window.history.back();
    }
  }, [open]);
  useEffect(() => {
    const onPop = () => {
      if (pushedRef.current && !window.history.state?.sideMenu) {
        pushedRef.current = false;
        setOpen(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [setOpen]);

  const progress = offset === null ? 1 : Math.max(0, 1 + offset / menuWidth()); // 1 = fully open
  const panelStyle =
    offset === null ? undefined : { transform: `translateX(${offset}px)`, transition: dragging ? 'none' : 'transform 200ms ease-out' };
  const backdropStyle = offset === null ? undefined : { opacity: progress, transition: dragging ? 'none' : 'opacity 200ms ease-out' };
  return { panelStyle, backdropStyle, edgeHandlers, animateIn: !openedByDrag };
}
