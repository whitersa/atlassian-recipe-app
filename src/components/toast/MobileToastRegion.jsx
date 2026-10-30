import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { CircleCheck, CircleAlert, TriangleAlert, Flame, X } from 'lucide-react';
import { MobileButton } from '../button/MobileButton';
import { buildSpringValues, getMotionSpecs } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

const TONE_ICON = {
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert,
  brand: Flame,
};

function readCurrentTranslateY(element) {
  if (!element) return 0;
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 0;
  const mat3d = transform.match(/matrix3d\((.+)\)/);
  if (mat3d) {
    const vals = mat3d[1].split(',').map((v) => Number.parseFloat(v.trim()));
    return Number.isFinite(vals[13]) ? vals[13] : 0;
  }
  const mat2d = transform.match(/matrix\((.+)\)/);
  if (mat2d) {
    const vals = mat2d[1].split(',').map((v) => Number.parseFloat(v.trim()));
    return Number.isFinite(vals[5]) ? vals[5] : 0;
  }
  return 0;
}

function readCurrentScale2D(element) {
  if (!element) return { sx: 1, sy: 1 };
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === 'none') return { sx: 1, sy: 1 };
  const mat2d = transform.match(/matrix\((.+)\)/);
  if (mat2d) {
    const vals = mat2d[1].split(',').map((v) => Number.parseFloat(v.trim()));
    return {
      sx: Number.isFinite(vals[0]) ? vals[0] : 1,
      sy: Number.isFinite(vals[3]) ? vals[3] : 1,
    };
  }
  return { sx: 1, sy: 1 };
}

/**
 * MobileToastRegion:
 * - Defaults to `placement="top"` on mobile (drops from top safe-area, avoiding bottom nav, thumb buttons & soft keyboard).
 * - Supports `mode="push"` (each toast pushes older ones downward) and `mode="stack"` (older toasts
 *   tuck neatly below the front card's bottom edge with surface-only scale `1 - depth * 0.045`; tapping/hovering expands).
 * - Spring physics ONLY here: `y` displacement (`bounce: 0.12`) and `.m-toast-surface` scale (`bounce: 0.22`).
 * - Text & icons live outside `.m-toast-surface` and NEVER scale.
 * - Exit uses non-bouncing 320ms ease-out upward retreat (`inert = true`).
 */
