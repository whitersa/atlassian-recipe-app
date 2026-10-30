import { useState, useRef, useLayoutEffect } from 'react';
import { getMotionSpecs } from './motionUtils';
import { useReducedMotion } from './useReducedMotion';
import { P } from '../propTypes';

/**
 * MotionList:
 * - No staggered reveal on initial mount (`initial={false}`).
 * - Added items fade in (320ms); removed items fade out in place (320ms, `inert = true`)
 *   while surviving items glide smoothly into their new layout positions via FLIP (320ms).
 */
export function MotionList({ items, getKey, renderItem, className = '' }) {
  const reducedMotion = useReducedMotion();
  const [entries, setEntries] = useState(() =>
    items.map((item) => ({ key: getKey(item), item, status: 'stable' }))
  );
  const [prevItems, setPrevItems] = useState(items);

  const containerRef = useRef(null);
  const nodeRefs = useRef(new Map());
  const rectsSnapshotRef = useRef(new Map());

  if (items !== prevItems) {
    setPrevItems(items);
    const nextKeys = new Set(items.map(getKey));
    const currentByKey = new Map(entries.map((e) => [e.key, e]));

    // Build merged list keeping exiting items at their original indices so they fade out in place
    const merged = [];
    const inserted = new Set();

    for (const entry of entries) {
      if (nextKeys.has(entry.key)) {
        const freshItem = items.find((it) => getKey(it) === entry.key);
        merged.push({ key: entry.key, item: freshItem, status: 'stable' });
        inserted.add(entry.key);
      } else if (entry.status !== 'exiting') {
        merged.push({ ...entry, status: 'exiting' });
      } else {
        merged.push(entry);
      }
    }

    // Insert newly added items at their target positions
    items.forEach((item, targetIdx) => {
      const key = getKey(item);
      if (!inserted.has(key) && !currentByKey.has(key)) {
        const status = reducedMotion ? 'stable' : 'entering';
        merged.splice(Math.min(targetIdx, merged.length), 0, { key, item, status });
        inserted.add(key);
      }
    });

    setEntries(merged);
  }

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const { normalMs, easeOut } = getMotionSpecs(container);
    const prevRects = rectsSnapshotRef.current;
    const containerRect = container.getBoundingClientRect();

    // Handle exiting items: lock absolute position relative to container, mark inert, fade out 320ms
    const animations = [];
    let hasExiting = false;

    entries.forEach((entry) => {
      const el = nodeRefs.current.get(entry.key);
      if (!el) return;

      if (entry.status === 'exiting') {
        hasExiting = true;
        el.inert = true;
        if (reducedMotion || normalMs <= 0) return;

        const saved = prevRects.get(entry.key);
        if (saved) {
          el.style.position = 'absolute';
          el.style.top = `${saved.offsetTop}px`;
          el.style.left = '0px';
          el.style.width = `${saved.width}px`;
          el.style.zIndex = '0';
        }
        const anim = el.animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: normalMs,
          easing: easeOut,
          fill: 'forwards',
        });
        animations.push(anim);
      } else {
        el.inert = false;
        el.style.position = '';
        el.style.top = '';
        el.style.left = '';
        el.style.width = '';
        el.style.zIndex = '';
      }
    });

    // Measure new natural layout positions for non-exiting items and apply FLIP / enter fade
    const nextRects = new Map();
    entries.forEach((entry) => {
      if (entry.status === 'exiting') return;
      const el = nodeRefs.current.get(entry.key);
      if (!el) return;
      const r = el.getBoundingClientRect();
      const record = {
        top: r.top,
        offsetTop: r.top - containerRect.top,
        width: r.width,
      };
      nextRects.set(entry.key, record);

      if (reducedMotion || normalMs <= 0) return;

      if (entry.status === 'entering') {
        const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: normalMs,
          easing: easeOut,
        });
        animations.push(anim);
      } else {
        const old = prevRects.get(entry.key);
        if (old) {
          const dy = old.top - record.top;
          if (Math.abs(dy) > 0.5) {
            const anim = el.animate(
              [{ transform: `translateY(${dy}px)` }, { transform: 'translateY(0px)' }],
              { duration: normalMs, easing: easeOut }
            );
            animations.push(anim);
          }
        }
      }
    });

    rectsSnapshotRef.current = nextRects;

    if (hasExiting) {
      const delay = reducedMotion || normalMs <= 0 ? 0 : normalMs;
      const timer = window.setTimeout(() => {
        setEntries((curr) => curr.filter((e) => e.status !== 'exiting'));
      }, delay);
      return () => {
        window.clearTimeout(timer);
        animations.forEach((a) => a.cancel());
      };
    }

    if (entries.some((e) => e.status === 'entering')) {
      const delay = reducedMotion || normalMs <= 0 ? 0 : normalMs;
      const timer = window.setTimeout(() => {
        setEntries((curr) =>
          curr.map((e) => (e.status === 'entering' ? { ...e, status: 'stable' } : e))
        );
      }, delay);
      return () => {
        window.clearTimeout(timer);
        animations.forEach((a) => a.cancel());
      };
    }

    return () => {
      animations.forEach((a) => a.cancel());
    };
  }, [entries, reducedMotion]);

  return (
    <div ref={containerRef} className={`m-motion-list ${className}`.trim()}>
      {entries.map((entry) => (
        <div
          key={entry.key}
          ref={(el) => {
            if (el) nodeRefs.current.set(entry.key, el);
            else nodeRefs.current.delete(entry.key);
          }}
          className="m-motion-item"
          data-exiting={entry.status === 'exiting' ? 'true' : undefined}
        >
          {renderItem(entry.item)}
        </div>
      ))}
    </div>
  );
}

MotionList.propTypes = {
  items: P.array.isRequired,
  getKey: P.func.isRequired,
  renderItem: P.func.isRequired,
  className: P.string,
};

