import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getMotionSpecs } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

/**
 * MobileSheet:
 * - Viewport-edge bottom drawer with strict 0px sharp corners (`border-radius: 0`).
 * - Outer `.m-sheet-mover` handles enter/exit slide (`320ms --m-ease-panel`).
 * - Inner `.m-sheet-stage` adapts height smoothly (`320ms --m-ease-panel`) when `stepKey` changes,
 *   while outgoing & incoming step views crossfade simultaneously (`inert` on outgoing step).
 */
export function MobileSheet({
  open,
  onClose,
  title,
  headerExtra = null,
  footer = null,
  stepKey = 'default',
  renderStep = null,
  triggerRef = null,
  children = null,
}) {
  const reducedMotion = useReducedMotion();

  const [prevOpen, setPrevOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visualOpen, setVisualOpen] = useState(false);

  const [prevStepKey, setPrevStepKey] = useState(stepKey);
  const [exitingStepKey, setExitingStepKey] = useState(null);
  const [stepTick, setStepTick] = useState(0);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setMounted(true);
    } else {
      setVisualOpen(false);
    }
  }

  if (stepKey !== prevStepKey) {
    if (open && mounted) {
      setExitingStepKey(prevStepKey);
      setStepTick((t) => t + 1);
    } else {
      setExitingStepKey(null);
    }
    setPrevStepKey(stepKey);
  }

  const panelRef = useRef(null);
  const stageRef = useRef(null);
  const activeViewRef = useRef(null);
  const exitingViewRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Open / close lifecycle & focus restoration
  useEffect(() => {
    if (!mounted) return undefined;

    if (open) {
      lastFocusedRef.current = document.activeElement;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      const raf = window.requestAnimationFrame(() => {
        setVisualOpen(true);
        panelRef.current?.focus({ preventScroll: true });
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

    const { normalMs } = getMotionSpecs(panelRef.current || document.documentElement);
    const delay = reducedMotion ? 0 : normalMs;
    const timer = window.setTimeout(() => {
      setMounted(false);
      setExitingStepKey(null);
      const returnTarget = triggerRef?.current || lastFocusedRef.current;
      returnTarget?.focus?.({ preventScroll: true });
    }, delay);

    return () => window.clearTimeout(timer);
  }, [open, mounted, reducedMotion, onClose, triggerRef]);

  // Multi-step height adaptation + simultaneous view crossfade (320ms)
  useLayoutEffect(() => {
    if (stepTick === 0 || !mounted || !renderStep) return undefined;

    const stageEl = stageRef.current;
    const enterEl = activeViewRef.current;
    const exitEl = exitingViewRef.current;
    if (!stageEl || !enterEl) return undefined;

    if (exitEl) {
      exitEl.inert = true;
    }
    enterEl.inert = false;

    const { normalMs, easeOut, easePanel } = getMotionSpecs(stageEl);
    if (reducedMotion || normalMs <= 0 || !exitEl) {
      stageEl.style.height = '';
      const raf = window.requestAnimationFrame(() => setExitingStepKey(null));
      return () => window.cancelAnimationFrame(raf);
    }

    const fromHeight = exitEl.getBoundingClientRect().height;
    const toHeight = enterEl.getBoundingClientRect().height;

    exitEl.style.position = 'absolute';
    exitEl.style.top = '0px';
    exitEl.style.left = '0px';
    exitEl.style.right = '0px';

    const stageAnim = stageEl.animate(
      [{ height: `${fromHeight}px` }, { height: `${toHeight}px` }],
      { duration: normalMs, easing: easePanel }
    );
    const enterAnim = enterEl.animate(
      [
        { opacity: 0, transform: 'translateY(6px)' },
        { opacity: 1, transform: 'translateY(0px)' },
      ],
      { duration: normalMs, easing: easeOut }
    );
    const exitAnim = exitEl.animate(
      [
        { opacity: 1, transform: 'translateY(0px)' },
        { opacity: 0, transform: 'translateY(-6px)' },
      ],
      { duration: normalMs, easing: easeOut, fill: 'forwards' }
    );

    let cancelled = false;
    stageAnim.onfinish = () => {
      if (!cancelled) {
        stageEl.style.height = '';
        setExitingStepKey(null);
      }
    };

    return () => {
      cancelled = true;
      stageAnim.cancel();
      enterAnim.cancel();
      exitAnim.cancel();
      stageEl.style.height = '';
    };
  }, [stepTick, mounted, reducedMotion, renderStep]);

  if (!mounted) return null;

  return createPortal(
    <div className="m-overlay-root" role="presentation">
      <div
        className="m-overlay-backdrop"
        data-open={visualOpen ? 'true' : undefined}
        onClick={() => onClose?.()}
      />

      <div className="m-sheet-mover" data-open={visualOpen ? 'true' : undefined}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : '抽屉面板'}
          tabIndex={-1}
          className="m-sheet-panel"
          style={{ outline: 'none' }}
        >
          <div className="m-dialog-header">
            <h3 className="m-dialog-title">{title}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              {headerExtra}
              <button
                type="button"
                className="m-dialog-close"
                aria-label="关闭抽屉"
                onClick={() => onClose?.()}
              >
                <X size={20} strokeWidth={2.2} />
              </button>
            </div>
          </div>

          <div ref={stageRef} className="m-sheet-stage">
            {renderStep ? (
              <div className="m-sheet-views">
                {exitingStepKey !== null && exitingStepKey !== stepKey && (
                  <div
                    key={`exit-${exitingStepKey}`}
                    ref={exitingViewRef}
                    className="m-sheet-view"
                    style={{ alignSelf: 'start' }}
                    aria-hidden="true"
                  >
                    <div className="m-dialog-body">{renderStep(exitingStepKey)}</div>
                  </div>
                )}
                <div
                  key={`active-${stepKey}`}
                  ref={activeViewRef}
                  className="m-sheet-view"
                  style={{ alignSelf: 'start' }}
                >
                  <div className="m-dialog-body">{renderStep(stepKey)}</div>
                </div>
              </div>
            ) : (
              <div className="m-dialog-body">{children}</div>
            )}
          </div>

          {footer && <div className="m-dialog-footer">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}

MobileSheet.propTypes = {
  open: P.bool.isRequired,
  onClose: P.func.isRequired,
  title: P.node,
  headerExtra: P.node,
  footer: P.node,
  stepKey: P.string,
  renderStep: P.func,
  triggerRef: P.object,
  children: P.node,
};

