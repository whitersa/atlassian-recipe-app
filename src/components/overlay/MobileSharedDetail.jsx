import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, X } from 'lucide-react';
import { ButtonBase } from '../button/ButtonBase';
import { getMotionSpecs } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

/**
 * MobileSharedDetail:
 * - Two-stage 320ms + 320ms shared-identity expansion (`servision-purchase` Detail Motion philosophy).
 * - Stage 1 (0..320ms): Source card hides in place (`visibility: hidden`); `.m-shared-surface` morphs from
 *   card bounds to dialog bounds while `.m-shared-identity` translates 1:1 with ZERO text scaling.
 * - Stage 2 (320..640ms): Header, dividers, body details, and footer fade in (`0 -> 1`) so border lines
 *   never sweep across moving text.
 * - Closing reverses cleanly (dividers/details fade out first, then identity & surface glide back to card)
 *   and supports mid-flight interruption at any frame.
 */
export function MobileSharedDetail({
  icon,
  title,
  subtitle,
  badge = null,
  dialogTitle = '条目详情',
  open,
  onOpenChange,
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

  const entryRef = useRef(null);
  const sourceIdentityRef = useRef(null);
  const dialogRef = useRef(null);
  const surfaceRef = useRef(null);
  const targetIdentityRef = useRef(null);
  const headerRef = useRef(null);
  const bodyRef = useRef(null);
  const footerRef = useRef(null);
  const animsRef = useRef([]);

  useEffect(() => {
    if (!mounted) return undefined;
    if (open) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const raf = window.requestAnimationFrame(() => {
        setBackdropOpen(true);
        dialogRef.current?.focus({ preventScroll: true });
      });

      const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          onOpenChange?.(false);
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
  }, [open, mounted, onOpenChange]);

  useLayoutEffect(() => {
    if (!mounted) return undefined;

    const entryEl = entryRef.current;
    const sourceIdEl = sourceIdentityRef.current;
    const dialogEl = dialogRef.current;
    const surfaceEl = surfaceRef.current;
    const targetIdEl = targetIdentityRef.current;
    const revealEls = [headerRef.current, bodyRef.current, footerRef.current].filter(Boolean);

    if (!entryEl || !sourceIdEl || !dialogEl || !surfaceEl || !targetIdEl) return undefined;

    const { normalMs, easeOut, easePanel } = getMotionSpecs(dialogEl);

    if (open) {
      animsRef.current.forEach((a) => a.cancel());
      animsRef.current = [];
      revealEls.forEach((el) => {
        el.inert = false;
      });

      if (reducedMotion || normalMs <= 0) {
        surfaceEl.style.transform = '';
        targetIdEl.style.transform = '';
        revealEls.forEach((el) => {
          el.style.opacity = '1';
        });
        return undefined;
      }

      const entryRect = entryEl.getBoundingClientRect();
      const sourceIdRect = sourceIdEl.getBoundingClientRect();
      const dialogRect = dialogEl.getBoundingClientRect();
      const targetIdRect = targetIdEl.getBoundingClientRect();

      const sDx = entryRect.left - dialogRect.left;
      const sDy = entryRect.top - dialogRect.top;
      const sSx = Math.max(0.1, entryRect.width / dialogRect.width);
      const sSy = Math.max(0.1, entryRect.height / dialogRect.height);

      const iDx = sourceIdRect.left - targetIdRect.left;
      const iDy = sourceIdRect.top - targetIdRect.top;

      const surfaceAnim = surfaceEl.animate(
        [
          { transform: `translate(${sDx}px, ${sDy}px) scale(${sSx}, ${sSy})` },
          { transform: 'translate(0px, 0px) scale(1, 1)' },
        ],
        { duration: normalMs, easing: easePanel, fill: 'both' }
      );

      const idAnim = targetIdEl.animate(
        [
          { transform: `translate(${iDx}px, ${iDy}px)` },
          { transform: 'translate(0px, 0px)' },
        ],
        { duration: normalMs, easing: easePanel, fill: 'both' }
      );

      const revealAnims = revealEls.map((el) =>
        el.animate([{ opacity: 0 }, { opacity: 1 }], {
          delay: normalMs,
          duration: normalMs,
          easing: easeOut,
          fill: 'both',
        })
      );

      animsRef.current = [surfaceAnim, idAnim, ...revealAnims];
      return undefined;
    }

    // Closing path: Stage 1 fades out header/dividers/details first; Stage 2 glides identity & surface back
    revealEls.forEach((el) => {
      el.inert = true;
    });

    const liveRevealOpacity =
      revealEls.length > 0
        ? Number.parseFloat(window.getComputedStyle(revealEls[0]).opacity) || 0
        : 0;
    const liveSurfaceTransform = window.getComputedStyle(surfaceEl).transform;
    const liveIdTransform = window.getComputedStyle(targetIdEl).transform;

    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];

    // Freeze surface & identity at their live positions while Stage 1 fades out details
    surfaceEl.style.transform =
      liveSurfaceTransform === 'none' ? 'translate(0px, 0px) scale(1, 1)' : liveSurfaceTransform;
    targetIdEl.style.transform =
      liveIdTransform === 'none' ? 'translate(0px, 0px)' : liveIdTransform;

    const finishClose = () => {
      setMounted(false);
      entryEl.focus({ preventScroll: true });
    };

    if (reducedMotion || normalMs <= 0) {
      const raf = window.requestAnimationFrame(finishClose);
      return () => window.cancelAnimationFrame(raf);
    }

    let cancelled = false;

    const runReturnGlide = () => {
      if (cancelled) return;
      const fromSurface = surfaceEl.style.transform || 'translate(0px, 0px) scale(1, 1)';
      const fromId = targetIdEl.style.transform || 'translate(0px, 0px)';

      // Temporarily clear transform on targetIdEl to measure its natural slot coordinates accurately
      targetIdEl.style.transform = 'none';
      const entryRect = entryEl.getBoundingClientRect();
      const sourceIdRect = sourceIdEl.getBoundingClientRect();
      const dialogRect = dialogEl.getBoundingClientRect();
      const naturalTargetIdRect = targetIdEl.getBoundingClientRect();
      targetIdEl.style.transform = fromId;

      const sDx = entryRect.left - dialogRect.left;
      const sDy = entryRect.top - dialogRect.top;
      const sSx = Math.max(0.1, entryRect.width / dialogRect.width);
      const sSy = Math.max(0.1, entryRect.height / dialogRect.height);

      const iDx = sourceIdRect.left - naturalTargetIdRect.left;
      const iDy = sourceIdRect.top - naturalTargetIdRect.top;

      const surfaceBack = surfaceEl.animate(
        [
          { transform: fromSurface },
          { transform: `translate(${sDx}px, ${sDy}px) scale(${sSx}, ${sSy})` },
        ],
        { duration: normalMs, easing: easePanel, fill: 'forwards' }
      );

      const idBack = targetIdEl.animate(
        [
          { transform: fromId },
          { transform: `translate(${iDx}px, ${iDy}px)` },
        ],
        { duration: normalMs, easing: easePanel, fill: 'forwards' }
      );

      animsRef.current = [surfaceBack, idBack];
      surfaceBack.onfinish = () => {
        if (!cancelled) {
          finishClose();
        }
      };
    };

    const fadeOutMs = Math.round(normalMs * liveRevealOpacity);
    if (fadeOutMs <= 16) {
      revealEls.forEach((el) => {
        el.style.opacity = '0';
      });
      runReturnGlide();
    } else {
      const fadeAnims = revealEls.map((el) =>
        el.animate([{ opacity: liveRevealOpacity }, { opacity: 0 }], {
          duration: fadeOutMs,
          easing: easeOut,
          fill: 'forwards',
        })
      );
      animsRef.current = fadeAnims;
      fadeAnims[0].onfinish = runReturnGlide;
    }

    return () => {
      cancelled = true;
    };
  }, [open, mounted, reducedMotion]);

  const identityMarkup = (refObj) => (
    <div ref={refObj} className="m-shared-identity">
      <div className="m-shared-icon-box">{icon}</div>
      <div className="m-shared-titles">
        <strong>{title}</strong>
        {subtitle && <small>{subtitle}</small>}
      </div>
    </div>
  );

  return (
    <>
      <ButtonBase
        ref={entryRef}
        className="m-shared-entry"
        data-expanded={mounted ? 'true' : undefined}
        aria-expanded={open}
        onClick={() => onOpenChange?.(true)}
      >
        {identityMarkup(sourceIdentityRef)}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {badge}
          <ChevronRight size={17} strokeWidth={2.2} style={{ color: 'var(--ds-text-subtle)' }} />
        </div>
      </ButtonBase>

      {mounted &&
        createPortal(
          <div className="m-overlay-root" data-centered="true" role="presentation">
            <div
              className="m-overlay-backdrop"
              data-open={backdropOpen ? 'true' : undefined}
              onClick={() => onOpenChange?.(false)}
            />

            <div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-label={typeof title === 'string' ? title : '详情'}
              tabIndex={-1}
              className="m-shared-dialog"
              style={{ outline: 'none' }}
            >
              <div ref={surfaceRef} className="m-shared-surface" />

              <div className="m-shared-layout">
                <div ref={headerRef} className="m-dialog-header" data-detail-reveal="true">
                  <h3 className="m-dialog-title">{dialogTitle}</h3>
                  <button
                    type="button"
                    className="m-dialog-close"
                    aria-label="关闭详情"
                    onClick={() => onOpenChange?.(false)}
                  >
                    <X size={20} strokeWidth={2.2} />
                  </button>
                </div>

                <div className="m-shared-summary-slot">
                  {identityMarkup(targetIdentityRef)}
                </div>

                <div ref={bodyRef} className="m-dialog-body" data-detail-reveal="true">
                  {children}
                </div>

                {footer && (
                  <div ref={footerRef} className="m-dialog-footer" data-detail-reveal="true">
                    {footer}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

MobileSharedDetail.propTypes = {
  icon: P.node,
  title: P.node.isRequired,
  subtitle: P.node,
  badge: P.node,
  dialogTitle: P.node,
  open: P.bool.isRequired,
  onOpenChange: P.func.isRequired,
  footer: P.node,
  children: P.node,
};

