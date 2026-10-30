import { P } from '../propTypes';

/**
 * MobileSwitch:
 * - Capsule track (48x28 md, 36x20 sm) with 320ms ease-out thumb glide.
 * - `dualMode`: both ends represent active modes (track stays brand orange, thumb position indicates mode).
 */
export function MobileSwitch({
  checked,
  onChange,
  disabled = false,
  size = 'md',
  dualMode = false,
  title,
  className = '',
}) {
  return (
    <label
      className={`m-switch ${className}`.trim()}
      data-checked={checked ? 'true' : undefined}
      data-disabled={disabled ? 'true' : undefined}
      data-dual={dualMode ? 'true' : undefined}
      data-size={size}
      title={title}
    >
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        disabled={disabled}
        aria-label={title}
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span className="m-switch-track">
        <span className="m-switch-thumb" />
      </span>
    </label>
  );
}

MobileSwitch.propTypes = {
  checked: P.bool.isRequired,
  onChange: P.func,
  disabled: P.bool,
  size: P.string,
  dualMode: P.bool,
  title: P.string,
  className: P.string,
};