export function MobileToastRegion({ toasts, onDismiss, mode = 'push', placement = 'top' }) {
  const reducedMotion = useReducedMotion();
  const isTop = placement !== 'bottom';

  const [entries, setEntries] = useState(() =>
    toasts.map((item) => ({ id: item.id, item, status: 'stable' }))
  );
  const [prevToasts, setPrevToasts] = useState(toasts);
  const [stackOpen, setStackOpen] = useState(false);
  const [paused, setPaused] = useState(false);

  if (toasts !== prevToasts) {
    setPrevToasts(toasts);
    if (toasts.length <= 1) {
      setStackOpen(false);
    }

    const nextIds = new Set(toasts.map((t) => t.id));
    const currentById = new Map(entries.map((e) => [e.id, e]));
    const merged = [];

    // Place active toasts in exact newest-first order
    toasts.forEach((toast) => {
      const existing = currentById.get(toast.id);
      if (existing) {
        merged.push({ id: toast.id, item: toast, status: 'stable' });
      } else {
        merged.push({ id: toast.id, item: toast, status: 'entering' });
      }
    });

    // Keep dismissed toasts mounted until their 320ms non-bouncing exit completes
    entries.forEach((entry) => {
      if (!nextIds.has(entry.id)) {
        merged.push({ ...entry, status: 'exiting' });
      }
    });

    setEntries(merged);
  }

  const regionRef = useRef(null);
  const listRef = useRef(null);
  const itemRefs = useRef(new Map());
  const surfaceRefs = useRef(new Map());
  const animMapRef = useRef(new Map());
  const lastYRef = useRef(new Map());

  const isExpanded = mode === 'push' || stackOpen;

  // Collapse expanded stack when tapping outside in stack mode
  useEffect(() => {
    if (mode !== 'stack' || !stackOpen) return undefined;
    const handlePointerDown = (event) => {
      if (regionRef.current && !regionRef.current.contains(event.target)) {
        setStackOpen(false);
        setPaused(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [mode, stackOpen]);

  // Auto-dismiss frontmost/active toasts after 6s (paused on hover/focus/expanded stack interaction)
  useEffect(() => {
    if (paused || toasts.length === 0) return undefined;
    const timers = toasts.map((toast, idx) => {
      const ttl = (toast.duration || 6000) + idx * 450;
      return window.setTimeout(() => {
        onDismiss?.(toast.id);
      }, ttl);
    });
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, paused, onDismiss]);

  // Spatial layout & spring / exit WAAPI transitions
  useLayoutEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return undefined;

    const { normalMs, easeOut } = getMotionSpecs(listEl);
    const activeEntries = entries.filter((e) => e.status !== 'exiting');
    const heights = activeEntries.map((entry) => {
      const el = itemRefs.current.get(entry.id);
      return el ? el.offsetHeight : 68;
    });
    const frontH = heights[0] || 68;
    const stackPeekPx = 8;

    // Update container height so pointer hit area matches visible stack
    if (activeEntries.length === 0) {
      listEl.style.height = '0px';
    } else if (isExpanded) {
      const sum = heights.reduce((acc, h) => acc + h, 0) + Math.max(0, heights.length - 1) * 10;
      listEl.style.height = `${sum}px`;
    } else {
      listEl.style.height = `${frontH + Math.max(0, activeEntries.length - 1) * stackPeekPx}px`;
    }

    let cumulativeOffset = 0;

    activeEntries.forEach((entry, depth) => {
      const el = itemRefs.current.get(entry.id);
      const surfaceEl = surfaceRefs.current.get(entry.id);
      if (!el || !surfaceEl) return;

      const h = heights[depth] || 68;
      const isFront = depth === 0;
      el.inert = !isExpanded && !isFront;
      el.style.zIndex = String(40 - depth);

      const dir = isTop ? 1 : -1;
      const collapsedOffset = (frontH - h) + depth * stackPeekPx;
      const targetY = isExpanded ? dir * cumulativeOffset : dir * collapsedOffset;
      const targetScaleX = isExpanded ? 1 : Math.max(0.84, 1 - depth * 0.045);
      const targetScaleY = isExpanded ? 1 : (frontH / h) * targetScaleX;
      cumulativeOffset += h + 10;

      const prevAnims = animMapRef.current.get(entry.id) || [];

      if (reducedMotion || normalMs <= 0) {
        prevAnims.forEach((a) => a.cancel());
        animMapRef.current.delete(entry.id);
        el.style.transform = `translateY(${targetY}px)`;
        el.style.opacity = '1';
        surfaceEl.style.transform = `scale(${targetScaleX}, ${targetScaleY})`;
        lastYRef.current.set(entry.id, targetY);
        return;
      }

      const isEntering = entry.status === 'entering';
      const enterOffset = isTop ? -28 : 28;
      const fromY = isEntering ? targetY + enterOffset : readCurrentTranslateY(el);
      const liveScale = readCurrentScale2D(surfaceEl);
      const fromScaleX = isEntering ? 0.93 : liveScale.sx;
      const fromScaleY = isEntering ? 0.93 : liveScale.sy;
      const fromOpacity = isEntering
        ? 0
        : Number.parseFloat(window.getComputedStyle(el).opacity) || 1;

      prevAnims.forEach((a) => a.cancel());
      lastYRef.current.set(entry.id, targetY);

      const newAnims = [];

      if (Math.abs(fromY - targetY) > 0.4 || isEntering) {
        const ySpring = buildSpringValues({
          from: fromY,
          to: targetY,
          visualDuration: 0.32,
          bounce: 0.12,
        });
        const yAnim = el.animate(
          ySpring.values.map((v) => ({ transform: `translateY(${v.toFixed(2)}px)` })),
          { duration: ySpring.durationMs, easing: 'linear', fill: 'forwards' }
        );
        newAnims.push(yAnim);
      } else {
        el.style.transform = `translateY(${targetY}px)`;
      }

      if (isEntering || Math.abs(fromOpacity - 1) > 0.02) {
        const opAnim = el.animate([{ opacity: fromOpacity }, { opacity: 1 }], {
          duration: normalMs,
          easing: easeOut,
          fill: 'forwards',
        });
        newAnims.push(opAnim);
      }

      if (
        Math.abs(fromScaleX - targetScaleX) > 0.004 ||
        Math.abs(fromScaleY - targetScaleY) > 0.004 ||
        isEntering
      ) {
        const sxSpring = buildSpringValues({
          from: fromScaleX,
          to: targetScaleX,
          visualDuration: 0.32,
          bounce: 0.22,
        });
        const sySpring = buildSpringValues({
          from: fromScaleY,
          to: targetScaleY,
          visualDuration: 0.32,
          bounce: 0.22,
        });
        const sAnim = surfaceEl.animate(
          sxSpring.values.map((sx, idx) => ({
            transform: `scale(${sx.toFixed(4)}, ${(sySpring.values[idx] ?? targetScaleY).toFixed(4)})`,
          })),
          { duration: sxSpring.durationMs, easing: 'linear', fill: 'forwards' }
        );
        newAnims.push(sAnim);
      } else {
        surfaceEl.style.transform = `scale(${targetScaleX}, ${targetScaleY})`;
      }

      animMapRef.current.set(entry.id, newAnims);
    });

    // Handle exiting toasts: non-bouncing 320ms ease-out retreat toward anchor edge
    let hasExiting = false;
    entries.forEach((entry) => {
      if (entry.status !== 'exiting') return;
      hasExiting = true;
      const el = itemRefs.current.get(entry.id);
      if (!el) return;
      el.inert = true;
      el.style.zIndex = '5';

      const prevAnims = animMapRef.current.get(entry.id) || [];
      if (prevAnims.some((a) => a.__isExit)) return;

      const liveY = readCurrentTranslateY(el);
      const liveOpacity = Number.parseFloat(window.getComputedStyle(el).opacity) || 1;
      prevAnims.forEach((a) => a.cancel());

      if (reducedMotion || normalMs <= 0) return;

      const exitShift = isTop ? -12 : 12;
      const exitAnim = el.animate(
        [
          { opacity: liveOpacity, transform: `translateY(${liveY}px)` },
          { opacity: 0, transform: `translateY(${liveY + exitShift}px)` },
        ],
        { duration: normalMs, easing: easeOut, fill: 'forwards' }
      );
      exitAnim.__isExit = true;
      animMapRef.current.set(entry.id, [exitAnim]);
    });

    const hasEntering = entries.some((e) => e.status === 'entering');
    if (hasExiting || hasEntering) {
      const cleanupDelay = reducedMotion || normalMs <= 0 ? 0 : normalMs;
      const timer = window.setTimeout(() => {
        setEntries((curr) =>
          curr
            .filter((e) => {
              if (e.status === 'exiting') {
                animMapRef.current.delete(e.id);
                lastYRef.current.delete(e.id);
                return false;
              }
              return true;
            })
            .map((e) => (e.status === 'entering' ? { ...e, status: 'stable' } : e))
        );
      }, cleanupDelay);

      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [entries, isExpanded, isTop, reducedMotion]);

  if (entries.length === 0) return null;

  return createPortal(
    <section
      ref={regionRef}
      aria-label="通知提示"
      aria-live="polite"
      className="m-toast-region"
      data-placement={isTop ? 'top' : 'bottom'}
      data-expanded={isExpanded ? 'true' : 'false'}
      onPointerEnter={() => {
        setPaused(true);
        if (mode === 'stack' && toasts.length > 1) {
          setStackOpen(true);
        }
      }}
      onPointerLeave={() => {
        setPaused(false);
        if (mode === 'stack') {
          setStackOpen(false);
        }
      }}
      onFocus={() => {
        setPaused(true);
        if (mode === 'stack' && toasts.length > 1) {
          setStackOpen(true);
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) {
          setPaused(false);
          if (mode === 'stack') {
            setStackOpen(false);
          }
        }
      }}
    >
      <ul ref={listRef} className="m-toast-list">
        {entries.map((entry) => {
          const activeIdx = toasts.findIndex((t) => t.id === entry.id);
          const isFront = activeIdx <= 0;
          const IconComp = TONE_ICON[entry.item.tone] || Flame;

          return (
            <li
              key={entry.id}
              ref={(el) => {
                if (el) itemRefs.current.set(entry.id, el);
                else itemRefs.current.delete(entry.id);
              }}
              className="m-toast"
              data-front={isFront ? 'true' : 'false'}
              onClick={() => {
                if (mode === 'stack' && !stackOpen && toasts.length > 1) {
                  setStackOpen(true);
                  setPaused(true);
                }
              }}
            >
              <div
                ref={(el) => {
                  if (el) surfaceRefs.current.set(entry.id, el);
                  else surfaceRefs.current.delete(entry.id);
                }}
                className="m-toast-surface"
              />

              <span className="m-toast-icon" data-tone={entry.item.tone}>
                <IconComp size={17} strokeWidth={2.2} />
              </span>

              <div className="m-toast-content">
                <strong>{entry.item.title}</strong>
                {entry.item.description && <p>{entry.item.description}</p>}
              </div>

              <MobileButton
                variant="ghost"
                size="xs"
                iconOnly
                aria-label="关闭通知"
                icon={<X size={14} strokeWidth={2.2} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onDismiss?.(entry.id);
                }}
              />
            </li>
          );
        })}
      </ul>
    </section>,
    document.body
  );
}

MobileToastRegion.propTypes = {
  toasts: P.array.isRequired,
  onDismiss: P.func,
  mode: P.string,
  placement: P.string,
};
