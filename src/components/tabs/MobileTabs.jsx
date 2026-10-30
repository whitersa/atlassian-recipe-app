import { useState, useRef, useLayoutEffect } from 'react';
import { ButtonBase } from '../button/ButtonBase';
import { getMotionSpecs } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

/**
 * MobileTabs:
 * - Rounded-cap 70% indicator glides via interruptible FLIP transform (320ms).
 * - Outgoing & incoming panels crossfade simultaneously in a single 320ms window (no slide/scale of text).
 * - Exiting panel is immediately marked `inert` so rapid tapping never triggers leaving controls.
 */
export function MobileTabs({
  items,
  value,
  onChange,
  fullWidth = false,
  renderPanel,
  keepMounted = false,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const [prevValue, setPrevValue] = useState(value);
  const [exitingValue, setExitingValue] = useState(null);
  const [transitionTick, setTransitionTick] = useState(0);

  if (value !== prevValue) {
    setExitingValue(prevValue);
    setPrevValue(value);
    setTransitionTick((t) => t + 1);
  }

  const labelRefs = useRef(new Map());
  const indicatorRef = useRef(null);
  const prevIndicatorRectRef = useRef(null);
  const indicatorAnimRef = useRef(null);

  const activePanelRef = useRef(null);
  const exitingPanelRef = useRef(null);

  const handleSelect = (nextVal) => {
    if (nextVal === value) return;
    if (indicatorRef.current) {
      prevIndicatorRectRef.current = indicatorRef.current.getBoundingClientRect();
    }
    onChange?.(nextVal);
  };

  // FLIP glide for the 70% underline indicator
  useLayoutEffect(() => {
    const indicatorEl = indicatorRef.current;
    const fromRect = prevIndicatorRectRef.current;
    prevIndicatorRectRef.current = null;

    if (!indicatorEl || !fromRect) return undefined;
    const { normalMs, easeOut } = getMotionSpecs(indicatorEl);
    if (reducedMotion || normalMs <= 0) {
      indicatorAnimRef.current?.cancel();
      return undefined;
    }

    const toRect = indicatorEl.getBoundingClientRect();
    if (toRect.width <= 0) return undefined;

    const dx = fromRect.left + fromRect.width / 2 - (toRect.left + toRect.width / 2);
    const scaleX = fromRect.width / toRect.width;

    indicatorAnimRef.current?.cancel();
    const anim = indicatorEl.animate(
      [
        { transform: `translateX(${dx}px) scaleX(${scaleX})` },
        { transform: 'translateX(0px) scaleX(1)' },
      ],
      { duration: normalMs, easing: easeOut }
    );
    indicatorAnimRef.current = anim;
    return () => anim.cancel();
  }, [value, reducedMotion]);

  // Simultaneous 320ms panel crossfade + inert exit guard
  useLayoutEffect(() => {
    if (transitionTick === 0 || keepMounted || !renderPanel) return undefined;

    const enterEl = activePanelRef.current;
    const exitEl = exitingPanelRef.current;

    if (exitEl) {
      exitEl.inert = true;
    }
    if (enterEl) {
      enterEl.inert = false;
    }

    const { normalMs, easeOut } = getMotionSpecs(enterEl || document.documentElement);
    if (reducedMotion || normalMs <= 0) {
      const id = window.requestAnimationFrame(() => setExitingValue(null));
      return () => window.cancelAnimationFrame(id);
    }

    const enterAnim = enterEl?.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: normalMs,
      easing: easeOut,
    });
    const exitAnim = exitEl?.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: normalMs,
      easing: easeOut,
      fill: 'forwards',
    });

    let cancelled = false;
    const done = () => {
      if (!cancelled) {
        setExitingValue(null);
      }
    };

    if (exitAnim) {
      exitAnim.onfinish = done;
    } else if (enterAnim) {
      enterAnim.onfinish = done;
    } else {
      done();
    }

    return () => {
      cancelled = true;
      enterAnim?.cancel();
      exitAnim?.cancel();
    };
  }, [transitionTick, reducedMotion, keepMounted, renderPanel]);

  return (
    <div className={`m-tabs ${className}`.trim()}>
      <div className="m-tabs-list" role="tablist" data-full={fullWidth ? 'true' : undefined}>
        {items.map((item) => {
          const isActive = item.value === value;
          return (
            <ButtonBase
              key={item.value}
              role="tab"
              aria-selected={isActive}
              className="m-tabs-trigger"
              data-active={isActive ? 'true' : undefined}
              onClick={() => handleSelect(item.value)}
            >
              <span
                ref={(el) => {
                  if (el) labelRefs.current.set(item.value, el);
                  else labelRefs.current.delete(item.value);
                }}
                className="m-tabs-label"
              >
                {item.label}
                {isActive && <span ref={indicatorRef} className="m-tabs-indicator" />}
              </span>
            </ButtonBase>
          );
        })}
      </div>

      {renderPanel && (
        <div className="m-tabs-panels">
          {keepMounted ? (
            items.map((item) => (
              <div
                key={item.value}
                className="m-tabs-panel"
                style={{ display: item.value === value ? 'block' : 'none' }}
              >
                {renderPanel(item.value)}
              </div>
            ))
          ) : (
            <>
              {exitingValue !== null && exitingValue !== value && (
                <div
                  key={`exit-${exitingValue}`}
                  ref={exitingPanelRef}
                  className="m-tabs-panel"
                  aria-hidden="true"
                >
                  {renderPanel(exitingValue)}
                </div>
              )}
              <div key={`active-${value}`} ref={activePanelRef} className="m-tabs-panel">
                {renderPanel(value)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

MobileTabs.propTypes = {
  items: P.array.isRequired,
  value: P.string.isRequired,
  onChange: P.func,
  fullWidth: P.bool,
  renderPanel: P.func,
  keepMounted: P.bool,
  className: P.string,
};

