import { useState, useRef, useLayoutEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { ButtonBase } from '../button/ButtonBase';
import { getMotionSpecs } from '../motion/motionUtils';
import { useReducedMotion } from '../motion/useReducedMotion';
import { P } from '../propTypes';

/**
 * MobileExpandCard:
 * - Simultaneous 320ms height + opacity transition.
 * - Reversing mid-animation reads current live height & opacity and seamlessly transitions without waiting.
 * - Chevron rotates 180deg in 120ms; collapsing body is marked `inert` immediately.
 */
export function MobileExpandCard({
  title,
  summary,
  badge,
  expanded,
  onToggle,
  children,
  className = '',
}) {
  const reducedMotion = useReducedMotion();
  const [prevExpanded, setPrevExpanded] = useState(expanded);
  const [visible, setVisible] = useState(expanded);
  const [hasInteracted, setHasInteracted] = useState(false);

  if (expanded !== prevExpanded) {
    setPrevExpanded(expanded);
    setHasInteracted(true);
    if (expanded) {
      setVisible(true);
    }
  }

  const shellRef = useRef(null);
  const bodyRef = useRef(null);
  const animsRef = useRef([]);
  const snapshotRef = useRef(null);

  const handleToggle = () => {
    const shell = shellRef.current;
    const body = bodyRef.current;
    if (shell && body && visible) {
      snapshotRef.current = {
        height: shell.getBoundingClientRect().height,
        opacity: Number.parseFloat(window.getComputedStyle(body).opacity) || 0,
      };
    } else {
      snapshotRef.current = { height: 0, opacity: 0 };
    }
    onToggle?.(!expanded);
  };

  useLayoutEffect(() => {
    if (!hasInteracted) return undefined;
    const shell = shellRef.current;
    const body = bodyRef.current;
    if (!shell || !body) return undefined;

    animsRef.current.forEach((a) => a.cancel());
    animsRef.current = [];

    body.inert = !expanded;

    const { normalMs, easeOut } = getMotionSpecs(shell);
    if (reducedMotion || normalMs <= 0) {
      shell.style.height = expanded ? 'auto' : '0px';
      body.style.opacity = expanded ? '1' : '0';
      if (!expanded) {
        const rafId = window.requestAnimationFrame(() => setVisible(false));
        return () => window.cancelAnimationFrame(rafId);
      }
      return undefined;
    }

    const snap = snapshotRef.current || {
      height: expanded ? 0 : shell.getBoundingClientRect().height,
      opacity: expanded ? 0 : Number.parseFloat(window.getComputedStyle(body).opacity) || 1,
    };
    snapshotRef.current = null;

    const targetHeight = expanded ? body.getBoundingClientRect().height : 0;
    const targetOpacity = expanded ? 1 : 0;

    const heightAnim = shell.animate(
      [{ height: `${snap.height}px` }, { height: `${targetHeight}px` }],
      { duration: normalMs, easing: easeOut, fill: 'forwards' }
    );
    const opacityAnim = body.animate(
      [{ opacity: snap.opacity }, { opacity: targetOpacity }],
      { duration: normalMs, easing: easeOut, fill: 'forwards' }
    );

    animsRef.current = [heightAnim, opacityAnim];

    let cancelled = false;
    heightAnim.onfinish = () => {
      if (cancelled) return;
      heightAnim.cancel();
      opacityAnim.cancel();
      animsRef.current = [];
      if (expanded) {
        shell.style.height = 'auto';
        body.style.opacity = '1';
      } else {
        setVisible(false);
      }
    };

    return () => {
      cancelled = true;
    };
  }, [expanded, hasInteracted, reducedMotion]);

  return (
    <div className={`m-expand-card ${className}`.trim()} data-expanded={expanded ? 'true' : undefined}>
      <ButtonBase
        className="m-expand-header"
        aria-expanded={expanded}
        onClick={handleToggle}
      >
        <div className="m-expand-title-group">
          <div className="m-expand-meta-row">
            <span className="m-expand-title">{title}</span>
            {badge}
          </div>
          {summary && <span className="m-expand-summary">{summary}</span>}
        </div>
        <ChevronDown size={18} strokeWidth={2} className="m-expand-chevron" />
      </ButtonBase>

      {visible && (
        <div ref={shellRef} className="m-expand-shell">
          <div ref={bodyRef} className="m-expand-body">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

MobileExpandCard.propTypes = {
  title: P.node.isRequired,
  summary: P.node,
  badge: P.node,
  expanded: P.bool.isRequired,
  onToggle: P.func,
  children: P.node,
  className: P.string,
};

