import { useId } from 'react';
import { P } from '../propTypes';

/**
 * Builds a true 1:1 circular-bulb curved teardrop along circle (cx, cy, r):
 * - Pointed tail at `startDeg` (w = 0) curving clockwise along the ring.
 * - Swells smoothly with C1 tangency to full droplet radius `bulbRadius` at `bulbCenterDeg`
 *   (just behind the 180° rectangular core head) and wraps the leading head in a true 1:1 semicircle.
 */
function buildCurvedTeardropPath({
  cx = 12,
  cy = 12,
  r = 9.5,
  startDeg,
  bulbCenterDeg,
  bulbRadius,
  power,
  steps,
}) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const span = bulbCenterDeg - startDeg;
  const outerPts = [];
  const innerPts = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const rad = toRad(startDeg + span * t);
    const w = bulbRadius * Math.sin((Math.PI / 2) * Math.pow(t, power));
    outerPts.push([
      +(cx + (r + w) * Math.cos(rad)).toFixed(2),
      +(cy + (r + w) * Math.sin(rad)).toFixed(2),
    ]);
    innerPts.push([
      +(cx + (r - w) * Math.cos(rad)).toFixed(2),
      +(cy + (r - w) * Math.sin(rad)).toFixed(2),
    ]);
  }

  let d = `M ${outerPts[0][0]} ${outerPts[0][1]}`;
  for (let i = 1; i < outerPts.length; i++) {
    d += ` L ${outerPts[i][0]} ${outerPts[i][1]}`;
  }
  const [ixEnd, iyEnd] = innerPts[innerPts.length - 1];
  const rr = bulbRadius.toFixed(2);
  d += ` A ${rr} ${rr} 0 0 1 ${ixEnd} ${iyEnd}`;
  for (let i = innerPts.length - 2; i >= 1; i--) {
    d += ` L ${innerPts[i][0]} ${innerPts[i][1]}`;
  }
  d += ' Z';
  return d;
}

const OUTER_TEARDROP_PATH = buildCurvedTeardropPath({
  startDeg: 24,
  bulbCenterDeg: 175.5,
  bulbRadius: 2.55,
  power: 1.65,
  steps: 24,
});

const INNER_TEARDROP_PATH = buildCurvedTeardropPath({
  startDeg: 66,
  bulbCenterDeg: 176.5,
  bulbRadius: 1.75,
  power: 1.55,
  steps: 18,
});

/**
 * ProcessingNode:
 * - Completed: static brand-colored circle + checkmark.
 * - In-progress: continuous 270° clockwise arc (1600ms linear cycle):
 *   1. Seamless back-half fade (12 o'clock -> 3 o'clock -> 6 o'clock): solid-core brand stroke (zero outer glow)
 *      smoothly fades in from 0% at the 12 o'clock tail tip -> 43% at 3 o'clock -> 100% brand at 6 o'clock.
 *   2. Deepened inner head + outer teardrop diffusing glow (6 o'clock -> 9 o'clock head):
 *      the crisp rectangular inner stroke deepens into rich `--m-proc-head-core`, enveloped externally
 *      by a dual-layer curved teardrop diffusion (`--m-proc-glow`).
 */
