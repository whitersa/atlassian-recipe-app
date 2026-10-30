import { useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import { ButtonBase } from '../button/ButtonBase';
import { P } from '../propTypes';

/**
 * MobileStepper:
 * - `-` and `+` buttons use ButtonBase (0.97 surface press in 120ms).
 * - Permanent `::after` inset 1px focus border layer fades opacity (320ms) above step button surfaces.
 */
export function MobileStepper({
  id,
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  disabled = false,
  className = '',
}) {
  const inputRef = useRef(null);

  const numericValue = value === '' ? '' : Number(value);
  const atMin = numericValue !== '' && min !== undefined && numericValue <= min;
  const atMax = numericValue !== '' && max !== undefined && numericValue >= max;

  const stepBy = (direction) => {
    const base = numericValue === '' || Number.isNaN(numericValue) ? (min ?? 0) : numericValue;
    let next = Math.round((base + direction * step) * 1000) / 1000;
    if (min !== undefined) next = Math.max(min, next);
    if (max !== undefined) next = Math.min(max, next);
    onChange?.(next);
  };

  return (
    <div className={`m-stepper ${className}`.trim()} data-disabled={disabled ? 'true' : undefined}>
      <ButtonBase
        className="m-stepper-btn"
        title="减少"
        aria-label="减少"
        disabled={disabled || atMin}
        onClick={() => stepBy(-1)}
      >
        <Minus size={16} strokeWidth={2.2} />
      </ButtonBase>

      <input
        id={id}
        ref={inputRef}
        type="number"
        className="m-stepper-input"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === '') {
            onChange?.('');
            return;
          }
          const parsed = Number(raw);
          if (!Number.isNaN(parsed)) {
            onChange?.(parsed);
          }
        }}
      />

      <ButtonBase
        className="m-stepper-btn"
        title="增加"
        aria-label="增加"
        disabled={disabled || atMax}
        onClick={() => stepBy(1)}
      >
        <Plus size={16} strokeWidth={2.2} />
      </ButtonBase>
    </div>
  );
}

MobileStepper.propTypes = {
  id: P.string,
  value: P.oneOfType([P.number, P.string]).isRequired,
  onChange: P.func,
  min: P.number,
  max: P.number,
  step: P.number,
  disabled: P.bool,
  className: P.string,
};

