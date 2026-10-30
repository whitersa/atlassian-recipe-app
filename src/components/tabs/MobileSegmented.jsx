import { ButtonBase } from '../button/ButtonBase';
import { P } from '../propTypes';

/**
 * MobileSegmented: Flush segmented switcher with 1px dividers, tactile surface press (0.97 / 120ms),
 * and synchronized 320ms background/text color handoff.
 */
export function MobileSegmented({ items, value, onChange, className = '' }) {
  return (
    <div className={`m-segmented ${className}`.trim()} role="group">
      {items.map((item) => {
        const isActive = item.value === value;
        return (
          <ButtonBase
            key={item.value}
            className="m-segmented-item"
            data-active={isActive ? 'true' : undefined}
            aria-pressed={isActive}
            onClick={() => onChange?.(item.value)}
          >
            {item.label}
          </ButtonBase>
        );
      })}
    </div>
  );
}

MobileSegmented.propTypes = {
  items: P.array.isRequired,
  value: P.string.isRequired,
  onChange: P.func,
  className: P.string,
};