export function ProcessingNode({ completed = false, size = 22, className = '' }) {
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const tailMaskId = `m-proc-tmask-${rawId}`;
  const maskQ1Id = `m-proc-mq1-${rawId}`;
  const maskQ2Id = `m-proc-mq2-${rawId}`;
  const outerBlurId = `m-proc-oblur-${rawId}`;
  const innerBlurId = `m-proc-iblur-${rawId}`;
  const outerDropGradId = `m-proc-odrop-${rawId}`;
  const innerDropGradId = `m-proc-idrop-${rawId}`;
  const coreBodyGradId = `m-proc-core-${rawId}`;

  if (completed) {
    return (
      <span
        className={`m-proc-node ${className}`.trim()}
        style={{ width: size, height: size }}
        title="已完成"
      >
        <svg viewBox="0 0 24 24" width={size} height={size} fill="none">
          <circle
            cx="12"
            cy="12"
            r="9.5"
            fill="var(--brand-subtle)"
            stroke="var(--ds-background-brand)"
            strokeWidth="2"
          />
          <path
            d="M8.2 12.3L10.8 14.9L16 9.5"
            stroke="var(--ds-background-brand)"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={`m-proc-node ${className}`.trim()}
      style={{ width: size, height: size }}
      title="进行中"
    >
      <svg viewBox="0 0 24 24" width={size} height={size} fill="none" style={{ overflow: 'visible' }}>
        <defs>
          {/* Unclipped userSpaceOnUse Gaussian filters for smooth teardrop light diffusion */}
          <filter id={outerBlurId} filterUnits="userSpaceOnUse" x="-6" y="-6" width="36" height="36">
            <feGaussianBlur stdDeviation="1.12" />
          </filter>
          <filter id={innerBlurId} filterUnits="userSpaceOnUse" x="-6" y="-6" width="36" height="36">
            <feGaussianBlur stdDeviation="0.5" />
          </filter>

          {/* Opaque luminance-mask quadrants (0.2px equal-value overlap = zero anti-aliasing seam at any angle)
              fading the back half smoothly from 0% at the 12 o'clock tail -> 43% at 3 o'clock -> 100% at 6 o'clock */}
          <linearGradient id={maskQ1Id} gradientUnits="userSpaceOnUse" x1="12" y1="2.5" x2="21.5" y2="12">
            <stop offset="0%" stopColor="#000000" />
            <stop offset="45%" stopColor="#2b2b2b" />
            <stop offset="100%" stopColor="#6e6e6e" />
          </linearGradient>
          <linearGradient id={maskQ2Id} gradientUnits="userSpaceOnUse" x1="21.5" y1="12" x2="12" y2="21.5">
            <stop offset="0%" stopColor="#6e6e6e" />
            <stop offset="55%" stopColor="#b8b8b8" />
            <stop offset="100%" stopColor="#ffffff" />
          </linearGradient>
          <mask id={tailMaskId} maskUnits="userSpaceOnUse" x="-4" y="-4" width="32" height="32">
            <path d="M 12 12 L 12 -2 L 26 -2 L 26 12.2 L 12 12.2 Z" fill={`url(#${maskQ1Id})`} />
            <path d="M 11.8 12 L 26 12 L 26 26 L 11.8 26 Z" fill={`url(#${maskQ2Id})`} />
            <path d="M -2 11.5 L 12.1 11.5 L 12.1 26 L -2 26 Z" fill="#ffffff" />
          </mask>

          {/* Outer soft teardrop diffusion: 0 at pointed teardrop tail -> luminous bloom around leading head */}
          <linearGradient id={outerDropGradId} gradientUnits="userSpaceOnUse" x1="20.5" y1="16.2" x2="2.0" y2="11.2">
            <stop offset="0%" stopColor="var(--m-proc-glow)" stopOpacity="0" />
            <stop offset="35%" stopColor="var(--m-proc-glow)" stopOpacity="0.16" />
            <stop offset="70%" stopColor="var(--m-proc-glow)" stopOpacity="0.46" />
            <stop offset="100%" stopColor="var(--m-proc-glow)" stopOpacity="0.74" />
          </linearGradient>

          {/* Inner intense teardrop corona cradling the deepened inner core head */}
          <linearGradient id={innerDropGradId} gradientUnits="userSpaceOnUse" x1="15.6" y1="20.8" x2="2.3" y2="11.5">
            <stop offset="0%" stopColor="var(--m-proc-glow)" stopOpacity="0" />
            <stop offset="40%" stopColor="var(--m-proc-glow)" stopOpacity="0.32" />
            <stop offset="100%" stopColor="var(--m-proc-glow)" stopOpacity="0.86" />
          </linearGradient>

          {/* Inner stroke core: standard brand across body -> deepens into rich `--m-proc-head-core` at leading head */}
          <linearGradient id={coreBodyGradId} gradientUnits="userSpaceOnUse" x1="15.0" y1="21.0" x2="2.5" y2="12">
            <stop offset="0%" stopColor="var(--ds-background-brand)" />
            <stop offset="32%" stopColor="var(--ds-background-brand)" />
            <stop offset="78%" stopColor="var(--m-proc-head-core)" />
            <stop offset="100%" stopColor="var(--m-proc-head-core)" />
          </linearGradient>
        </defs>

        {/* Static neutral ring */}
        <circle
          cx="12"
          cy="12"
          r="9.5"
          stroke="var(--ds-border)"
          strokeWidth="2"
        />

        {/* Rotating continuous 270° arc: fading tail -> deepened theme-color core inside outer teardrop glow */}
        <g className="m-proc-node-rotor">
          <path
            d={OUTER_TEARDROP_PATH}
            fill={`url(#${outerDropGradId})`}
            filter={`url(#${outerBlurId})`}
          />
          <path
            d={INNER_TEARDROP_PATH}
            fill={`url(#${innerDropGradId})`}
            filter={`url(#${innerBlurId})`}
          />
          <path
            d="M 12 2.5 A 9.5 9.5 0 1 1 2.5 12"
            stroke={`url(#${coreBodyGradId})`}
            strokeWidth="2"
            strokeLinecap="butt"
            mask={`url(#${tailMaskId})`}
          />
        </g>
      </svg>
    </span>
  );
}

ProcessingNode.propTypes = {
  completed: P.bool,
  size: P.number,
  className: P.string,
};
