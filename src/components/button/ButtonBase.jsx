import { useRef, forwardRef, useImperativeHandle } from 'react';
import { getMotionSpecs, readCurrentScale } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

/**
 * ButtonBase: Separates interactive background/border surface from button content.
 * Pressing scales ONLY `.m-btn-surface` to 0.97 in 120ms; text, icon, and hit area stay 1:1.
 */
export const ButtonBase = forwardRef(function ButtonBase(
  {
    type = 'button',
    disabled = false,
    className = '',
    children,
    onPointerDown,
    onPointerUp,
    onPointerLeave,
    onPointerCancel,
    onBlur,
    ...rest
  },
  forwardedRef
) {
  const buttonRef = useRef(null);
  const surfaceRef = useRef(null);
  const pressAnimRef = useRef(null);
  const isPressedRef = useRef(false);
  const reducedMotion = useReducedMotion();

  useImperativeHandle(forwardedRef, () => buttonRef.current);

  const animateSurface = (toScale) => {
    const surface = surfaceRef.current;
    if (!surface || reducedMotion) {
      if (surface) surface.style.transform = '';
      return;
    }
    const { fastMs, easeOut } = getMotionSpecs(surface);
    if (fastMs <= 0) {
      surface.style.transform = '';
      return;
    }
    const fromScale = readCurrentScale(surface);
    pressAnimRef.current?.cancel();
    if (Math.abs(fromScale - toScale) < 0.001) {
      surface.style.transform = toScale === 1 ? '' : `scale(${toScale})`;
      return;
    }
    const anim = surface.animate(
      [{ transform: `scale(${fromScale})` }, { transform: `scale(${toScale})` }],
      { duration: fastMs, easing: easeOut, fill: 'forwards' }
    );
    pressAnimRef.current = anim;
    anim.onfinish = () => {
      if (pressAnimRef.current === anim) {
        surface.style.transform = toScale === 1 ? '' : `scale(${toScale})`;
        anim.cancel();
        pressAnimRef.current = null;
      }
    };
  };

  const handlePointerDown = (event) => {
    onPointerDown?.(event);
    if (disabled || reducedMotion || event.button > 0) return;
    const surface = surfaceRef.current;
    if (!surface) return;
    isPressedRef.current = true;
    const { pressScale } = getMotionSpecs(surface);
    animateSurface(pressScale);
  };

  const releasePress = () => {
    if (!isPressedRef.current) return;
    isPressedRef.current = false;
    animateSurface(1);
  };

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      className={`m-btn-base ${className}`.trim()}
      onPointerDown={handlePointerDown}
      onPointerUp={(e) => {
        onPointerUp?.(e);
        releasePress();
      }}
      onPointerLeave={(e) => {
        onPointerLeave?.(e);
        releasePress();
      }}
      onPointerCancel={(e) => {
        onPointerCancel?.(e);
        releasePress();
      }}
      onBlur={(e) => {
        onBlur?.(e);
        releasePress();
      }}
      {...rest}
    >
      <span ref={surfaceRef} className="m-btn-surface" aria-hidden="true" />
      {children}
    </button>
  );
});

ButtonBase.propTypes = {
  type: P.string,
  disabled: P.bool,
  className: P.string,
  children: P.node,
  onPointerDown: P.func,
  onPointerUp: P.func,
  onPointerLeave: P.func,
  onPointerCancel: P.func,
  onBlur: P.func,
};

