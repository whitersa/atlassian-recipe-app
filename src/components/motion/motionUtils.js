// Motion utilities: CSS token reader, damped harmonic spring keyframes, and 4-side clip-path normalizer

export const EASE_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)';
export const EASE_PANEL = 'cubic-bezier(0.32, 0.72, 0, 1)';

export function parseCssDurationMs(raw, fallbackMs) {
  if (!raw) return fallbackMs;
  const trimmed = raw.trim();
  if (trimmed.endsWith('ms')) {
    const val = Number.parseFloat(trimmed);
    return Number.isFinite(val) ? val : fallbackMs;
  }
  if (trimmed.endsWith('s')) {
    const val = Number.parseFloat(trimmed) * 1000;
    return Number.isFinite(val) ? val : fallbackMs;
  }
  const val = Number.parseFloat(trimmed);
  return Number.isFinite(val) ? val : fallbackMs;
}

export function getMotionSpecs(element) {
  const target = element || document.documentElement;
  const styles = window.getComputedStyle(target);
  return {
    fastMs: parseCssDurationMs(styles.getPropertyValue('--m-duration-fast'), 120),
    originMs: parseCssDurationMs(styles.getPropertyValue('--m-duration-origin'), 200),
    normalMs: parseCssDurationMs(styles.getPropertyValue('--m-duration-normal'), 320),
    pressScale: Number.parseFloat(styles.getPropertyValue('--m-press-scale')) || 0.97,
    easeOut: styles.getPropertyValue('--m-ease-out').trim() || EASE_OUT,
    easePanel: styles.getPropertyValue('--m-ease-panel').trim() || EASE_PANEL,
  };
}

/**
 * Generates WAAPI linear-sampled keyframes matching Motion's (visualDuration, bounce) spring curve.
 * Used exclusively on Toast notifications (displacement bounce: 0.12, surface scale bounce: 0.22).
 */
export function buildSpringValues({ from, to, visualDuration = 0.32, bounce = 0.12, steps = 34 }) {
  const zeta = Math.max(0.1, Math.min(0.99, 1 - bounce));
  const omega0 = (2 * Math.PI) / (visualDuration * 1.15);
  const omegaD = omega0 * Math.sqrt(1 - zeta * zeta);
  const totalSeconds = visualDuration * 1.4;
  const values = [];

  for (let i = 0; i <= steps; i++) {
    if (i === 0) {
      values.push(from);
      continue;
    }
    if (i === steps) {
      values.push(to);
      continue;
    }
    const t = (i / steps) * totalSeconds;
    const envelope = Math.exp(-zeta * omega0 * t);
    const oscillation =
      Math.cos(omegaD * t) + ((zeta * omega0) / omegaD) * Math.sin(omegaD * t);
    values.push(to - (to - from) * envelope * oscillation);
  }

  return {
    values,
    durationMs: Math.round(totalSeconds * 1000),
  };
}

/**
 * Browsers collapse equal sides of `inset(0px 0px 0px 0px round 4px)` into `inset(0px round 4px)`.
 * Expands back to explicit 4-side `inset(top right bottom left round radius)` for smooth mid-flight WAAPI interpolation.
 */
export function normalizeInsetClipPath(rawClipPath, fallbackRadius = '4px') {
  if (!rawClipPath || !rawClipPath.startsWith('inset(')) {
    return `inset(0px 0px 0px 0px round ${fallbackRadius})`;
  }
  const inner = rawClipPath.slice(6, -1).trim();
  const [sidesPart, radiusPart] = inner.split(/\s+round\s+/);
  const parts = sidesPart.trim().split(/\s+/);
  const top = parts[0] ?? '0px';
  const right = parts[1] ?? top;
  const bottom = parts[2] ?? top;
  const left = parts[3] ?? right;
  const radius = (radiusPart || fallbackRadius).trim();
  return `inset(${top} ${right} ${bottom} ${left} round ${radius})`;
}

export function readCurrentScale(element) {
  if (!element) return 1;
  const transform = window.getComputedStyle(element).transform;
  if (!transform || transform === 'none') return 1;
  const match = transform.match(/matrix\(([^,]+),/);
  if (match) {
    const scale = Number.parseFloat(match[1]);
    return Number.isFinite(scale) ? scale : 1;
  }
  return 1;
}

