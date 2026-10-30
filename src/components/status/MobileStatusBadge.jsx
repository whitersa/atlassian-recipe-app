import { CircleCheck, Clock, CircleAlert, Flame, FileText } from 'lucide-react';
import { P } from '../propTypes';

const TONE_ICONS = {
  success: CircleCheck,
  warning: Clock,
  danger: CircleAlert,
  brand: Flame,
  neutral: FileText,
};

/**
 * MobileStatusBadge:
 * - `appearance="outlined"` (default): White surface + 1px semantic border + deep semantic text + 16px icon.
 * - `appearance="soft"`: Light semantic background + 6px static dot + high-contrast text for compact cards.
 */
export function MobileStatusBadge({
  tone = 'neutral',
  appearance = 'outlined',
  icon = null,
  children,
  className = '',
}) {
  const DefaultIcon = TONE_ICONS[tone] || FileText;

  return (
    <span
      className={`m-status-badge ${className}`.trim()}
      data-tone={tone}
      data-appearance={appearance}
    >
      {appearance === 'soft' ? (
        <span className="m-status-dot" aria-hidden="true" />
      ) : (
        <span className="m-status-icon" aria-hidden="true">
          {icon || <DefaultIcon size={15} strokeWidth={2.1} />}
        </span>
      )}
      <span className="m-status-label">{children}</span>
    </span>
  );
}

MobileStatusBadge.propTypes = {
  tone: P.string,
  appearance: P.string,
  icon: P.node,
  children: P.node,
  className: P.string,
};

