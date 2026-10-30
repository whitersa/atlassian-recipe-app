import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getMotionSpecs } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

function readTriggerSurfaceColor(triggerEl) {
  if (!triggerEl) return null;
  const surface = triggerEl.querySelector?.('.m-btn-surface') || triggerEl;
  const bg = window.getComputedStyle(surface).backgroundColor;
  if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') return null;
  return bg;
}

/**
 * MobileOriginDialog:
 * - 200ms (`--m-duration-origin`) fast dialog originating from its trigger button.
 * - Independent `.m-origin-surface` expands from trigger rect & color in `0..104ms`;
 *   `.m-origin-content` fades in at final layout coordinates in `80..200ms` (zero text scaling).
 * - Interruptible mid-open: closing early reverses from live interpolated surface transform & opacity.
 */
export function MobileOriginDialog({
  open,
  onClose,
  triggerRef = null,
  initialFocusRef = null,
  title,
  footer = null,
  children,
}) {
  const reducedMotion = useReducedMotion();

  const [prevOpen, setPrevOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [backdropOpen, setBackdropOpen] = useState(false);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
    } else {
      setBackdropOpen(false);
    }
  }

  const dialogRef = useRef(null);
  const surfaceRef = useRef(null);
  const contentRef = useRef(null);
  const animsRef = useRef([]);
  const lastFocusedRef = useRef(null);

  useEffect(() => {
    if (!mounted) return undefined;

    if (open) {
      lastFocusedRef.current = document.activeElement;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const raf = window.requestAnimationFrame(() => {
        setBackdropOpen(true);
        const focusEl = initialFocusRef?.current || dialogRef.current;
        focusEl?.focus?.({ preventScroll: true });
      });

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onClose?.();
        }
      };
      document.addEventListener('keydown', handleKeyDown);

      return () => {
        window.cancelAnimationFrame(raf);
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = prevOverflow;
      };
    }
    return undefined;
  }, [open, mounted, onClose, initialFocusRef]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;

    const dialogEl = dialogRef.current;
    const surfaceEl = surfaceRef.current;
    const contentEl = contentRef.current;
    if (!dialogEl || !surfaceEl || !contentEl) return undefined;

    const { originMs, easeOut, easePanel } = getMotionSpecs(dialogEl);
    const triggerEl = triggerRef?.current;

    if (open) {
      animsRef.current.forEach((a) => a.cancel());
      animsRef.current = [];
      contentEl.inert = false;

      if (reducedMotion || originMs <= 0) {
        surfaceEl.style.transform = '';
        surfaceEl.style.opacity = '1';
        contentEl.style.opacity = '1';
        return undefined;
      }

      const dialogRect = dialogEl.getBoundingClientRect();
      const triggerRect = triggerEl?.getBoundingClientRect();
      const surfaceBg = window.getComputedStyle(surfaceEl).backgroundColor;
      const triggerBg = readTriggerSurfaceColor(triggerEl) || surfaceBg;

      if (triggerRect && dialogRect.width > 0 && dialogRect.height > 0) {
        const dx = triggerRect.left - dialogRect.left;
        const dy = triggerRect.top - dialogRect.top;
        const sx = Math.max(0.08, triggerRect.width / dialogRect.width);
        const sy = Math.max(0.08, triggerRect.height / dialogRect.height);

        const surfaceAnim = surfaceEl.animate(
          [
            {
              transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
              backgroundColor: triggerBg,
              opacity: 0.9,
            },
            {
              transform: 'translate(0px, 0px) scale(1, 1)',
              backgroundColor: surfaceBg,
              opacity: 1,
            },
          ],
          {
            duration: Math.round(originMs * 0.52),
            easing: easePanel,
            fill: 'both',
          }
        );

        const contentAnim = contentEl.animate(
          [{ opacity: 0 }, { opacity: 1 }],
          {
            delay: Math.round(originMs * 0.4),
            duration: Math.round(originMs * 0.6),
            easing: easeOut,
            fill: 'both',
          }
        );

        animsRef.current = [surfaceAnim, contentAnim];
      } else {
        const surfaceAnim = surfaceEl.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: originMs,
          easing: easeOut,
          fill: 'both',
        });
        const contentAnim = contentEl.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: originMs,
          easing: easeOut,
          fill: 'both',
        });
        animsRef.current = [surfaceAnim, contentAnim];
      }

      return undefined;
    }

    // Closing path: capture live mid-flight values BEFORE cancelling open animations
    contentEl.inert = true;
    const liveSurfaceTransform = window.getComputedStyle(surfaceEl).transform;
    const liveSurfaceOpacity = Number.parseFloat(window.getComputedStyle(surfaceEl).opacity) || 1;
    const liveSurfaceBg = window.getComputedStyle(surfaceEl).backgroundColor;
    const liveContentOpacity = Number.parseFloat(window.getComputedStyle(contentEl).opacity) || 0;

    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];

    const finishClose = () => {
      setMounted(false);
      const returnTarget = triggerRef?.current || lastFocusedRef.current;
      returnTarget?.focus?.({ preventScroll: true });
    };

    if (reducedMotion || originMs <= 0) {
      const raf = window.requestAnimationFrame(finishClose);
      return () => window.cancelAnimationFrame(raf);
    }

    const dialogRect = dialogEl.getBoundingClientRect();
    const triggerRect = triggerEl?.getBoundingClientRect();
    const triggerBg = readTriggerSurfaceColor(triggerEl) || liveSurfaceBg;

    const contentAnim = contentEl.animate(
      [{ opacity: liveContentOpacity }, { opacity: 0 }],
      {
        duration: Math.max(40, Math.round(originMs * 0.6)),
        easing: easeOut,
        fill: 'forwards',
      }
    );

    let surfaceAnim;
    if (triggerRect && dialogRect.width > 0 && dialogRect.height > 0) {
      const dx = triggerRect.left - dialogRect.left;
      const dy = triggerRect.top - dialogRect.top;
      const sx = Math.max(0.08, triggerRect.width / dialogRect.width);
      const sy = Math.max(0.08, triggerRect.height / dialogRect.height);

      surfaceAnim = surfaceEl.animate(
        [
          {
            transform: liveSurfaceTransform === 'none' ? 'translate(0px, 0px) scale(1, 1)' : liveSurfaceTransform,
            backgroundColor: liveSurfaceBg,
            opacity: liveSurfaceOpacity,
          },
          {
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            backgroundColor: triggerBg,
            opacity: 0,
          },
        ],
        {
          duration: originMs,
          easing: easePanel,
          fill: 'forwards',
        }
      );
    } else {
      surfaceAnim = surfaceEl.animate(
        [{ opacity: liveSurfaceOpacity }, { opacity: 0 }],
        { duration: originMs, easing: easeOut, fill: 'forwards' }
      );
    }

    animsRef.current = [surfaceAnim, contentAnim];
    let cancelled = false;
    surfaceAnim.onfinish = () => {
      if (!cancelled) {
        finishClose();
      }
    };

    return () => {
      cancelled = true;
    };
  }, [open, mounted, reducedMotion, triggerRef]);

  if (!mounted) return null;

  return createPortal(
    <div className="m-overlay-root" data-centered="true" role="presentation">
      <div
        className="m-overlay-backdrop"
        data-fast="true"
        data-open={backdropOpen ? 'true' : undefined}
        onClick={() => onClose?.()}
      />

      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : '快速弹窗'}
        tabIndex={-1}
        className="m-origin-dialog"
        style={{ outline: 'none' }}
      >
        <div ref={surfaceRef} className="m-origin-surface" />

        <div ref={contentRef} className="m-origin-content">
          <div className="m-dialog-header">
            <h3 className="m-dialog-title">{title}</h3>
            <button
              type="button"
              className="m-dialog-close"
              aria-label="关闭弹窗"
              onClick={() => onClose?.()}
            >
              <X size={20} strokeWidth={2.2} />
            </button>
          </div>

          <div className="m-dialog-body">{children}</div>

          {footer && <div className="m-dialog-footer">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}

MobileOriginDialog.propTypes = {
  open: P.bool.isRequired,
  onClose: P.func.isRequired,
  triggerRef: P.object,
  initialFocusRef: P.object,
  title: P.node,
  footer: P.node,
  children: P.node,
};

