import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { getMotionSpecs, readCurrentScale } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

const MIN_TAP_HOLD_MS = 85;

/**
 * MobilePressCard:
 * - Static 1:1 outer hit-target with zero hover lift/float.
 * - Unified inner shell presses to `--m-press-scale` (0.97) in 120ms (`--m-duration-fast`)
 *   with `--m-ease-out`, interruptible mid-flight via Web Animations API, plus immediate
 *   `--m-surface-pressed` tactile surface feedback matching `ButtonBase` / `MobileButton`.
 */
export const MobilePressCard = forwardRef(function MobilePressCard(
  {
    disabled = false,
    className = '',
    shellClassName = '',
    children,
    onPress,
    onClick,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onKeyDown,
    onKeyUp,
    onBlur,
    ...rest
  },
  forwardedRef
) {
  const cardRef = useRef(null);
  const shellRef = useRef(null);
  const pressAnimRef = useRef(null);
  const releaseTimerRef = useRef(null);
  const openTimerRef = useRef(null);
  const pointerDownActiveRef = useRef(false);
  const keyPressedRef = useRef(false);
  const isVisualPressedRef = useRef(false);
  const pressStartRef = useRef(0);
  const reducedMotion = useReducedMotion();

  useImperativeHandle(forwardedRef, () => cardRef.current);

  useEffect(() => {
    return () => {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
      if (openTimerRef.current !== null) {
        window.clearTimeout(openTimerRef.current);
      }
      pressAnimRef.current?.cancel();
    };
  }, []);

  const setPressedState = (pressed) => {
    const card = cardRef.current;
    if (!card) return;
    if (pressed) {
      card.setAttribute('data-pressed', 'true');
    } else {
      card.removeAttribute('data-pressed');
    }
  };

  const animateShell = (toScale) => {
    const shell = shellRef.current;
    if (!shell || reducedMotion) {
      if (shell) shell.style.transform = '';
      return;
    }
    const { fastMs, easeOut } = getMotionSpecs(shell);
    if (fastMs <= 0) {
      shell.style.transform = '';
      return;
    }
    const fromScale = readCurrentScale(shell);
    pressAnimRef.current?.cancel();
    if (Math.abs(fromScale - toScale) < 0.001) {
      shell.style.transform = toScale === 1 ? '' : `scale(${toScale})`;
      return;
    }
    const anim = shell.animate(
      [{ transform: `scale(${fromScale})` }, { transform: `scale(${toScale})` }],
      { duration: fastMs, easing: easeOut, fill: 'forwards' }
    );
    pressAnimRef.current = anim;
    anim.onfinish = () => {
      if (pressAnimRef.current === anim) {
        shell.style.transform = toScale === 1 ? '' : `scale(${toScale})`;
        anim.cancel();
        pressAnimRef.current = null;
      }
    };
  };

  const startPressVisual = () => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    isVisualPressedRef.current = true;
    pressStartRef.current = performance.now();
    setPressedState(true);
    const shell = shellRef.current;
    if (!shell || reducedMotion) return;
    const { pressScale } = getMotionSpecs(shell);
    animateShell(pressScale);
  };

  const finishReleaseVisual = () => {
    releaseTimerRef.current = null;
    isVisualPressedRef.current = false;
    setPressedState(false);
    animateShell(1);
  };

  const cancelPressImmediate = () => {
    if (releaseTimerRef.current !== null) {
      window.clearTimeout(releaseTimerRef.current);
      releaseTimerRef.current = null;
    }
    pointerDownActiveRef.current = false;
    keyPressedRef.current = false;
    pressStartRef.current = 0;
    if (!isVisualPressedRef.current && !cardRef.current?.hasAttribute('data-pressed')) {
      return;
    }
    finishReleaseVisual();
  };

  const scheduleReleaseVisual = () => {
    if (!isVisualPressedRef.current) return;
    const elapsed =
      pressStartRef.current > 0 ? performance.now() - pressStartRef.current : MIN_TAP_HOLD_MS;
    const remaining = reducedMotion ? 0 : Math.max(0, MIN_TAP_HOLD_MS - elapsed);
    if (remaining <= 0) {
      finishReleaseVisual();
    } else {
      if (releaseTimerRef.current !== null) {
        window.clearTimeout(releaseTimerRef.current);
      }
      releaseTimerRef.current = window.setTimeout(finishReleaseVisual, remaining);
    }
  };

  const triggerPressAction = (event, delayMs) => {
    if (!onPress) return;
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (delayMs <= 0) {
      onPress(event);
    } else {
      openTimerRef.current = window.setTimeout(() => {
        openTimerRef.current = null;
        onPress(event);
      }, delayMs);
    }
  };

  const handlePointerDown = (event) => {
    onPointerDown?.(event);
    if (disabled || event.button > 0) return;
    pointerDownActiveRef.current = true;
    startPressVisual();
  };

  const handlePointerUp = (event) => {
    onPointerUp?.(event);
    if (!pointerDownActiveRef.current) return;
    pointerDownActiveRef.current = false;
    scheduleReleaseVisual();
  };

  const handlePointerLeave = (event) => {
    onPointerLeave?.(event);
    if (!pointerDownActiveRef.current) return;
    cancelPressImmediate();
  };

  const handlePointerCancel = (event) => {
    onPointerCancel?.(event);
    if (!pointerDownActiveRef.current) return;
    cancelPressImmediate();
  };

  const handleClick = (event) => {
    onClick?.(event);
    if (disabled || event.defaultPrevented) return;
    if (pressStartRef.current > 0) {
      const elapsed = performance.now() - pressStartRef.current;
      pressStartRef.current = 0;
      const delay = reducedMotion ? 0 : Math.max(0, MIN_TAP_HOLD_MS - elapsed);
      triggerPressAction(event, delay);
    } else if (!reducedMotion) {
      startPressVisual();
      pressStartRef.current = 0;
      releaseTimerRef.current = window.setTimeout(finishReleaseVisual, MIN_TAP_HOLD_MS);
      triggerPressAction(event, MIN_TAP_HOLD_MS);
    } else {
      triggerPressAction(event, 0);
    }
  };

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (disabled || event.defaultPrevented) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      if (event.repeat) return;
      if (reducedMotion) {
        triggerPressAction(event, 0);
      } else {
        startPressVisual();
        pressStartRef.current = 0;
        releaseTimerRef.current = window.setTimeout(finishReleaseVisual, MIN_TAP_HOLD_MS);
        triggerPressAction(event, MIN_TAP_HOLD_MS);
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      if (event.repeat) return;
      keyPressedRef.current = true;
      startPressVisual();
    }
  };

  const handleKeyUp = (event) => {
    onKeyUp?.(event);
    if (disabled || event.defaultPrevented) return;
    if (event.key === ' ' && keyPressedRef.current) {
      event.preventDefault();
      keyPressedRef.current = false;
      const elapsed =
        pressStartRef.current > 0 ? performance.now() - pressStartRef.current : MIN_TAP_HOLD_MS;
      pressStartRef.current = 0;
      const remaining = reducedMotion ? 0 : Math.max(0, MIN_TAP_HOLD_MS - elapsed);
      if (remaining <= 0) {
        finishReleaseVisual();
      } else {
        releaseTimerRef.current = window.setTimeout(finishReleaseVisual, remaining);
      }
      triggerPressAction(event, remaining);
    }
  };

  const handleBlur = (event) => {
    onBlur?.(event);
    if (pointerDownActiveRef.current || keyPressedRef.current) {
      cancelPressImmediate();
    }
  };

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled ? 'true' : undefined}
      className={className}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerCancel}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={handleBlur}
      {...rest}
    >
      <div ref={shellRef} className={shellClassName}>
        {children}
      </div>
    </div>
  );
});

MobilePressCard.propTypes = {
  disabled: P.bool,
  className: P.string,
  shellClassName: P.string,
  children: P.node,
  onPress: P.func,
  onClick: P.func,
  onPointerDown: P.func,
  onPointerUp: P.func,
  onPointerLeave: P.func,
  onPointerCancel: P.func,
  onKeyDown: P.func,
  onKeyUp: P.func,
  onBlur: P.func,
};
